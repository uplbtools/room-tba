# Building-to-building walking router

Room TBA's building router is a walking-only Map tools task. It selects exactly
two mapped buildings and estimates the outdoor walk between their map pins.

## Routing contract

- Route authority: `src/generated/walk-graph.json` through the existing
  client-side travel-graph engine.
- Walking speed: the shared `WALK_KPH` constant. The building router does not
  own a second speed.
- Endpoint correlation: each building pin snaps to the geometrically nearest
  point on mapped walk-edge geometry, not merely to the nearest junction node.
  The snapped edge must belong to the graph's largest weakly connected
  component and the pin-to-edge distance must remain within the audited hard
  ceiling.
- Virtual endpoint routing: an edge snap behaves as a lightweight query node.
  Partial edge distance from the snap to each legal endpoint is combined with
  the existing target-bounded Dijkstra result. The checked-in `TravelGraph`
  itself is never mutated.
- One-way semantics remain authoritative. A virtual origin on a one-way edge
  may continue only in the stored direction; a virtual destination may only be
  approached from a legal direction. Two snaps on the same edge use the direct
  sub-edge path only when directionality permits it.
- Canonical totals include both approximate building-pin connectors:
  - origin pin → origin edge snap
  - mapped graph route, including partial origin/destination edges
  - destination edge snap → destination pin
- The solid maroon map line is authoritative graph geometry. Dashed gray
  connector lines are approximate and are never presented as surveyed
  entrances or indoor paths. Microscopic connectors under 1.5 m remain in
  distance/time totals but are omitted visually to avoid sub-pixel dash noise.
- Unsupported endpoints and directed `no-route` results fail closed. There is
  no Haversine, OSRM, or other fallback ETA.
- Selecting the same building twice is an explicit non-route state. There is no
  outdoor walking route to estimate.

## Connector rendering

Approximate building-pin connectors render below the authoritative route at a
lighter 2 px / 56% opacity dash. The graph route uses the existing Room TBA
route language: an 8 px neutral casing beneath the 5 px maroon line. This keeps
access approximations visually subordinate while preserving route legibility
across roads, labels, and building fills.

## Audit and calibration

The original endpoint audit established the hard snap ceiling against junction
nodes. For a building whose legacy nearest node is already in the largest weak
component, correlation to the nearest point on that same canonical network can
only preserve or shorten the connector. A closer node or edge on a disconnected
island is deliberately ignored, so those exceptional endpoints can become
farther away and fail closed instead. The 250 m ceiling therefore remains an
absolute access-honesty policy, not an assumption that every connector improves.
Use the comparison audit to quantify the change and detect eligibility shifts:

```sh
bun scripts/building-edge-snap-audit.ts
bun scripts/building-edge-snap-audit.ts --json
```

`building-route-audit.ts` is deliberately the legacy nearest-node baseline used
to establish the endpoint policy; it is not a description of current runtime
correlation. `building-edge-snap-audit.ts` compares that baseline with the
current edge-based virtual endpoint behavior.

To evaluate the current selectable building records instead of the historical
fixture, point both audits at the public deployment:

```sh
bun scripts/building-route-audit.ts --from-api https://www.uplb.tools
bun scripts/building-edge-snap-audit.ts --from-api https://www.uplb.tools
```

Both audit outputs include SHA-256 fingerprints for the exact walk-graph bytes
and the normalized building records they consumed. Preserve those hashes with
any reported audit statistics so a later graph or building-pin change cannot be
mistaken for the same evidence run.

The real-campus baseline asserts the monotonic connector rule only for legacy
nearest-node endpoints that were already on the canonical main component. It
also checks that known off-campus teaching sites still fail closed and that New
Math → Physical Sciences joins connector and mapped geometry without a gap.

### Endpoint source-coverage gate

The routing endpoint fixture is **not** the runtime building source. The Map
Tools picker uses the application's current building data, while
`exports/deep-research/buildings.json` is a PostgreSQL research export dated
2026-07-13. That export has 52 building rows. A later checked-in landmark-image
manifest, generated from the public `/api/buildings`, contains 58 building
identities, so the 52-row fixture must not be described as current or exhaustive.

The currently exposed historical-fixture gap is:

- 4Boys House
- Old Agronomy Headhouse
- Old Makiling School
- Raymundo Gate
- Student Union Building
- UPLB Rural Economic Development and Renewable Energy Center (REDREC)

Run the deterministic checked-in comparison while developing:

```sh
bun scripts/building-route-source-coverage.ts
bun scripts/building-route-source-coverage.ts --json
```

The landmark-image manifest is only an **API-derived canary**, not routing
truth. Use a live reference when deciding whether the checked-in fixture itself
has caught up:

```sh
bun scripts/building-route-source-coverage.ts \
  --from-api https://www.uplb.tools \
  --strict
```

A failure here means only that the **checked-in historical fixture** does not
match current building identities. It does not invalidate a live audit that
directly consumed all current API rows. To claim current selectable-building
audit coverage, run the endpoint and edge-snap audits with `--from-api`, record
the returned building count and input fingerprints, and make sure the live API
payload itself passed the parser's non-empty, unique-id, and coordinate checks.

If the project later wants deterministic checked-in coverage for all current
buildings, refresh or deliberately re-source the routing audit input using
verified current records. Never manufacture coordinates from the manifest,
screenshots, names, or memory merely to make the counts match.

## Product boundaries

This feature does **not** route individual rooms, infer indoor corridors or
entrances, use live GPS, add waypoints, suggest jeepneys, or alter
Planner/Today/day-route behavior. Generic GPS/transit Directions and the
building router are mutually exclusive task modes.

## Offline behavior

The route core has no routing API dependency. Once the generated walk-graph
chunk is available in the browser, subsequent calculations are local. A cached
session can recalculate or swap a pair while offline. A first-time graph-cache
miss is surfaced as an unavailable/error state rather than replaced by an
approximation.

## QA

Feature-focused checks:

```sh
bun run test:routing
bunx vitest run \
  src/components/svelte/building-route/BuildingRoutePanel.component.test.ts \
  src/components/svelte/building-route/BuildingRouteMapOverlay.component.test.ts \
  src/components/svelte/controls/EntityDirectionsChip.component.test.ts \
  src/lib/focus-trap.component.test.ts
bun run e2e:advisory -- e2e/advisory/building-route.spec.ts
```

Before marking the PR ready, follow the repository-wide gate in
`docs/testing.md`:

```sh
bun run lint && bun run test:all && bun run build
bun run test:integration:live   # requires the E2E DB / preview environment
bun run e2e                     # blocking Playwright suite
```

Validate 320 px, 768 px, and desktop layouts. Visual QA should include New Math
→ Physical Sciences, a same-edge pair, a cross-campus pair, and a known
off-network endpoint.

Physical campus timing/path checks remain the final evidence for calibration.
Do not change `WALK_KPH` or endpoint ceilings merely to make an estimate look
closer to one anecdotal walk.
