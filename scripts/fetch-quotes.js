// scripts/fetch-quotes.js
// Searches NewsAPI for reported quotes from Hasan Piker and DSA leadership,
// extracts direct quotes via Claude Haiku, dedupes, and appends to data/own-words.json.
// Run via GitHub Actions alongside fetch-news.js and fetch-endorsements.js.

const fs = require('fs');
const path = require('path');

const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OWN_WORDS_PATH = path.join(__dirname, '..', 'data', 'own-words.json');

const SEARCH_QUERIES = [
  '"Hasan Piker" DSA',
  '"Democratic Socialists of America" co-chair quote',
  '"Democratic Socialists of America" leader said',
  'DSA candidate "on the record"'
];

async function fetchNewsArticles(query) {
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=15&apiKey=${NEWSAPI_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`NewsAPI request failed for query "${query}": ${res.status}`);
    return [];
  }
  const data = await res.json();
  return data.articles || [];
}

async function extractQuotesWithClaude(articles) {
  if (articles.length === 0) return [];

  const articleText = articles
    .map((a, i) => `[${i}] Title: ${a.title}\nSource: ${a.source?.name}\nURL: ${a.url}\nPublished: ${a.publishedAt}\nContent: ${a.description || ''} ${a.content || ''}`)
    .join('\n\n');

  const systemPrompt = `You extract verbatim direct quotes from news articles for a factual documentation project.
Only extract a quote if:
- It is presented as a direct, verbatim quotation (in quotation marks or clearly attributed as spoken/written words) from Hasan Piker or a named DSA (Democratic Socialists of America) leader/co-chair/national officer.
- The article provides enough context to identify who said it and roughly when/where.

Return ONLY a JSON array (no markdown fences, no preamble) of objects with this exact shape:
[
  {
    "person": "Full Name",
    "role": "their described role/title in the article",
    "quote": "verbatim quote text",
    "context": "one sentence describing the setting",
    "date": "YYYY-MM-DD if known, else empty string",
    "source_account": "the news outlet name",
    "source_url": "the article URL",
    "video_embed_url": ""
  }
]
If no qualifying quotes are found, return an empty array: []`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: articleText }]
    })
  });

  if (!response.ok) {
    console.error(`Claude API request failed: ${response.status}`);
    return [];
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '[]';
  const clean = text.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(clean);
  } catch (err) {
    console.error('Failed to parse Claude response as JSON:', err.message);
    return [];
  }
}

function loadExistingQuotes() {
  if (!fs.existsSync(OWN_WORDS_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(OWN_WORDS_PATH, 'utf8'));
  } catch (err) {
    console.error('Failed to parse existing own-words.json, starting fresh:', err.message);
    return [];
  }
}

function makeId(person, quote) {
  const slug = person.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const quoteFragment = quote.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
  return `${slug}-${quoteFragment}`;
}

function isDuplicate(existing, candidate) {
  return existing.some(e =>
    e.person.toLowerCase() === candidate.person.toLowerCase() &&
    e.quote.toLowerCase().trim() === candidate.quote.toLowerCase().trim()
  );
}

async function main() {
  if (!NEWSAPI_KEY || !ANTHROPIC_API_KEY) {
    console.error('Missing NEWSAPI_KEY or ANTHROPIC_API_KEY environment variables.');
    process.exit(1);
  }

  const existing = loadExistingQuotes();
  let addedCount = 0;

  for (const query of SEARCH_QUERIES) {
    console.log(`Searching: ${query}`);
    const articles = await fetchNewsArticles(query);
    if (articles.length === 0) continue;

    const extracted = await extractQuotesWithClaude(articles);

    for (const candidate of extracted) {
      if (!candidate.person || !candidate.quote) continue;
      if (isDuplicate(existing, candidate)) continue;

      const entry = {
        id: makeId(candidate.person, candidate.quote),
        person: candidate.person,
        role: candidate.role || '',
        quote: candidate.quote,
        context: candidate.context || '',
        date: candidate.date || '',
        source_account: candidate.source_account || '',
        source_url: candidate.source_url || '',
        video_embed_url: candidate.video_embed_url || ''
      };

      existing.push(entry);
      addedCount++;
      console.log(`Added quote: ${entry.person} — "${entry.quote.slice(0, 60)}..."`);
    }

    // brief delay between queries to be polite to both APIs
    await new Promise(r => setTimeout(r, 600));
  }

  fs.writeFileSync(OWN_WORDS_PATH, JSON.stringify(existing, null, 2));
  console.log(`Done. Added ${addedCount} new quote(s). Total: ${existing.length}.`);
}

main().catch(err => {
  console.error('fetch-quotes.js failed:', err);
  process.exit(1);
});
