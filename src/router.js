export function initRouter(routes, outletId = 'outlet') {
  const outlet = document.getElementById(outletId)
  function currentPath() {
    const hash = location.hash.replace(/^#/, '')
    return hash === '' ? '/' : hash
  }
  function render() {
    const path = currentPath()
    const route = routes[path] || routes['/404'] || routes['/']
    outlet.innerHTML = route.render()
    if (route.afterRender) route.afterRender()
  }
  window.addEventListener('hashchange', render)
  window.addEventListener('popstate', render)
  render()
  return { render }
}
