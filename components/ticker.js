// DSAExposed — Ticker Component
(function() {
  const items = [
    'NYC Sweep: Mamdani\'s DSA slate goes 3-for-3 in congressional primaries — June 23, 2026',
    'Claire Valdez wins NY-7 — liked post celebrating Hamas attack on Oct. 7, 2023',
    'Darializa Avila Chevalier wins NY-13 — refused to condemn Hamas at candidate forum',
    'Brad Lander wins NY-10 — called Israel\'s campaign "genocide" throughout race',
    'DSA picks up 6+ NY state legislature seats — bloc now 15+ Albany lawmakers',
    'Zohran Mamdani revokes pro-Israel decrees on Day 1 as NYC Mayor',
    'DSA national membership: 92,000+ members across 250+ chapters in 49 states',
    'CAIR named unindicted co-conspirator in Holy Land Foundation Hamas financing trial',
    'AOC votes NO on Iron Dome funding — Roll Call 309, September 2021',
    'Rashida Tlaib censured by U.S. House for promoting Hamas rallying cry',
    'DSA 2023 convention: refused to condemn Hamas October 7 attack',
    'DSA officially endorses BDS movement — calls for elimination of U.S. aid to Israel',
  ];
  const doubled = [...items, ...items];
  document.querySelector('.ticker-wrap').innerHTML = `
    <span class="ticker-label">INTEL FEED</span>
    <div class="ticker-track">${doubled.map(i => `<span>${i}</span>`).join('')}</div>
  `;
})();
