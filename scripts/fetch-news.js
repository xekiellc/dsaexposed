const axios = require('axios');
const fs = require('fs');
const path = require('path');

const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Search queries targeting DSA-related news
const QUERIES = [
  'Democratic Socialists of America DSA',
  'AOC Alexandria Ocasio-Cortez socialist',
  'Rashida Tlaib Hamas terrorism',
  'Ilhan Omar CAIR radical',
  'DSA endorsed candidate primary',
  'BDS movement Congress',
  'socialist candidate elected 2026',
  'CAIR Hamas financing',
  'Red Green Axis Marxist Islamist',
  'Squad anti-America communist',
  'DSA chapter protest radical left',
  'Working Families Party DSA endorsed',
  'Justice Democrats socialist primary',
  'dark money progressive PAC radical',
  'Marxist socialist America infiltration'
];

// Keywords that must appear for an article to be relevant
const RELEVANCE_KEYWORDS = [
  'dsa', 'democratic socialist', 'socialist', 'marxist', 'communist',
  'aoc', 'ocasio-cortez', 'tlaib', 'omar', 'squad',
  'cair', 'bds', 'hamas', 'hezbollah', 'terrorism',
  'radical left', 'far left', 'progressive', 'antifa',
  'defund', 'open borders', 'abolish ice', 'green new deal',
  'justice democrats', 'working families party', 'sunrise movement'
];

async function fetchArticles() {
  const articles = [];
  const seen = new Set();

  for (const query of QUERIES) {
    try {
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: query,
          language: 'en',
          sortBy: 'publishedAt',
          pageSize: 10,
          from: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        headers: {
          'X-Api-Key': NEWSAPI_KEY
        }
      });

      for (const article of response.data.articles || []) {
        if (!article.url || seen.has(article.url)) continue;
        if (!article.title || !article.description) continue;
        if (article.source?.name === '[Removed]') continue;

        // Basic relevance check before sending to Claude
        const text = (article.title + ' ' + article.description).toLowerCase();
        const isRelevant = RELEVANCE_KEYWORDS.some(kw => text.includes(kw));
        if (!isRelevant) continue;

        seen.add(article.url);
        articles.push({
          title: article.title,
          description: article.description,
          url: article.url,
          source: article.source?.name || 'Unknown',
          publishedAt: article.publishedAt,
          urlToImage: article.urlToImage || null
        });
      }

      // Rate limit — NewsAPI allows 1 req/sec on free tier
      await new Promise(r => setTimeout(r, 1200));

    } catch (err) {
      console.error(`Error fetching query "${query}":`, err.message);
    }
  }

  return articles;
}

async function filterWithClaude(articles) {
  if (articles.length === 0) return [];

  const prompt = `You are a research assistant for DSAExposed.com, a watchdog site tracking the Democratic Socialists of America, their terrorism ties, funding, communist ideology, and electoral infiltration of American government.

Below is a list of news articles. For each article, decide if it is RELEVANT or NOT RELEVANT to our coverage areas:

RELEVANT topics:
- DSA (Democratic Socialists of America) activities, candidates, chapters, elections
- AOC, Rashida Tlaib, Ilhan Omar, Cori Bush, or other DSA-aligned officials
- CAIR, BDS movement, Hamas, Hezbollah connections to US politicians
- Red-Green Axis (Marxist-Islamist coalition)
- Socialist/communist ideology in American politics
- Dark money funding progressive/radical candidates
- Justice Democrats, Working Families Party, Sunrise Movement
- Anti-capitalism, defund police, open borders advocacy by elected officials
- DSA primary wins or losses
- Terror-adjacent organizations operating in the US

NOT RELEVANT topics:
- General international news not connected to US DSA/socialist politics
- Sports, entertainment, lifestyle
- Business news unrelated to political funding
- Foreign elections unrelated to US radical left
- Weather, technology, science unrelated to above

Articles to evaluate:
${articles.map((a, i) => `[${i}] TITLE: ${a.title}\nDESCRIPTION: ${a.description}\nSOURCE: ${a.source}`).join('\n\n')}

Respond with ONLY a JSON array of indices of RELEVANT articles. Example: [0, 2, 5, 7]
No explanation. No markdown. Just the JSON array.`;

  try {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    }, {
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    });

    const text = response.data.content[0].text.trim();
    const indices = JSON.parse(text);
    return indices.map(i => articles[i]).filter(Boolean);

  } catch (err) {
    console.error('Claude filtering error:', err.message);
    // If Claude fails, return all articles that passed keyword filter
    return articles;
  }
}

