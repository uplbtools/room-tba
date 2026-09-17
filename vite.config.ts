import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
import { SW_KILL_SWITCH } from './src/lib/constants/sw-kill-switch';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
				experimental: {
					async: true
				}
			},

			// Production runs on Vercel (room-tba.uplb.tools). adapter-vercel is
			// required for instrumentation.server.js, which adapter-auto rejects.
			adapter: adapter(),

			experimental: {
				instrumentation: {
					server: true
				},
				remoteFunctions: true
			},

			alias: {
				'@test': 'src/test'
			},

			// The worker is still built and deployed when the kill switch is on —
			// existing registrations update to it and self-destruct. Only the client
			// registration is suppressed, so new visitors never pick one up.
			serviceWorker: {
				register: !SW_KILL_SWITCH
			},

			typescript: {
				config: (config) => {
					config.include.push('../drizzle.config.ts');
				}
			},
			inspector: true
		})
	],
	// @vercel/og loads resvg/yoga WASM through its own resolver. Letting Vite
	// pre-bundle or SSR-transform it breaks that and the /og.png request dies
	// without reaching an error handler, so it stays external on both sides.
	optimizeDeps: {
		exclude: ['@vercel/og', 'maplibre-gl']
	},
	ssr: {
		external: ['@vercel/og'],
		noExternal: ['maplibre-gl']
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				// Without the browser condition Svelte resolves its server build and
				// @testing-library/svelte cannot mount components under happy-dom.
				// $env/dynamic/public needs the kit runtime, absent under vitest.
				resolve: {
					conditions: ['browser'],
					alias: {
						'$env/dynamic/public': new URL('./src/test/env-dynamic-public-stub.ts', import.meta.url)
							.pathname
					}
				},
				test: {
					name: 'component',
					environment: 'happy-dom',
					include: ['src/**/*.{component,store}.test.ts'],
					setupFiles: ['src/test/setup-components.ts']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}', 'src/**/*.{component,store}.test.ts']
				}
			}
		]
	}
});
