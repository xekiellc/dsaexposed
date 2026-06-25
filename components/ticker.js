document.addEventListener('DOMContentLoaded', function () {
  const items = [
    'NYC primaries: 3 DSA-aligned reps win on anti-America platform',
    'DSA national convention endorses BDS movement resolution',
    'DSA chapter leaders appear at CAIR-sponsored event',
    'Follow the money: $4.2M in dark funding traced to DSA 2024 campaigns',
    'DSA publishes "Toward a Socialist America" manifesto',
    'Red-Green Axis: Marxist-Islamist alliance deepens in major US cities',
    'Rashida Tlaib censured by U.S. House for Hamas-linked slogan',
    'CAIR named unindicted co-conspirator in Holy Land Foundation trial',
    'AOC votes NO on Iron Dome funding — Roll Call 309',
    'DSA chapter co-sponsors post-October 7 rally with CAIR in NYC',
    'Venezuela: 7.7 million flee socialism — largest crisis in Western Hemisphere',
    'North Korea: 100,000+ political prisoners held in camps today',
  ];

  // Double the items so the scroll loops seamlessly
  const doubled = [...items, ...items];

  const tickerHTML = `
    <span class="ticker-label">INTEL FEED</span>
    <span class="ticker-track">
      ${doubled.map(item => `<span>${item}</span>`).join('')}
    </span>
  `;

  const ticker = document.querySelector('.ticker-wrap');
  if (ticker) ticker.innerHTML = tickerHTML;
});
