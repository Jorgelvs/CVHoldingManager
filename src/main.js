import './style.css'
import { initRouter } from './router.js'
import { home } from './pages/home.js'
import { about } from './pages/about.js'
import { renderNavbar } from './components/navbar.js'

document.querySelector('#app').innerHTML = `${renderNavbar()}<main id="outlet"></main>`

const routes = {
  '/': home,
  '/about': about,
}

initRouter(routes, 'outlet')
