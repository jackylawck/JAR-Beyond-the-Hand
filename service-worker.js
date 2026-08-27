const CACHE_VERSION = 'jar-v2026.2';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './src/main.js',
    './src/core/Pool.js',
    './src/core/SceneManager.js',
    './src/core/MainController.js',
    './src/kinematics/CCDIKSolver.js',
    './src/kinematics/ArmBuilder.js',
    './src/controls/InputMapper.js',
    './src/controls/JoystickManager.js',
    './src/render/HUDManager.js',
    './src/gameplay/MissionManager.js',
    './src/config/i18n.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;

    e.respondWith(
        fetch(e.request).then((networkRes) => {
            if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
                const resClone = networkRes.clone();
                caches.open(CACHE_VERSION).then((cache) => cache.put(e.request, resClone));
            }
            return networkRes;
        }).catch(() => caches.match(e.request))
    );
});
