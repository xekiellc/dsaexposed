// DSAExposed — Global Search Overlay — Spotlight Style
(function() {
  const overlay = document.createElement('div');
  overlay.id = 'searchOverlay';
  overlay.className = 'search-overlay';
  overlay.innerHTML = `
    <div class="search-box">
      <div class="search-input-wrap">
        <span class="search-icon">⌕</span>
        <input id="globalSearch" class="search-input" type="text" placeholder="Search people, orgs, statements, funding..." autocomplete="off" spellcheck="false" />
        <button class="search-close" id="searchClose">ESC</button>
      </div>
      <div class="search-cats">
        <button class="search-cat-btn active" data-cat="all">All</button>
        <button class="search-cat-btn" data-cat="Rep">Officials</button>
        <button class="search-cat-btn" data-cat="Organization">Organizations</button>
        <button class="search-cat-btn" data-cat="Statement">Statements</button>
        <button class="search-cat-btn" data-cat="Funding">Funding</button>
      </div>
      <div class="search-results" id="searchResults">
        <div class="search-empty">Type to search the full archive...</div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Close handlers
  document.getElementById('searchClose').addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  function close() {
    overlay.classList.remove('open');
    document.getElementById('globalSearch').value = '';
    document.getElementById('searchResults').innerHTML = '<div class="search-empty">Type to search the full archive...</div>';
    activeCat = 'all';
    document.querySelectorAll('.search-cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === 'all'));
  }

  // Category filter
  let activeCat = 'all';
  document.querySelectorAll('.search-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCat = btn.dataset.cat;
      document.querySelectorAll('.search-cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      doSearch(document.getElementById('globalSearch').value.trim());
    });
  });

  // Data
  let allData = [];
  let loaded = false;

  const BUILT_IN = [
    { type: 'Rep', title: 'Zohran Mamdani', snippet: 'NYC Mayor · DSA Member · Praised Holy Land Foundation Hamas financiers · Revoked pro-Israel decrees Day 1', url: '/reps/profiles/mamdani.html' },
    { type: 'Rep', title: 'Darializa Avila Chevalier', snippet: 'NY-13 · DSA Member · Refused to condemn Hamas · Attended Oct 8 pro-Hamas rally · Columbia Apartheid Divest co-founder', url: '/reps/profiles/avila-chevalier.html' },
    { type: 'Rep', title: 'Claire Valdez', snippet: 'NY-7 · DSA Member · Liked Oct 7 Hamas celebration post · BDS support · Anti-Israel platform', url: '/reps/profiles/valdez.html' },
    { type: 'Rep', title: 'Brad Lander', snippet: 'NY-10 · Mamdani-endorsed · Called Israel\'s campaign "genocide" · Toppled Dan Goldman', url: '/reps/profiles/lander.html' },
    { type: 'Rep', title: 'Alexandria Ocasio-Cortez', snippet: 'NY-14 · DSA Member · Voted NO on Iron Dome · Voted PRESENT on Hamas condemnation · Co-founded Justice Democrats', url: '/reps/profiles/aoc.html' },
    { type: 'Rep', title: 'Rashida Tlaib', snippet: 'MI-12 · Censured by U.S. House · Promoted Hamas slogan · CAIR-funded $140K+', url: '/reps/profiles/tlaib.html' },
    { type: 'Rep', title: 'Ilhan Omar', snippet: 'MN-05 · Equated US and Israel with Hamas and Taliban · CAIR-funded $180K+ · Iron Dome NO vote', url: '/reps/profiles/omar.html' },
    { type: 'Organization', title: 'CAIR — Council on American-Islamic Relations', snippet: 'Named unindicted co-conspirator in Holy Land Foundation Hamas financing trial. Bundled $320K+ for DSA-aligned reps.', url: '/terrorism/' },
    { type: 'Organization', title: 'BDS Movement', snippet: 'Boycott, Divestment, Sanctions. Hamas-linked founding. Officially endorsed by DSA in 2017. Supported by AOC, Tlaib, Omar, Valdez.', url: '/terrorism/' },
    { type: 'Organization', title: 'Holy Land Foundation', snippet: 'Convicted 2007 of financing Hamas. $12.4M routed. Five founders sentenced 15-65 years. Praised by Mamdani in 2017.', url: '/terrorism/' },
    { type: 'Organization', title: 'American Muslims for Palestine (AMP)', snippet: 'Hamas-adjacent organization. Documented HLF institutional ties. AMP-linked bundlers donated to Tlaib and Omar campaigns.', url: '/terrorism/' },
    { type: 'Organization', title: 'Justice Democrats PAC', snippet: 'Co-founded by AOC\'s former chief of staff. Deployed $11.2M in 2022 cycle. $1.5M to Avila Chevalier, $370K to Valdez in 2026.', url: '/funding/' },
    { type: 'Organization', title: 'American Priorities PAC', snippet: 'Anti-AIPAC super PAC. $1.3M to Avila Chevalier, $455K to Valdez in 2026 NYC primaries.', url: '/funding/' },
    { type: 'Organization', title: 'NYC DSA', snippet: '12,000+ members. 18 sub-chapters. Endorsed Mamdani, Valdez, Avila Chevalier, Lander, and 6 Albany candidates in 2026.', url: '/chapters/' },
    { type: 'Organization', title: 'Working Families Party', snippet: 'DSA-aligned electoral vehicle. Cross-endorsed Brad Lander in NY-10. Connected to Open Society, SEIU, Justice Democrats.', url: '/networks/' },
    { type: 'Organization', title: "People's Forum", snippet: 'Organized Times Square rally Oct 8, 2023 — day after Hamas massacre. Avila Chevalier attended.', url: '/terrorism/' },
    { type: 'Organization', title: 'Columbia University Apartheid Divest', snippet: 'Co-founded by Avila Chevalier. Led violent 2024 Hamilton Hall occupation. Multiple arrests.', url: '/terrorism/' },
    { type: 'Statement', title: 'Mamdani: "My love to the Holy Land Five"', snippet: 'Rap song "Salam," 2017. Praising Islamic charity heads convicted of financing Hamas. Verified audio.', url: '/reps/profiles/mamdani.html' },
    { type: 'Statement', title: 'Mamdani: "When the boot of the NYPD is on your neck, it\'s been laced by the IDF"', snippet: 'DSA Panel, 2023. Verified video.', url: '/reps/profiles/mamdani.html' },
    { type: 'Statement', title: 'Avila Chevalier refuses to condemn Hamas', snippet: '"The premise of that question ignores the 75 years of occupation..." — Broadway Democrats Forum 2026, when asked to condemn Oct 7.', url: '/reps/profiles/avila-chevalier.html' },
    { type: 'Statement', title: 'Tlaib: "From the river to the sea"', snippet: 'Hamas rallying cry. Led to House censure November 2023. Tlaib voted NO on Hamas condemnation resolution.', url: '/reps/profiles/tlaib.html' },
    { type: 'Statement', title: 'Omar equates US and Israel with Hamas and Taliban', snippet: 'June 2021. Congressional Record. Condemned by members of both parties.', url: '/reps/profiles/omar.html' },
    { type: 'Statement', title: 'DSA: "right to resist occupation by any means necessary"', snippet: 'Resolution #34, DSA National Convention, August 2023. Published on DSA.org.', url: '/ideology/' },
    { type: 'Statement', title: 'Lander: "We are not complicit in occupation and genocide"', snippet: 'Campaign rally with Mamdani, June 2026. Called Israel\'s campaign "genocide" throughout the race.', url: '/reps/profiles/lander.html' },
    { type: 'Funding', title: 'Justice Democrats → Avila Chevalier: $1,500,000', snippet: '2026 NY-13 primary. FEC.gov verified.', url: '/funding/' },
    { type: 'Funding', title: 'American Priorities PAC → Avila Chevalier: $1,300,000', snippet: '2026 NY-13 primary. Anti-AIPAC super PAC. FEC.gov verified.', url: '/funding/' },
    { type: 'Funding', title: 'CAIR Action Network PAC → Rashida Tlaib: $140,000+', snippet: '2020-2024 cycles. CAIR named unindicted co-conspirator in HLF Hamas financing trial.', url: '/funding/' },
    { type: 'Funding', title: 'CAIR Action Network PAC → Ilhan Omar: $180,000+', snippet: '2020-2024 cycles. CAIR named unindicted co-conspirator in HLF Hamas financing trial.', url: '/funding/' },
    { type: 'Funding', title: 'Justice Democrats → AOC: $2,400,000', snippet: 'Multiple cycles 2018-2024. FEC.gov verified.', url: '/funding/' },
    { type: 'Funding', title: 'American Priorities PAC → Claire Valdez: $455,000', snippet: '2026 NY-7 primary. Anti-AIPAC super PAC. FEC.gov verified.', url: '/funding/' },
  ];

  async function loadData() {
    if (loaded) return;
    allData = [...BUILT_IN];
    try {
      const [reps, orgs, statements, funding] = await Promise.all([
        fetch('/data/reps.json').then(r => r.json()).catch(() => []),
        fetch('/data/orgs.json').then(r => r.json()).catch(() => []),
        fetch('/data/statements.json').then(r => r.json()).catch(() => []),
        fetch('/data/funding.json').then(r => r.json()).catch(() => []),
      ]);
      reps.forEach(r => allData.push({ type: 'Rep', title: r.name, snippet: `${r.office} — ${r.state}`, url: `/reps/profiles/${(r.slug || r.name.toLowerCase().replace(/\s+/g,'-'))}.html` }));
      orgs.forEach(o => allData.push({ type: 'Organization', title: o.name, snippet: o.description || '', url: '/terrorism/' }));
      statements.forEach(s => allData.push({ type: 'Statement', title: `${s.speaker}: "${(s.quote||'').substring(0,60)}..."`, snippet: `${s.date} — ${s.source||''}`, url: '/reps/' }));
      funding.forEach(f => allData.push({ type: 'Funding', title: `${f.donor||f.source} → ${f.recipient}`, snippet: `${f.amount||''} — ${f.description||''}`, url: '/funding/' }));
    } catch(e) {}
    // Deduplicate by title
    const seen = new Set();
    allData = allData.filter(item => { if (seen.has(item.title)) return false; seen.add(item.title); return true; });
    loaded = true;
  }

  function highlight(text, q) {
    if (!q) return text;
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(re, '<mark style="background:var(--yellow);color:var(--ink);padding:0 2px;">$1</mark>');
  }

  function doSearch(q) {
    const results = document.getElementById('searchResults');
    if (!q || q.length < 2) {
      results.innerHTML = '<div class="search-empty">Type to search the full archive...</div>';
      return;
    }
    const ql = q.toLowerCase();
    let matches = allData.filter(item => {
      const inCat = activeCat === 'all' || item.type === activeCat;
      const inText = item.title.toLowerCase().includes(ql) || item.snippet.toLowerCase().includes(ql);
      return inCat && inText;
    }).slice(0, 14);

    if (matches.length === 0) {
      results.innerHTML = `<div class="search-empty">No results for "${q}"${activeCat !== 'all' ? ' in ' + activeCat + 's' : ''}</div>`;
      return;
    }

    const typeColors = { Rep: '#B80000', Organization: '#1B6B1B', Statement: '#6B3FA0', Funding: '#C8960C' };

    results.innerHTML = matches.map(m => `
      <a href="${m.url}" class="search-result-item">
        <div class="search-result-type" style="color:${typeColors[m.type]||'#B80000'}">${m.type.toUpperCase()}</div>
        <div class="search-result-title">${highlight(m.title, q)}</div>
        <div class="search-result-snippet">${highlight(m.snippet, q)}</div>
      </a>
    `).join('');
  }

  const input = document.getElementById('globalSearch');
  input.addEventListener('input', async function() {
    await loadData();
    doSearch(this.value.trim());
  });

  // Keyboard navigation
  input.addEventListener('keydown', e => {
    const items = document.querySelectorAll('.search-result-item');
    const active = document.querySelector('.search-result-item:focus');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!active && items.length) { items[0].focus(); }
      else if (active) {
        const idx = [...items].indexOf(active);
        if (idx < items.length - 1) items[idx + 1].focus();
      }
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (active) {
        const idx = [...items].indexOf(active);
        if (idx > 0) items[idx - 1].focus();
        else input.focus();
      }
    }
    if (e.key === 'Enter' && active) { active.click(); }
  });

  // Open via nav button — expose globally
  window.openSearch = function() {
    overlay.classList.add('open');
    setTimeout(() => input.focus(), 50);
  };
})();
