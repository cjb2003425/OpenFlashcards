'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// OpenFlashcards Service Worker – Offline mode
// Strategy:
//   - Static assets (JS, CSS, HTML): Cache-first (populated on install)
//   - API reads (words, phrases, config, quiz, tts): Offline-first from IDB
//   - TTS audio: Serve from cache-storage if pre-downloaded
//   - API writes: Queue in IDB sync-queue; replay on sync
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_VERSION = 'ofc-v2026.8.1-cijian2';
const STATIC_CACHE = CACHE_VERSION + '-static';
const TTS_CACHE = CACHE_VERSION + '-tts';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/app.js',
  '/js/i18n.js',
  '/js/tts.js',
  '/js/world-languages.js',
  '/js/pages/notebook.js',
  '/js/pages/home.js',
  '/js/pages/vocabulary.js',
  '/js/pages/add.js',
  '/js/pages/train.js',
  '/js/pages/settings.js',
  '/js/pages/admin.js',
  '/js/pages/print.js',
  '/js/offline-db.js',
  '/vendor/phosphor/regular/style.css',
  '/vendor/phosphor/regular/Phosphor.woff2',
  '/vendor/phosphor/bold/style.css',
  '/vendor/phosphor/bold/Phosphor-Bold.woff2',
  '/vendor/phosphor/fill/style.css',
  '/vendor/phosphor/fill/Phosphor-Fill.woff2',
  '/img/icons/favicon-16x16.png',
  '/img/icons/favicon-32x32.png',
  '/img/icons/icon-192x192.png',
  '/img/icons/icon-512x512.png',
  '/img/icons/icon-192-maskable.png',
  '/img/icons/icon-512-maskable.png',
  '/img/icons/apple-touch-icon.png',
  '/img/icons/apple-touch-icon-120x120.png',
  '/img/icons/apple-touch-icon-152x152.png',
  '/img/icons/apple-touch-icon-167x167.png',
  '/img/icons/mstile-150x150.png',
  '/img/OpenFlashcards%20icon.png',
  '/img/OpenFlashcards%20icon%20-%20Light.png',
];

// ─────────────────────────────────────────────────────────────────────────────
// INSTALL – cache static assets individually (never fail install)
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    // Cache each asset individually — one failure must not abort the whole install.
    // Do NOT use { cache: 'reload' }: that forces a network request and fails offline.
    // Use default cache mode so the browser serves from HTTP cache when network is down.
    await Promise.allSettled(
      STATIC_ASSETS.map(url =>
        fetch(url)
          .then(res => { if (res.ok) return cache.put(url, res); })
          .catch(() => { }) // offline during install — assets already in previous cache
      )
    );
    await self.skipWaiting();
  })())
});

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVATE – clean old caches
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k.startsWith('ofc-') && k !== STATIC_CACHE && k !== TTS_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// IDB helpers (sync queue + offline data store)
// ─────────────────────────────────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('ofc-offline', 2);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('data'))
        db.createObjectStore('data');          // key: string, val: JSON
      if (!db.objectStoreNames.contains('queue'))
        db.createObjectStore('queue', { autoIncrement: true }); // pending writes
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

