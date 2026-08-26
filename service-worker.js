const CACHE_NAME = 'beyond-the-hand-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './src/main.js',
  './src/core/Pool.js',
  './src/core/ConfigManager.js',
  './src/core/SceneManager.js',
  './src/core/ErrorBoundary.js',
  './src/core/MainController.js',
  './src/core/AudioEngine.js',
  './src/kinematics/ArmBuilder.js',
  './src/kinematics/CCDIKSolver.js',
  './src/controls/InputMapper.js',
  './src/controls/JoystickManager.js',
  './src/gameplay/MissionManager.js',
  './src/render/HUDManager.js',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
