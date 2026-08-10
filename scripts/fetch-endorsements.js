const axios = require('axios');
const fs = require('fs');
const path = require('path');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Fixed seed sources — always scraped every run
const SOURCE_URLS = [
  { url: 'https://www.dsausa.org/', chapterName: 'DSA National — Home', state: null },
  { url: 'https://www.dsausa.org/chapters/', chapterName: 'DSA National — Chapters Directory', state: null },
  { url: 'https://www.dsausa.org/chapter-map/', chapterName: 'DSA National — Chapter Map', state: null },
  { url: 'https://program.dsausa.org/', chapterName: 'DSA National — Program/Platform', state: null },
  { url: 'https://www.dsausa.org/news/', chapterName: 'DSA National — News', state: null },
];

// Cap how many discovered chapter links get scraped per run, to keep runtime reasonable
// and avoid hammering dozens of chapter sites in one Actions job
const MAX_DISCOVERED_PER_RUN = 15;

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractLinks(html) {
  const links = [];
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    const text = stripHtml(match[2]).trim();
    if (!href || !text) continue;
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    links.push({ href, text });
  }
  return links;
}

function normalizeUrl(href, baseUrl) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

async function fetchPage(url) {
  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DSAExposedBot/1.0)' },
      timeout: 15000
    });
    return response.data;
  } catch (err) {
    console.error(`Error fetching ${url}:`, err.message);
    return null;
  }
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function looksLikeChapterLink(href, linkText) {
  const h = href.toLowerCase();
  const t = (linkText || '').toLowerCase();
  if (h.includes('facebook.com') || h.includes('twitter.com') || h.includes('instagram.com') || h.includes('x.com') || h.includes('youtube.com') || h.includes('linkedin.com')) return false;
  if (h.startsWith('javascript:')) return false;
  // Likely a chapter link if it's an external dsa-related domain, or the link text mentions DSA/chapter
  return h.includes('dsa') || t.includes('dsa') || t.includes('chapter') || t.includes('local');
}

async function extractCandidatesWithClaude(pageText, sourceInfo, existingReps) {
  if (!pageText || pageText.trim().length < 50) return [];

  const existingNames = existingReps.map(r => r.name).join(', ') || 'none yet';

  const prompt = `You are a research assistant for DSAExposed.com, a watchdog site documenting Democratic Socialists of America (DSA) endorsed and affiliated candidates at every level of government — including local races like city council, township trustee, school board, and state legislature that national news rarely covers.

Below is the raw text content of a page from ${sourceInfo.chapterName}. Extract every candidate this page names as DSA-endorsed, DSA-backed, or a DSA member running for or holding office.

Do NOT include anyone already in this existing list: ${existingNames}

For each NEW candidate found, extract:
- name: full name
- district: specific district/seat if stated (e.g. "Ward 3 City Council", "District 12"), otherwise "N/A"
- state: state name if determinable from context, otherwise null
- office: the office they are running for or hold, as specifically as the page states it
- dsa_status: "DSA Endorsed" unless the page specifically says "DSA Member," in which case use that
- tags: array of 2-4 short tags based only on what this page states about their positions — if the page gives no positions, use ["DSA Endorsed"]
- record_summary: 1-2 sentence factual summary of what the page says about them, staying close to its own language

Only include a candidate if the page gives their full name and a specific office/race. Do not infer or embellish. If this page is not actually a candidate/endorsement listing (e.g. it's a homepage, news article, or about page with no named candidates), return [].

Page content:
${pageText.slice(0, 12000)}

Respond with ONLY a JSON array of candidate objects as described. No explanation, no markdown, just the JSON array.`;

  try {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    }, {
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    });

    const text = response.data.content[0].text.trim();
    const extracted = JSON.parse(text);
    if (!Array.isArray(extracted)) return [];

    return extracted
      .filter(r => r && r.name)
      .map(r => ({
        id: slugify(r.name),
        name: r.name,
        district: r.district || 'N/A',
        state: r.state || sourceInfo.state || null,
        office: r.office || null,
        party: 'Democrat',
        dsa_status: r.dsa_status === 'DSA Member' ? 'DSA Member' : 'DSA Endorsed',
        priority: 'standard',
        photo: '',
        profile_url: `/reps/profiles/${slugify(r.name)}.html`,
        tags: Array.isArray(r.tags) && r.tags.length > 0 ? r.tags : ['DSA Endorsed'],
        pillars: { words: false, funding: false, support: true, networks: false },
        statements: [],
        votes: [],
        funding: [],
        networks: ['DSA National'],
        record_summary: r.record_summary || null,
        sourceUrl: sourceInfo.url,
        sourceName: sourceInfo.chapterName,
        addedAt: new Date().toISOString()
      }));

  } catch (err) {
    console.error('Claude candidate extraction error:', err.message);
    return [];
  }
}

function loadJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

async function main() {
  console.log('DSA Exposed Local Endorsement Scraper starting...');

  const repsPath = path.join(process.cwd(), 'data', 'reps.json');
  const discoveredPath = path.join(process.cwd(), 'data', 'discovered-chapter-links.json');

  let existingReps = loadJson(repsPath, []);

  // Load previously discovered chapter links (self-expanding source list)
  let discovered = loadJson(discoveredPath, []);
  console.log(`Loaded ${discovered.length} previously discovered chapter links`);

  // Track which URLs we've already turned into scrape sources, so we don't
  // rescrape the same discovered chapter every single run forever
  const alreadyScraped = new Set(discovered.filter(d => d.scraped).map(d => d.href));

  const pendingDiscovered = discovered.filter(d => !alreadyScraped.has(d.href) && !d.scraped);
  const thisRunDiscoveredSources = pendingDiscovered.slice(0, MAX_DISCOVERED_PER_RUN).map(d => ({
    url: d.href,
    chapterName: d.text || 'DSA Local Chapter',
    state: null
  }));

  console.log(`Scraping ${thisRunDiscoveredSources.length} newly discovered chapter link(s) this run (${pendingDiscovered.length - thisRunDiscoveredSources.length} remaining for future runs)`);

  const allSources = [...SOURCE_URLS, ...thisRunDiscoveredSources];

  let allNewReps = [];
  let newlyFoundLinks = [];

  for (const source of allSources) {
    console.log(`Fetching ${source.chapterName}: ${source.url}`);
    const rawHtml = await fetchPage(source.url);

    if (!rawHtml) {
      console.log(`  Skipped — fetch failed or page unavailable`);
      continue;
    }

    // Mark this discovered link as scraped so we don't requeue it every run
    const matchIdx = discovered.findIndex(d => d.href === source.url);
    if (matchIdx > -1) discovered[matchIdx].scraped = true;

    // If this is a directory/chapters-style page, look for more chapter links to discover
    if (source.url.includes('/chapters/') || source.chapterName.toLowerCase().includes('chapter')) {
      const links = extractLinks(rawHtml)
        .map(l => ({ href: normalizeUrl(l.href, source.url), text: l.text }))
        .filter(l => l.href && looksLikeChapterLink(l.href, l.text));
      newlyFoundLinks = newlyFoundLinks.concat(links);
      console.log(`  Found ${links.length} potential chapter links on this page`);
    }

    const pageText = stripHtml(rawHtml);
    const newCandidates = await extractCandidatesWithClaude(pageText, source, [...existingReps, ...allNewReps]);
    console.log(`  Found ${newCandidates.length} new candidates`);
    allNewReps = allNewReps.concat(newCandidates);

    await new Promise(r => setTimeout(r, 1000)); // be polite between requests
  }

  // Merge newly found links into the discovered list, deduping by href
  const knownHrefs = new Set(discovered.map(d => d.href));
  newlyFoundLinks.forEach(l => {
    if (!knownHrefs.has(l.href)) {
      discovered.push({ href: l.href, text: l.text, scraped: false, foundAt: new Date().toISOString() });
      knownHrefs.add(l.href);
    }
  });

  // Save reps
  const existingIds = new Set(existingReps.map(r => r.id));
  const dedupedNewReps = allNewReps.filter(r => !existingIds.has(r.id));
  const mergedReps = [...existingReps, ...dedupedNewReps];

  fs.writeFileSync(repsPath, JSON.stringify(mergedReps, null, 2));
  console.log(`reps.json updated with ${mergedReps.length} total entries (${dedupedNewReps.length} new from DSA sources)`);

  // Save discovered links (self-expanding source list for next run)
  fs.writeFileSync(discoveredPath, JSON.stringify(discovered, null, 2));
  console.log(`discovered-chapter-links.json updated: ${discovered.length} total known links, ${discovered.filter(d => d.scraped).length} scraped so far`);
}

main().catch(err => {
  console.error('Endorsement scraper error:', err);
  process.exit(1);
});
