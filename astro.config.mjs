// @ts-check
import { defineConfig, envField } from "astro/config";
import svelte from "@astrojs/svelte";
import AstroPWA from "@vite-pwa/astro";
import node from "@astrojs/node";
import vercel from "@astrojs/vercel";
import {
  MESSENGER_CONTRIBUTE_TARGET,
  MESSENGER_MAINTAIN_TARGET,
} from "./src/constants/community-links.ts";

/** Local E2E + integration preview — Vercel adapter does not support `astro preview`. */
const e2eNodeAdapter = process.env.ASTRO_E2E_NODE === "1";

// https://astro.build/config
export default defineConfig({
  site: "https://room-tba.uplbtools.me",

  integrations: [
    svelte(),
    AstroPWA({
      workbox: {
        // AppRoot includes map + editor + PGlite; auth/proposals pushed it past 2 MiB.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
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
          "privacy/index.html",
          "terms/index.html",
          "changelog/index.html",
        ],
        navigateFallback: "/",
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/privacy(\/|$)/,
          /^\/terms(\/|$)/,
          /^\/changelog(\/|$)/,
          // Server redirects — must hit network, not offline app shell (#471).
          /^\/messenger(\/|$)/,
          /^\/maintain(\/|$)/,
          /^\/discord(\/|$)/,
        ],
        swDest: "dist/client/sw.js",
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
    "/contribute": "/?contribute=1",
    "/discord": "https://discord.uplbtools.me",
    "/messenger": MESSENGER_CONTRIBUTE_TARGET,
    "/messenger/contribute": MESSENGER_CONTRIBUTE_TARGET,
    "/messenger/maintain": MESSENGER_MAINTAIN_TARGET,
    "/maintain": MESSENGER_MAINTAIN_TARGET,
  },

  // adapter: vercel(),
  env: {
    schema: {
      // Supabase Postgres connection string (Session pooler or direct).
      DATABASE_URL: envField.string({
        access: "secret",
        context: "server",
      }),
      // Supabase JS client (Auth, Realtime, Storage). Separate from DATABASE_URL.
      PUBLIC_SUPABASE_URL: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_SUPABASE_PUBLISHABLE_KEY: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_MAPTILER_KEY: envField.string({
        access: "public",
        context: "client",
        optional: true,
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
      // Cloudflare R2 (S3-compatible). Required for /api/admin/upload.
      R2_ACCOUNT_ID: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      R2_ACCESS_KEY_ID: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      R2_SECRET_ACCESS_KEY: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      R2_BUCKET_NAME: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      // Public base URL for uploaded objects (custom domain or r2.dev).
      R2_PUBLIC_URL: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      NOTIFICATION_GATEWAY_URL: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      NOTIFICATION_INGRESS_SECRET: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      // Resend (editor email digests, #272). Digest is skipped when unset.
      RESEND_API_KEY: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      // From address, e.g. "Room TBA <digest@uplbtools.me>".
      RESEND_FROM_EMAIL: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      // Vercel injects CRON_SECRET; /api/cron/* requires it as a Bearer token.
      CRON_SECRET: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      // Cloudflare Turnstile on editor login (#443). Widget is hidden and
      // server verification skipped when unset (local dev).
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      TURNSTILE_SECRET_KEY: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
    },
  },
  adapter: e2eNodeAdapter
    ? node({ mode: "standalone" })
    : vercel({
        // Entity SEO pages use prerender=false and render on first request; Vercel
        // caches HTML at the edge (ISR). Admin writes revalidate via ISR_BYPASS_TOKEN.
        isr: {
          expiration: 60 * 60 * 24,
          bypassToken: process.env.ISR_BYPASS_TOKEN,
          exclude: [/^\/api\//],
        },
      }),
});