function categorizeArticle(article) {
  const text = (article.title + ' ' + article.description).toLowerCase();

  if (text.includes('terror') || text.includes('hamas') || text.includes('hezbollah') || text.includes('cair') || text.includes('bds')) {
    return 'terrorism';
  }
  if (text.includes('fund') || text.includes('donor') || text.includes('pac') || text.includes('money') || text.includes('dark money')) {
    return 'funding';
  }
  if (text.includes('primary') || text.includes('election') || text.includes('won') || text.includes('candidate') || text.includes('vote')) {
    return 'primaries';
  }
  if (text.includes('communist') || text.includes('marxist') || text.includes('socialist') || text.includes('capitalism') || text.includes('ideology')) {
    return 'ideology';
  }
  if (text.includes('chapter') || text.includes('network') || text.includes('organization') || text.includes('coalition')) {
    return 'networks';
  }
  return 'general';
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function extractRepsWithClaude(articles, existingReps) {
  if (articles.length === 0) return [];

  const existingNames = existingReps.map(r => r.name).join(', ') || 'none yet';

  const prompt = `You are a research assistant for DSAExposed.com, a watchdog site documenting Democratic Socialists of America (DSA) affiliated candidates, elected officials, and donors.

Read the articles below. Identify any DSA-affiliated candidate, elected official, or major donor mentioned who is NOT already in this existing list: ${existingNames}

For each NEW person found, extract:
- name: full name
- office: their current or sought office (e.g. "Candidate for Michigan Governor", "U.S. Representative, NY-14")
- district: state/district if applicable, otherwise state
- dsaTie: one sentence describing their documented DSA affiliation or endorsement, based only on what the article states
- quote: a direct quote attributed to them in the article, if one exists — otherwise null
- quoteCite: source and date for the quote, if a quote exists — otherwise null
- record: 1-2 sentence factual summary of what the article reports about their positions or actions, staying close to the article's own language
- tags: array of 2-4 short tags describing their positions (e.g. "DSA Member", "Abolish ICE", "Defund Pentagon")
- sourceUrl: the article URL this was drawn from
- sourceName: the article's source publication

Only include a person if the article gives enough specific, attributable information to write an accurate entry. Do not infer or embellish beyond what the article states. If no new people are found, return an empty array.

Articles:
${articles.map((a, i) => `[${i}] TITLE: ${a.title}\nDESCRIPTION: ${a.description}\nURL: ${a.url}\nSOURCE: ${a.source}`).join('\n\n')}

Respond with ONLY a JSON array of person objects as described above. No explanation, no markdown, just the JSON array. If nothing qualifies, respond with [].`;

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
        slug: slugify(r.name),
        name: r.name,
        office: r.office || null,
        district: r.district || null,
        dsaTie: r.dsaTie || null,
        quote: r.quote || null,
        quoteCite: r.quoteCite || null,
        record: r.record || null,
        tags: Array.isArray(r.tags) ? r.tags : [],
        sourceUrl: r.sourceUrl || null,
        sourceName: r.sourceName || null,
        addedAt: new Date().toISOString()
      }));

  } catch (err) {
    console.error('Claude rep extraction error:', err.message);
    return [];
  }
}

async function main() {
  console.log('DSA Exposed News Pipeline starting...');

  // Fetch articles
  console.log('Fetching articles from NewsAPI...');
  const rawArticles = await fetchArticles();
  console.log(`Fetched ${rawArticles.length} candidate articles`);

  if (rawArticles.length === 0) {
    console.log('No articles found. Exiting.');
    return;
  }

  // Filter with Claude
  console.log('Filtering with Claude Haiku...');
  const filteredArticles = await filterWithClaude(rawArticles);
  console.log(`${filteredArticles.length} articles passed Claude filter`);

  // Load existing news.json
  const newsPath = path.join(process.cwd(), 'data', 'news.json');
  let existingNews = [];
  try {
    existingNews = JSON.parse(fs.readFileSync(newsPath, 'utf8'));
  } catch {
    existingNews = [];
  }

  // Merge and deduplicate news
  const existingUrls = new Set(existingNews.map(a => a.url));
  const newArticles = filteredArticles
    .filter(a => !existingUrls.has(a.url))
    .map(a => ({
      ...a,
      category: categorizeArticle(a),
      addedAt: new Date().toISOString()
    }));

  console.log(`${newArticles.length} new articles to add`);

  // Prepend new articles, keep last 100 total
  const mergedNews = [...newArticles, ...existingNews].slice(0, 100);

  // Write to data/news.json
  fs.writeFileSync(newsPath, JSON.stringify(mergedNews, null, 2));
  console.log(`news.json updated with ${mergedNews.length} total articles`);

  // --- Rep extraction pass ---
  const repsPath = path.join(process.cwd(), 'data', 'reps.json');
  let existingReps = [];
  try {
    existingReps = JSON.parse(fs.readFileSync(repsPath, 'utf8'));
  } catch {
    existingReps = [];
  }

  console.log('Extracting DSA-affiliated reps/candidates/donors with Claude...');
  const newReps = await extractRepsWithClaude(filteredArticles, existingReps);
  console.log(`${newReps.length} new reps/candidates found`);

  const existingSlugs = new Set(existingReps.map(r => r.slug));
  const dedupedNewReps = newReps.filter(r => !existingSlugs.has(r.slug));

  const mergedReps = [...existingReps, ...dedupedNewReps];

  fs.writeFileSync(repsPath, JSON.stringify(mergedReps, null, 2));
  console.log(`reps.json updated with ${mergedReps.length} total entries (${dedupedNewReps.length} new)`);
}

main().catch(err => {
  console.error('Pipeline error:', err);
  process.exit(1);
});
