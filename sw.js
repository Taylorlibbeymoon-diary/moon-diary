/*
  Moon Diary — service worker
  ============================
  Keeps a copy of the app's own files on your phone so it opens offline.
  It never touches your diary entries.

  When you change any file, bump the version number below (v1 → v2).
  That tells phones to fetch the fresh files.
*/

const CACHE = "moon-diary-v2";

const APP_FILES = [
  "./",
  "index.html",
  "css/style.css",
  "js/db.js",
  "js/recorder.js",
  "js/app.js",
  "content/prompts.js",
  "manifest.webmanifest",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

// First visit: save the app's files.
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_FILES)));
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

// Each time the app asks for a file: try the internet first so you get
// the newest version, and fall back to the saved copy when offline.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
