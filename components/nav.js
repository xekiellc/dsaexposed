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

  const isActive = (href) => path === href || path.startsWith(href) && href !== '/';

  document.querySelector('nav').innerHTML = `
    <a href="/" class="nav-logo">DSA<span>Exposed</span></a>
    <ul class="nav-links">
      ${links.map(l => `<li><a href="${l.href}" ${isActive(l.href) ? 'class="active"' : ''}>${l.label}</a></li>`).join('')}
    </ul>
    <button class="nav-search-btn" onclick="document.getElementById('searchOverlay').classList.add('open');document.getElementById('globalSearch').focus();">⌕ Search</button>
  `;
})();
