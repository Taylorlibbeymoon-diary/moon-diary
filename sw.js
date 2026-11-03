/*
  Moon Diary — service worker
  ============================
  Keeps a copy of the app's own files on your phone so it opens offline.
  It never touches your diary entries.

  When you change any file, bump the version number below (v12 → v13),
  and APP_VERSION in js/app.js to match. That tells phones to fetch the
  fresh files.
*/

const CACHE = "moon-diary-v12";

const APP_FILES = [
  "./",
  "index.html",
  "css/style.css",
  "js/db.js",
  "js/recorder.js",
  "js/settings.js",
  "js/rhythms.js",
  "js/weather.js",
  "js/ayurveda.js",
  "js/learning.js",
  "js/claude.js",
  "js/zip.js",
  "js/app.js",
  "js/settings-screen.js",
  "js/today-screen.js",
  "js/garden.js",
  "js/letters.js",
  "js/keepsake.js",
  "content/prompts.js",
  "content/checkin.js",
  "content/rhythms.js",
  "content/ayurveda.js",
  "content/letters.js",
  "manifest.webmanifest",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

// First visit (or a new version): save fresh copies of the app's files.
// cache: "reload" skips the phone's 10-minute memory of older files.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(APP_FILES.map((file) => new Request(file, { cache: "reload" })))
    )
  );
  self.skipWaiting();
});

// New version: tidy away old copies.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Each time the app asks for a file: check the internet first so you get
// the newest version, and fall back to the saved copy when offline.
// cache: "no-cache" means "always ask GitHub if this changed", which is
// a tiny, quick question, so updates never wait on old copies.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // Only the app's own files. (Weather requests go straight through, unsaved.)
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request, { cache: "no-cache" })
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
