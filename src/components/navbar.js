export function renderNavbar() {
  return `
<header style="padding:12px 20px;border-bottom:1px solid var(--border);background:transparent;">
  <nav style="max-width:1126px;margin:0 auto;display:flex;gap:12px;align-items:center;justify-content:flex-start;">
    <a href="#/" style="text-decoration:none;color:var(--text-h);font-weight:600;margin-right:12px;">Home</a>
    <a href="#/about" style="text-decoration:none;color:var(--text);">About</a>
  </nav>
</header>
  `
}
