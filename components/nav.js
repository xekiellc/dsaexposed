document.addEventListener('DOMContentLoaded', function () {
  const path = window.location.pathname;

  const isRoot =
    path === '/' ||
    path === '/index.html' ||
    path.match(/^\/index\.html?$/);

  const base = isRoot ? '' : '/';

  const navHTML = `
    <a href="${base}" class="nav-logo">DSA<span style="color:var(--red)">EXPOSED</span></a>
    <ul class="nav-links">
      <li><a href="${base}reps/"      ${path.includes('/reps/')      ? 'class="active"' : ''}>Rep Tracker</a></li>
      <li><a href="${base}terrorism/" ${path.includes('/terrorism/') ? 'class="active"' : ''}>Terrorism Ties</a></li>
      <li><a href="${base}funding/"   ${path.includes('/funding/')   ? 'class="active"' : ''}>Funding</a></li>
      <li><a href="${base}ideology/"  ${path.includes('/ideology/')  ? 'class="active"' : ''}>Ideology</a></li>
      <li><a href="${base}networks/"  ${path.includes('/networks/')  ? 'class="active"' : ''}>Networks</a></li>
      <li><a href="${base}chapters/"  ${path.includes('/chapters/')  ? 'class="active"' : ''}>Chapters</a></li>
      <li><a href="${base}primaries/" ${path.includes('/primaries/') ? 'class="active"' : ''}>Primaries</a></li>
      <li><a href="${base}media/"     ${path.includes('/media/')     ? 'class="active"' : ''}>Media</a></li>
      <li><a href="${base}submit/"    ${path.includes('/submit/')    ? 'class="active"' : ''}>Submit a Tip</a></li>
    </ul>
  `;

  const nav = document.querySelector('nav');
  if (nav) nav.innerHTML = navHTML;
});
