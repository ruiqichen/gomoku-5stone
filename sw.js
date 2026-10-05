const CACHE_NAME = 'classic-games-hub-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './gobang/build/index.html',
  './javascript-snake/src/index.html',
  './javascript-snake/src/js/snake.js',
  './javascript-snake/src/js/init.js',
  './javascript-snake/src/css/main-snake.css',
  './javascript-snake/src/css/common-snake.css',
  './xqwlight/JavaScript/index.htm',
  './xqwlight/JavaScript/board.js',
  './xqwlight/JavaScript/book.js',
  './xqwlight/JavaScript/cchess.js',
  './xqwlight/JavaScript/position.js',
  './xqwlight/JavaScript/search.js',
  './xqwlight/background.gif'
];

// 安装 Service Worker 并缓存资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// 激活时清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 拦截网络请求，优先使用缓存 (实现离线可玩)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});