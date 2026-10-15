// /// <reference types="@sveltejs/kit" />
// /// <reference no-default-lib="true"/>
// /// <reference lib="esnext" />
// /// <reference lib="webworker" />

// // Hand-written replacement for the workbox worker vite-plugin-pwa generated.
// // SvelteKit picks this file up and registers it from the SSR'd HTML;
// // `$service-worker` supplies the exact build/static/prerendered URL lists, so
// // a missing shell fails the install loudly in DevTools instead of shipping a
// // worker whose precache silently matched no HTML (the glob failure mode).
// // Relative, not `#lib`: SvelteKit only sanctions `$service-worker` and
// // `$env/static/public` as aliased imports inside a worker (see the
// // importer_is_service_worker guard in @sveltejs/kit's vite plugin).
// import { build, files, prerendered, version } from '#service-worker';
// import { SW_KILL_SWITCH } from './lib/constants/sw-kill-switch';

// const sw = self as unknown as ServiceWorkerGlobalScope;

// // One versioned cache for shell + assets. Runtime caches keep their old names:
// // offline-maps.ts writes downloaded areas straight into `map-tiles` /
// // `map-assets`, and stable names let them survive deploys.
// const APP_CACHE = `app-${version}`;
// // Server `load` payloads for client-side navigations. Versioned alongside the
// // app: a payload written by an older deploy can no longer match the node graph
// // the new client expects, so it must not outlive it.
// const DATA_CACHE = `data-${version}`;
// const RUNTIME_CACHES = ['map-tiles', 'map-assets', 'pglite-wasm', 'desktop-only-css'];

// // The SPA shell served for app navigations. Fetched at install time — not
// // dependent on prerendering — and re-fetched whenever `version` changes.
// const SHELL = '/map';

// // Parity with the old glob: js/css plus the small image/manifest assets.
// // Fonts, JSON, and JPGs were never precached and still are not.
// const PRECACHE_EXT = /\.(?:js|css|ico|png|svg|webp|webmanifest)$/;
// // #716 / #866: desktop-only.css and the PGlite wasm+data stay out of the
// // install-time precache; both are cached on demand by the runtime rules below.
// const PRECACHE_EXCLUDE = /desktop-only|\/(?:pglite|initdb)[.-]/;

// const precache = [
// 	...new Set([
// 		SHELL,
// 		...prerendered,
// 		...build.filter((url) => PRECACHE_EXT.test(url) && !PRECACHE_EXCLUDE.test(url)),
// 		...files.filter((url) => PRECACHE_EXT.test(url))
// 	])
// ];

// // Cache third-party map resources at runtime so the campus map works offline
// // once visited (or after an explicit "download offline maps"). CacheFirst is
// // safe throughout: tiles are effectively immutable and the app assets are
// // content-hashed. maxEntries approximates workbox's ExpirationPlugin — the
// // age-based expiry and quota purge were dropped in the hand-rolled version.
// const RUNTIME_RULES: { pattern: RegExp; cacheName: string; maxEntries: number }[] = [
// 	{
// 		// #716: desktop-only.css, excluded from precache above so mobile installs
// 		// never fetch it — cached the first time a desktop viewport requests it,
// 		// so repeat offline visits still work.
// 		pattern: /\/desktop-only.*\.css$/,
// 		cacheName: 'desktop-only-css',
// 		maxEntries: 2
// 	},
// 	{
// 		// #866: PGlite ships ~5 MB of wasm + data. Too big to precache (that
// 		// would download Postgres during install), but content-hashed, so
// 		// CacheFirst is safe — a new build emits a new filename and never hits
// 		// this entry. The pattern must tolerate a `?` suffix: it matches the full
// 		// URL, so a `$` anchor alone would miss.
// 		pattern: /\/_app\/immutable\/assets\/(pglite|initdb)[.-][^/?]*\.(wasm|data)(\?|$)/,
// 		cacheName: 'pglite-wasm',
// 		maxEntries: 8
// 	},
// 	{
// 		// MapTiler vector tiles + tiles.json
// 		pattern: /^https:\/\/api\.maptiler\.com\/.*/i,
// 		cacheName: 'map-tiles',
// 		maxEntries: 4000
// 	},
// 	{
// 		// Sprites, glyphs, and shaded-relief rasters used by the map style
// 		pattern: /^https:\/\/(maputnik|orangemug|klokantech)\.github\.io\/.*/i,
// 		cacheName: 'map-assets',
// 		maxEntries: 800
// 	}
// ];