async function idbGet(db, store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(db, store, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = store === 'queue'
      ? tx.objectStore(store).add(value)         // autoIncrement
      : tx.objectStore(store).put(value, key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll(db, store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbClear(db, store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(db, store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Determine if the SW should intercept this request
// ─────────────────────────────────────────────────────────────────────────────
function isStaticAsset(url) {
  const p = url.pathname;
  return p.startsWith('/css/') || p.startsWith('/js/') || p.startsWith('/vendor/') || p === '/' || p === '/index.html';
}

function isApiRead(url) {
  return url.pathname.startsWith('/api/') &&
    !url.pathname.startsWith('/api/tts') &&
    ['GET'].includes(url._method || 'GET');
}

function isTtsRequest(url) {
  return url.pathname === '/api/tts';
}

function isI18n(url) {
  return url.pathname.startsWith('/i18n/');
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH intercept
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // ── 0. Navigation requests (page load, Ctrl+R, Ctrl+Shift+R) ────────────
  // Serve index.html from cache — critical path for offline.
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      // Try the cache first (check both the exact URL and '/index.html')
      const cached = await caches.match('/index.html', { ignoreVary: true })
        || await caches.match(event.request, { ignoreVary: true });
      if (cached) {
        // Refresh in background when possible
        fetch('/index.html').then(res => {
          if (res && res.ok) caches.open(STATIC_CACHE).then(c => c.put('/index.html', res));
        }).catch(() => { });
        return cached;
      }
      // Not yet cached — must be first visit, try network
      try {
        const res = await fetch(event.request);
        if (res.ok) {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then(c => {
            c.put('/index.html', clone.clone());
            c.put(event.request, clone);
          });
        }
        return res;
      } catch {
        return new Response(
          '<!doctype html><html><head><meta charset="utf-8"><title>OpenFlashcards</title></head>' +
          '<body><p style="font-family:sans-serif;padding:2rem">OpenFlashcards is loading — ' +
          'please visit the page once while online so assets can be cached.</p></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      }
    })());
    return;
  }

  // ── 1. Static assets: cache-first ───────────────────────────────────────
  if (isStaticAsset(url) || isI18n(url)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then(c => c.put(event.request, clone));
          return res;
        }).catch(() => {
          // For i18n JSON requests return a valid JSON error so the app can handle it
          if (isI18n(url)) {
            return new Response(JSON.stringify({ error: 'offline', offline: true }), {
              status: 503,
              headers: { 'Content-Type': 'application/json', 'X-Offline': '1' }
            });
          }
          return new Response('', { status: 503 });
        });
      })
    );
    return;
  }

  // ── 2. TTS audio: serve from TTS cache if available ─────────────────────
  if (isTtsRequest(url)) {
    event.respondWith(
      caches.open(TTS_CACHE).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        // Online: fetch and cache
        try {
          const res = await fetch(event.request);
          if (res.ok) cache.put(event.request, res.clone());
          return res;
        } catch {
          return new Response(JSON.stringify({ error: 'offline' }), {
            status: 503, headers: { 'Content-Type': 'application/json' }
          });
        }
      })
    );
    return;
  }

  // ── 3. API reads: network-first, fall back to IDB ───────────────────────
  if (event.request.method === 'GET' && url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).then(async res => {
        // Cache successful API reads into IDB
        if (res.ok) {
          try {
            const db = await openDB();
            const body = await res.clone().json();
            await idbPut(db, 'data', url.pathname + url.search, JSON.stringify(body));
          } catch { }
        }
        return res;
      }).catch(async () => {
        // Offline: serve from IDB
        try {
          const db = await openDB();
          const val = await idbGet(db, 'data', url.pathname + url.search);
          if (val) {
            return new Response(val, {
              status: 200,
              headers: { 'Content-Type': 'application/json', 'X-Offline': '1' }
            });
          }
        } catch { }
        return new Response(JSON.stringify({ error: 'offline', offline: true }), {
          status: 503, headers: { 'Content-Type': 'application/json', 'X-Offline': '1' }
        });
      })
    );
    return;
  }

  // ── 4. API writes (POST/PUT/DELETE): queue if offline ───────────────────
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(event.request.method) && url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request.clone()).catch(async () => {
        // Queue the write for later sync
        try {
          const db = await openDB();
          const body = await event.request.clone().text();
          await idbPut(db, 'queue', null, {
            method: event.request.method,
            url: event.request.url,
            headers: Object.fromEntries(event.request.headers.entries()),
            body,
            ts: Date.now()
          });
        } catch { }
        return new Response(JSON.stringify({ ok: false, queued: true, offline: true }), {
          status: 202,
          headers: { 'Content-Type': 'application/json', 'X-Offline': '1' }
        });
      })
    );
    return;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE: commands from the page
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('message', async event => {
  const { type, payload } = event.data || {};

  // ── Store offline bundle (words, phrases, config, locales) into IDB ─────
  if (type === 'STORE_BUNDLE') {
    try {
      const db = await openDB();
      const { entries } = payload; // [{ key, value }]
      for (const { key, value } of entries) {
        await idbPut(db, 'data', key, JSON.stringify(value));
      }
      event.ports[0].postMessage({ ok: true });
    } catch (err) {
      event.ports[0].postMessage({ ok: false, error: err.message });
    }
    return;
  }

  // ── Cache TTS audio files ────────────────────────────────────────────────
  if (type === 'CACHE_TTS') {
    try {
      const cache = await caches.open(TTS_CACHE);
      const { urls } = payload;
      let done = 0;
      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (res.ok) { await cache.put(url, res); done++; }
        } catch { }
        event.ports[0].postMessage({ type: 'progress', done, total: urls.length });
      }
      event.ports[0].postMessage({ type: 'done', done, total: urls.length });
    } catch (err) {
      event.ports[0].postMessage({ type: 'error', error: err.message });
    }
    return;
  }

  // ── Flush the pending write queue ────────────────────────────────────────
  if (type === 'SYNC_QUEUE') {
    try {
      const db = await openDB();
      const items = await idbGetAll(db, 'queue');
      let replayed = 0, failed = 0;
      for (const item of items) {
        try {
          await fetch(item.url, {
            method: item.method,
            headers: item.headers,
            body: item.body || undefined,
            credentials: 'same-origin'
          });
          replayed++;
        } catch {
          failed++;
        }
      }
      if (failed === 0) await idbClear(db, 'queue');
      event.ports[0].postMessage({ ok: true, replayed, failed, total: items.length });
    } catch (err) {
      event.ports[0].postMessage({ ok: false, error: err.message });
    }
    return;
  }

  // ── Query pending queue size ──────────────────────────────────────────────
  if (type === 'QUEUE_SIZE') {
    try {
      const db = await openDB();
      const items = await idbGetAll(db, 'queue');
      event.ports[0].postMessage({ size: items.length });
    } catch {
      event.ports[0].postMessage({ size: 0 });
    }
    return;
  }

  // ── Delete a specific TTS cache entry ──────────────────────────────────────
  if (type === 'DELETE_TTS_CACHE') {
    try {
      const { lang, speedKey, itemId } = payload;
      const cache = await caches.open(TTS_CACHE);
      // Match the URL pattern: /api/tts?lang=...&id=...&speed=...
      // We need to construct the URL to match
      const url = `/api/tts?lang=${encodeURIComponent(lang)}&id=${encodeURIComponent(itemId)}&speed=${(parseInt(speedKey.replace('spd', ''), 10) / 100).toFixed(2)}`;
      await cache.delete(url);
      event.ports[0].postMessage({ ok: true });
    } catch (err) {
      event.ports[0].postMessage({ ok: false, error: err.message });
    }
    return;
  }

  // ── Clear all offline data ────────────────────────────────────────────────
  if (type === 'CLEAR_OFFLINE') {
    try {
      const db = await openDB();
      await idbClear(db, 'data');
      await idbClear(db, 'queue');
      await caches.delete(TTS_CACHE);
      event.ports[0].postMessage({ ok: true });
    } catch (err) {
      event.ports[0].postMessage({ ok: false, error: err.message });
    }
    return;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// BACKGROUND SYNC (if supported)
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'ofc-sync') {
    event.waitUntil(replayQueue());
  }
});

async function replayQueue() {
  try {
    const db = await openDB();
    const items = await idbGetAll(db, 'queue');
    for (const item of items) {
      await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body || undefined,
        credentials: 'same-origin'
      });
    }
    await idbClear(db, 'queue');
  } catch { }
}
