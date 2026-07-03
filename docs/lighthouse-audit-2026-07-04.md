# Lighthouse audit — top 10 Vercel apps (2026-07-04)

Audit of the ten most recently updated production Vercel projects under `stimmie`, ranked by deployment recency. Raw Lighthouse JSON was captured to `/tmp/lighthouse-audits/` during the agent session.

## Baseline scores (production, pre-fix)

| Project | URL | Perf | A11y | BP | SEO |
| --- | --- | ---: | ---: | ---: | ---: |
| room-tba | room-tba.uplbtools.me | 32 | 90 | 96 | 100 |
| uplbtools-me | www.uplbtools.me | 65 | 93 | 100 | 100 |
| web-mobile | web.stimmie.dev | 71 | 100 | 96 | 100 |
| stimmie-dev | www.stimmie.dev | 79 | 96 | 96 | 100 |
| crib | crib.stimmie.dev | 74 | 98 | 100 | 100 |
| hearthcraft | www.hearthcraft.net | 75 | 98 | 100 | 100 |
| tutorial | tutor.stimmie.dev | 85 | 92 | 96 | 100 |
| portal | portal-five-drab.vercel.app | 84 | 94 | 100 | 100 |
| math-mock | math-mock-one.vercel.app | 89 | 94 | 100 | 100 |
| freshie-guide | guide.stimmie.dev | 91 | 96 | 100 | 100 |

## Shipped in this pass (2026-07-04)

| Repo | Commit scope | Production path |
| --- | --- | --- |
| uplbtools/room-tba | Search ARIA (`aria-haspopup` vs invalid `aria-expanded` on `searchbox`) | `staging` → `main` |
| uplbtools/uplbtools.me | Contrast, heading order, hero image dimensions | `main` |
| smmariquit/web-mobile | Image dimensions, prerender `/projects/*` routes | `main` |
| smmariquit/stimmie.dev | UTC marquee dates, divider contrast, scrapbook CLS reserve | `main` |
| smmariquit/the-crib | `<main>` landmark | `main` |
| smmariquit/hearthcraft | `<main>` landmark in root layout | `main` |
| smmariquit/tutorials | `<main>` landmark, remove broken insights script, headings/contrast | `main` |
| smmariquit/freshie-guide | Heading order (`h2` guide titles) | `main` |
| smmariquit/math-mock | `<main>` landmark, contrast | `main` |
| smmariquit/curriculum | `<main>` landmark, footer link underline | `main` |

## Deferred — tracked as GitHub issues

| Area | Issue |
| --- | --- |
| room-tba map/PGlite TBT & perf score | [#482](https://github.com/uplbtools/room-tba/issues/482) |
| LCP & image delivery | [uplbtools.me#3](https://github.com/uplbtools/uplbtools.me/issues/3), [the-crib#2](https://github.com/smmariquit/the-crib/issues/2), [hearthcraft#8](https://github.com/smmariquit/hearthcraft/issues/8) |
| Render-blocking CSS / unused JS | [web-mobile#2](https://github.com/smmariquit/web-mobile/issues/2), [stimmie.dev#20](https://github.com/smmariquit/stimmie.dev/issues/20), [tutorials#6](https://github.com/smmariquit/tutorials/issues/6) |

Re-run after deploy:

```sh
npx lighthouse https://room-tba.uplbtools.me --view
```

## Notes

- **room-tba perf (32)** in headless Lighthouse is partly environmental: WebGL init fails without GPU; real-user perf still needs bundle/code-split work ([#482](https://github.com/uplbtools/room-tba/issues/482)).
- **web-mobile** `_payload.json` 404 on prefetched project routes required explicit Nitro prerender routes for `/projects/:slug`.
- **tutorial** hard-coded `/_vercel/insights/script.js` 404s when Web Analytics is not enabled on the Vercel project; removed in favor of optional `@vercel/analytics` if needed later.