// // Navigations here go to the network, never the offline app shell. Matched
// // against pathname + search: /planner?term=… must be covered too (#planner).
// const NAVIGATION_DENYLIST = [
// 	/^\/api\//,
// 	/^\/privacy(\/|\?|$)/,
// 	/^\/terms(\/|\?|$)/,
// 	/^\/faq(\/|\?|$)/,
// 	/^\/changelog(\/|\?|$)/,
// 	/^\/sponsors(\/|\?|$)/,
// 	/^\/donate(\/|\?|$)/,
// 	/^\/wiki(\/|\?|$)/,
// 	// Server-rendered per pair; the offline app shell would replace the
// 	// directions with an empty map.
// 	/^\/route(\/|\?|$)/,
// 	// /planner is its own page; without this the nav fallback serves the map
// 	// shell and the planner never opens for returning (SW-cached) users.
// 	// Network-first; the in-app planner button covers offline.
// 	/^\/planner(\/|\?|$)/,
// 	/^\/final-exams(\/|\?|$)/,
// 	/^\/calendar(\/|\?|$)/,
// 	/^\/today(\/|\?|$)/,
// 	// Server redirects — must hit network, not the offline app shell (#471).
// 	/^\/messenger(\/|\?|$)/,
// 	/^\/maintain(\/|\?|$)/,
// 	/^\/discord(\/|\?|$)/,
// 	// Standalone pages outside the map shell.
// 	/^\/demo(\/|\?|$)/,
// 	/^\/feedback(\/|\?|$)/
// ];

// async function trimCache(cache: Cache, maxEntries: number): Promise<void> {
// 	const keys = await cache.keys();
// 	// Cache keys come back oldest-first; drop from the front.
// 	for (let i = 0; i < keys.length - maxEntries; i++) {
// 		await cache.delete(keys[i]);
// 	}
// }

// async function cacheFirst(
// 	request: Request,
// 	cacheName: string,
// 	maxEntries?: number
// ): Promise<Response> {
// 	const cache = await caches.open(cacheName);
// 	const cached = await cache.match(request);
// 	if (cached) return cached;

// 	const response = await fetch(request);
// 	// Parity with workbox's cacheableResponse {statuses: [0, 200]}: opaque
// 	// responses (type "opaque", status 0) are what cross-origin no-cors tile
// 	// requests return, and they must be cacheable for offline maps to work.
// 	if (response.ok || response.type === 'opaque') {
// 		await cache.put(request, response.clone());
// 		if (maxEntries) await trimCache(cache, maxEntries);
// 	}
// 	return response;
// }

// async function handleNavigation(request: Request, url: URL): Promise<Response> {
// 	// `/` is a 308 to /map (src/routes/+server.ts). Let the server answer when
// 	// online; mirror the redirect locally when offline.
// 	if (url.pathname === '/') {
// 		try {
// 			return await fetch(request);
// 		} catch {
// 			return Response.redirect(SHELL + url.search, 308);
// 		}
// 	}

// 	const cache = await caches.open(APP_CACHE);

// 	// Prerendered pages (and the shell itself) serve from the precache, exactly
// 	// as workbox's precacheAndRoute did before the fallback kicked in.
// 	const exact =
// 		(await cache.match(url.pathname)) ??
// 		(await cache.match(url.pathname.replace(/\/+$/, '') || '/'));
// 	if (exact) return exact;

// 	if (NAVIGATION_DENYLIST.some((re) => re.test(url.pathname + url.search))) {
// 		return fetch(request);
// 	}

// 	// App-shell fallback: every other navigation gets the cached /map document
// 	// and the client router resolves the real URL.
// 	const shell = await cache.match(SHELL);
// 	return shell ?? fetch(request);
// }

// /**
//  * Client-side navigations do not issue a `navigate` request — the router
//  * fetches `<path>/__data.json` for every route with a server `load`. Left
//  * unhandled, that fetch rejects offline, and because a raw TypeError is not an
//  * HttpError, SvelteKit renders its root error page as "500 Internal Error"
//  * (see `load_data` in @sveltejs/kit/src/runtime/client/client.js).
//  *
//  * Network-first: online navigations stay authoritative, and every payload is
//  * kept so the same route works offline later.
//  */
// async function handleDataRequest(request: Request, url: URL): Promise<Response> {
// 	const cache = await caches.open(DATA_CACHE);
// 	// Key on pathname alone. `x-sveltekit-invalidated` and the trailing-slash
// 	// flag vary per navigation while the payload does not, so keying on the full
// 	// URL would miss on every revisit.
// 	const key = url.origin + url.pathname;

// 	try {
// 		const response = await fetch(request);
// 		if (response.ok) {
// 			await cache.put(key, response.clone());
// 			await trimCache(cache, 200);
// 		}
// 		return response;
// 	} catch (error) {
// 		const cached = await cache.match(key);
// 		if (cached) return cached;

