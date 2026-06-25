// @ts-check
import { defineConfig, envField } from "astro/config";
import react from "@astrojs/react";
import svelte from "@astrojs/svelte";
import AstroPWA from "@vite-pwa/astro";
import vercel from "@astrojs/vercel";
// https://astro.build/config
export default defineConfig({
  site: "https://room-tba.uplbtools.me",

  integrations: [
    react(),
    svelte(),
    AstroPWA({
      workbox: {
        // The Vercel adapter otherwise points globDirectory at dist/server,
        // so nothing client-side gets precached and the app can't load
        // offline. Glob the actual client output instead.
        globDirectory: "dist/client",
        // Precache app assets plus the home shell (only the root index.html,
        // not the ~650 entity SEO pages) so the app loads offline. The
        // navigate fallback serves that shell for offline navigations.
        globPatterns: [
          "**/*.{js,css,ico,png,svg,webmanifest,json,jpg}",
          "index.html",
        ],
        navigateFallback: "/",
        navigateFallbackDenylist: [/^\/api\//],
        swDest: `dist/client/sw.js`,
        // Cache third-party map resources at runtime so the campus map works
        // offline once visited (or after an explicit "download offline maps").
        runtimeCaching: [
          {
            // MapTiler vector tiles + tiles.json
            urlPattern: /^https:\/\/api\.maptiler\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "map-tiles",
              expiration: {
                maxEntries: 4000,
                maxAgeSeconds: 60 * 60 * 24 * 30,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Sprites, glyphs, and shaded-relief rasters used by the map style
            urlPattern:
              /^https:\/\/(maputnik|orangemug|klokantech)\.github\.io\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "map-assets",
              expiration: {
                maxEntries: 800,
                maxAgeSeconds: 60 * 60 * 24 * 30,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "Room TBA",
        description:
          "An open-source website built to help UPLB students find their rooms across the Los Baños campus",
        theme_color: "#a30e00",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
        display_override: ["standalone"],
      },
    }),
  ],

  vite: {
    preview: {
      host: "127.0.0.1",
    },
    server: {
      host: "localhost",
    },
    optimizeDeps: {
      exclude: ["@electric-sql/pglite"],
    },
  },

  redirects: {
    "/contribute": "https://forms.gle/nVUMuuZgfW1HgXc98",
    "/messenger": "https://m.me/j/AbbjA1ouHCefGTkU",
  },

  // adapter: vercel(),
  env: {
    schema: {
      NEON_CONNECTION_STRING: envField.string({
        access: "secret",
        context: "server",
      }),
      ADMIN_PASSWORD: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      ADMIN_SESSION_SECRET: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
    },
  },
  adapter: vercel(),
});
