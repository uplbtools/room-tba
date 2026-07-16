# Ad policy

Room TBA shows a small number of curated, campus-relevant sponsor placements
to fund the project (see [funding-model.md](funding-model.md)). This policy
governs what runs and where.

## Who can sponsor

Curated campus-relevant sponsors only: food, dorms/boarding houses, printing,
bookstores, clinics, transport, review centers, and student orgs. Student org
events get **free** promotion.

## Prohibited

- Gambling, alcohol, tobacco
- MLM and predatory lending
- Auto-playing media
- Tracking pixels or any third-party scripts
- Ads that mimic app UI (fake buttons, fake search results)

## Placement rules

- All ads are clearly labeled **"Sponsored"** (never `aria-hidden`).
- Max **1 ad visible at a time** on the map view (sponsored place pins are
  location markers, not counted as ads for this rule).
- Self-hosted images only (`public/sponsors/` or R2) — no external ad servers.
- **No ads on:** map canvas overlays, search results, loading splash, planner,
  finals screen, push notifications.
- **Sponsored map pins** are the one map-surface exception: a Gold/Silver
  sponsor with a real physical location near campus may have its existing
  place pin highlighted (static gold ring + always-visible "Sponsored" label,
  max **3** at once, gold priority). The pin must anchor to the sponsor's
  actual `places` entity — never a fabricated location — and clicking it opens
  the normal place detail panel. No animation, no fake markers.
- Zero layout shift: sponsor images ship `width`/`height` attributes and lazy
  load; components render nothing when no sponsor is active.

## Zones

| Zone | Surface                                    | Tier          |
| ---- | ------------------------------------------ | ------------- |
| A    | Status bar "Supported by" badge            | Gold          |
| B    | Side panel banner (dismissable)            | Gold + Silver |
| C    | `/sponsors` showcase page                  | All           |
| D    | Static page strip (changelog, legal)       | Gold + Silver |
| E    | Sponsored map pin (real location, max 3)   | Gold + Silver |

## Tracking

First-party only (`/api/sponsor-event`): impressions are session-deduped via
`sessionStorage` (no cookies), bot traffic is dropped server-side, and beacons
fail silently offline. We never share user data with sponsors — see the
[privacy policy](https://room-tba.uplbtools.me/privacy).

Sponsor config lives in `public/sponsors.json`; sponsor images in
`public/sponsors/` are cached by the service worker for offline support.
Sponsor pages are prerendered, so a sponsor whose start date passes after the
latest deploy appears on the next build.