// 		// Offline and never visited online. The router understands a top-level
// 		// redirect node, so hand it back to the shell — an offline user lands on
// 		// the working map instead of an error page. Guard against the shell
// 		// itself to keep this from looping.
// 		if (url.pathname !== `${SHELL}/__data.json`) {
// 			return Response.json({ type: 'redirect', location: SHELL });
// 		}
// 		throw error;
// 	}
// }

// if (SW_KILL_SWITCH) {
// 	// Teardown build (see $lib/sw-kill-switch). It ships at the same URL as the
// 	// worker it replaces, so the browser's routine update check on navigation
// 	// picks it up and a client stuck on a bad worker recovers by itself.
// 	//
// 	// No `fetch` listener is registered on purpose: with none attached, requests
// 	// bypass the worker entirely, so even the window before this activates is
// 	// served live from the network rather than from the bad shell.
// 	sw.addEventListener('install', () => {
// 		// Don't wait for the previous worker's tabs to close.
// 		void sw.skipWaiting();
// 	});

// 	sw.addEventListener('activate', (event) => {
// 		event.waitUntil(
// 			(async () => {
// 				// Everything, downloaded offline maps included: offline-maps.ts only
// 				// ever writes `map-tiles`/`map-assets`, so with no worker left to serve
// 				// out of them they are unreadable bytes.
// 				const keys = await caches.keys();
// 				await Promise.all(keys.map((key) => caches.delete(key)));

// 				await sw.registration.unregister();

// 				// Reload the tabs this worker inherited so they drop the controller now
// 				// rather than running stale until they happen to be closed.
// 				//
// 				// Deliberately no `clients.claim()`. matchAll() without
// 				// `includeUncontrolled` returns only already-controlled clients — exactly
// 				// the set that needs rescuing. Claiming first would also capture a
// 				// first-time visitor who just registered this worker and reload them
// 				// into an endless register → unregister → reload loop.
// 				for (const client of await sw.clients.matchAll({ type: 'window' })) {
// 					try {
// 						await (client as WindowClient).navigate(client.url);
// 					} catch {
// 						// Refused (already unloading, or a cross-origin URL). The
// 						// unregister above still stands; that tab recovers on its next
// 						// navigation instead.
// 					}
// 				}
// 			})()
// 		);
// 	});
// } else {
// 	sw.addEventListener('install', (event) => {
// 		// registerType 'autoUpdate' parity: a new worker takes over immediately.
// 		void sw.skipWaiting();
// 		event.waitUntil(
// 			caches
// 				.open(APP_CACHE)
// 				// cache: 'reload' bypasses the HTTP cache so the shell and manifest are
// 				// fetched fresh; hashed assets are unaffected either way.
// 				.then((cache) => cache.addAll(precache.map((url) => new Request(url, { cache: 'reload' }))))
// 		);
// 	});

// 	sw.addEventListener('activate', (event) => {
// 		event.waitUntil(
// 			(async () => {
// 				// Drop every cache we do not own: previous app-<version> caches and the
// 				// old workbox-precache-* caches left behind by vite-plugin-pwa.
// 				const keep = new Set([APP_CACHE, DATA_CACHE, ...RUNTIME_CACHES]);
// 				const keys = await caches.keys();
// 				await Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key)));
// 				await sw.clients.claim();
// 			})()
// 		);
// 	});

// 	// `event` must stay intact: FetchEvent.respondWith is bound to the event, so
// 	// destructuring it off and calling it bare throws "Illegal invocation" and the
// 	// worker silently stops handling every request.
// 	sw.addEventListener('fetch', (event) => {
// 		const { request } = event;
// 		if (request.method !== 'GET') return;

// 		const url = new URL(request.url);
// 		if (url.protocol !== 'https:' && url.protocol !== 'http:') return;

// 		if (request.mode === 'navigate') {
// 			event.respondWith(handleNavigation(request, url));
// 			return;
// 		}

// 		if (url.origin === sw.location.origin && url.pathname.endsWith('/__data.json')) {
// 			event.respondWith(handleDataRequest(request, url));
// 			return;
// 		}

// 		for (const rule of RUNTIME_RULES) {
// 			if (rule.pattern.test(url.href)) {
// 				event.respondWith(cacheFirst(request, rule.cacheName, rule.maxEntries));
// 				return;
// 			}
// 		}

// 		if (url.origin === sw.location.origin && precache.includes(url.pathname)) {
// 			event.respondWith(cacheFirst(request, APP_CACHE));
// 		}
// 	});
// }
