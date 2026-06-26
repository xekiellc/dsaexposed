// DSAExposed — Global Search Overlay
// Injected into every page. Searches reps.json, orgs.json, statements.json, funding.json
(function() {
  // Inject overlay HTML
  const overlay = document.createElement('div');
  overlay.id = 'searchOverlay';
  overlay.className = 'search-overlay';
  overlay.innerHTML = `
    <div class="search-box">
      <div class="search-input-wrap">
        <input id="globalSearch" class="search-input" type="text" placeholder="Search reps, orgs, statements, funding..." autocomplete="off" />
        <button class="search-close" onclick="document.getElementById('searchOverlay').classList.remove('open')">ESC</button>
      </div>
      <div class="search-results" id="searchResults">
        <div class="search-empty">Type to search the full archive...</div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Close on ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') overlay.classList.remove('open');
  });

  // Close on backdrop click
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });

  // Load all data
  let allData = [];
  let loaded = false;

  async function loadData() {
    if (loaded) return;
    try {
      const [reps, orgs, statements, funding] = await Promise.all([
        fetch('/data/reps.json').then(r => r.json()).catch(() => []),
        fetch('/data/orgs.json').then(r => r.json()).catch(() => []),
        fetch('/data/statements.json').then(r => r.json()).catch(() => []),
        fetch('/data/funding.json').then(r => r.json()).catch(() => []),
      ]);

      reps.forEach(r => allData.push({
        type: 'Rep',
        title: r.name,
        snippet: `${r.office} — ${r.state} — ${(r.tags || []).join(', ')}`,
        url: `/reps/profiles/${r.slug || r.name.toLowerCase().replace(/\s+/g,'-')}.html`
      }));

      orgs.forEach(o => allData.push({
        type: 'Organization',
        title: o.name,
        snippet: o.description || o.type || '',
        url: `/terrorism/`
      }));

      statements.forEach(s => allData.push({
        type: 'Statement',
        title: `${s.speaker}: "${s.quote ? s.quote.substring(0,80) + '...' : ''}"`,
        snippet: `${s.date} — ${s.source || ''}`,
        url: `/reps/`
      }));

      funding.forEach(f => allData.push({
        type: 'Funding',
        title: `${f.donor || f.source} → ${f.recipient}`,
        snippet: `${f.amount || ''} — ${f.description || ''}`,
        url: `/funding/`
      }));

      loaded = true;
    } catch(e) {
      console.error('Search data load error:', e);
    }
  }

  // Search
  const input = document.getElementById('globalSearch');
  const results = document.getElementById('searchResults');

  input.addEventListener('input', async function() {
    const q = this.value.trim().toLowerCase();
    if (q.length < 2) {
      results.innerHTML = '<div class="search-empty">Type to search the full archive...</div>';
      return;
    }

    await loadData();

    const matches = allData.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.snippet.toLowerCase().includes(q)
    ).slice(0, 12);

    if (matches.length === 0) {
      results.innerHTML = `<div class="search-empty">No results for "${q}"</div>`;
      return;
    }

    results.innerHTML = matches.map(m => `
      <a href="${m.url}" class="search-result-item">
        <div class="search-result-type">${m.type}</div>
        <div class="search-result-title">${m.title}</div>
        <div class="search-result-snippet">${m.snippet}</div>
      </a>
    `).join('');
  });
})();
