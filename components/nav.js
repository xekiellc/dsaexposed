// DSAExposed — Nav Component
(function() {
  const path = window.location.pathname;
  const links = [
    { href: '/reps/', label: 'Rep Tracker' },
    { href: '/terrorism/', label: 'Terrorism Ties' },
    { href: '/funding/', label: 'Funding' },
    { href: '/ideology/', label: 'Ideology' },
    { href: '/networks/', label: 'Networks' },
    { href: '/chapters/', label: 'Chapters' },
    { href: '/primaries/', label: 'Primaries' },
    { href: '/media/', label: 'Media' },
    { href: '/submit/', label: 'Submit a Tip' },
  ];

  const isActive = (href) => path === href || (path.startsWith(href) && href !== '/');

  document.querySelector('nav').innerHTML = `
    <a href="/" class="nav-logo">
      <img src="/assets/dsalogo9.png" alt="DSAExposed" style="height:44px;width:44px;object-fit:contain;margin-right:10px;border-radius:2px;" />
      DSA<span>Exposed</span>
    </a>
    <ul class="nav-links">
      ${links.map(l => `<li><a href="${l.href}"${isActive(l.href) ? ' class="active"' : ''}>${l.label}</a></li>`).join('')}
    </ul>
    <button class="nav-search-btn" onclick="window.openSearch ? window.openSearch() : document.getElementById('searchOverlay').classList.add('open')">⌕ Search</button>
  `;
})();
