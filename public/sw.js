const CACHE_NAME = 'noticias-basicas-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/404',
  '/favicon.svg',
  '/favicon.ico',
];

// Instalação do Service Worker e cache de recursos estáticos básicos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Estratégia de Fetch: Stale-While-Revalidate para notícias
// 1. Tenta rede e atualiza cache
// 2. Se falhar rede (offline), usa cache
self.addEventListener('fetch', (event) => {
  // Ignorar pedidos da API do Strapi ou extensões
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchedResponse = fetch(event.request).then((networkResponse) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });

        return cachedResponse || fetchedResponse;
      });
    })
  );
});
