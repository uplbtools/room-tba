# Cloudflare migration spike

## Recommendation: Stay on Vercel for now; revisit in Q3 2026

## Top 3 pros

1. **Edge footprint**: Workers run close to Philippine users; may reduce API latency for campus map tiles and entity queries.
2. **Cost predictability**: R2 + Workers free tier scales more linearly than Vercel function usage as traffic grows.
3. **Unified platform**: static assets, SSR, cron, KV/R2, and analytics on one vendor reduces vendor juggling.

## Top 3 cons

1. **Postgres at the edge**: `node-postgres` + long-lived connections do not map cleanly to Workers; requires Hyperdrive → Supabase or a D1 schema migration (significant effort).
2. **Migration cost**: adapter swap (`@astrojs/cloudflare`), env/secrets migration, DNS cutover, CI changes, and PWA re-validation.
3. **Runtime limits**: Workers CPU/time limits may conflict with map-heavy SSR pages, admin writes, and build-time DB queries for ~650 SSG entity pages.

## Estimated effort: L (large)

- Spike deploy to staging: 1–2 weeks
- Full migration + testing: 4–6 weeks
- Rollback plan required

## Blockers that would veto migration

- No Hyperdrive or D1 migration path confirmed for Supabase schema
- PWA offline shell breaks after adapter change
- Vercel preview deploys / branch protection workflow cannot be replicated

## Next steps

- Defer until post-launch when traffic patterns are known
- Re-evaluate after push notifications (#214) and scheduled jobs land
- Keep R2 for image uploads (already hybrid)
