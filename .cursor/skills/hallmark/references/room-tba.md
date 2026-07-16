# Room TBA — Hallmark overlay

Read this before `audit`, `redesign`, or component work on map chrome, side panel, landing, or editor surfaces.

## Genre

**Product UI** (campus map tool), not a marketing landing. Default Hallmark page macrostructures (hero → 3-feature → CTA) do not apply. Use **component-scope** flow for single controls (chips, flyouts, pins, modals).

## Co-installed skills

| Skill | When |
| --- | --- |
| **Hallmark** | Slop-test gates, audit punch lists, anti-default typography/motion |
| **Impeccable** (`.cursor/skills/impeccable/`) | Polish, critique, layout, tokens; hooks on UI edits |
| **interface-kit** (`.agents/skills/`) | Sprint-level component patterns |

Hallmark audits; Impeccable polishes. Do not run both full-page flows on the same surface in one pass.

## Non-negotiables (override Hallmark defaults)

From [AGENTS.md](../../../AGENTS.md) editor UX + [map-layout.mdc](../../rules/map-layout.mdc):

- **Calm UI:** no pulsing dots, blinking badges, glow rings, bounce gimmicks. Motion only for real state (save spinner, panel open).
- **No hover scale** on map chrome buttons, flyouts, or toolbar controls. Border/background shift is enough.
- **320px + 768px:** verify map chrome, browse chips, side panel header rows. Browse-chip row clips past ~5 chips; wide controls get their own row.
- **One feedback surface:** if the editor toolbar shows state, no duplicate toast.
- **Entry zones only** for map chrome; no new fixed overlays in `Map.svelte` except pins and edit dock.
- **Brand locked:** UPLB maroon (`hsl(5, 53%, 32%)` family) is identity. Hallmark theme rotation does not apply; preserve existing tokens in `src/styles/`.

## Uppercase labels

Many map labels use `text-transform: uppercase` for compact chrome (legend keys, section eyebrows in side panel). **Do not bulk-remove** without a scoped redesign. Hallmark gate 12 applies to marketing eyebrows, not every 11px map legend key.

## Pin / map marker scale

Hover scale on **map pins** (events, entities, route stops) is functional emphasis on a canvas, not button chrome. Allowed when tied to focus/hover on the pin itself; not on adjacent toolbar buttons.

## Audit targets (priority order)

1. `src/components/svelte/map-chrome/` + `map-chrome.css`
2. `src/components/svelte/navigation/Sidebar.svelte`
3. `src/components/svelte/Entry.svelte` + landing splash
4. `src/components/svelte/search/`
5. `src/components/svelte/controls/entity-detail.css` + Room/Building/Dorm results

## Commands

```
hallmark audit src/components/svelte/map-chrome
hallmark audit src/components/svelte/navigation/Sidebar.svelte
hallmark redesign <target>   # in-place only; confirm before deleting files
```

Report findings ranked; implement P0–P1 in the same PR when the user asked to apply fixes.
