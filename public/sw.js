// Service worker minimo: existe apenas para o navegador considerar o app
// "instalavel" (requisito do Chrome/Android para mostrar "Adicionar a tela
// inicial"/"Instalar app"). Nao faz cache de nada — todo fetch vai direto
// para a rede, sempre com os dados mais recentes do Supabase. Isso evita
// bugs de tela "presa" em uma versao antiga do app ou de dados velhos
// aparecendo por causa de cache.
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // Passthrough intencional: sem responder com cache, o navegador cai no
  // comportamento padrao de rede.
})
