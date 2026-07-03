---
name: contributor-proposals
description: Implements and debugs Room TBA contributor edit proposals (suggest an edit, review queue, approve/reject, create proposals). Use when working on edit_proposals, proposal-service, Suggest an edit UI, admin review routes, proposal edge cases, or issue #208/#255/#222.
---

# Contributor proposals

Policy and architecture: [AGENTS.md](../../AGENTS.md). Edge cases: [docs/issue-test-matrix.md](../../docs/issue-test-matrix.md) and GitHub [#255](https://github.com/uplbtools/room-tba/issues/255).

## Mental model

```text
Contributor edits in map app → pending edit_proposals row → editor review → approve publishes live data
```

- **Suggest** never writes published entity rows until **approve**.
- **Direct publish** is editor/admin only (session + `/api/admin/*`).
- No separate admin dashboard; review lives in the main app (shield menu).

## Key paths

| Layer | Path |
| --- | --- |
| Service | `src/lib/services/proposal-service.ts` |
| Public API | `src/pages/api/proposals/index.ts` |
| Admin review | `src/pages/api/admin/proposals/` |
| Client helpers | `src/lib/proposals/client.ts` |
| UI | `RoomResult.svelte`, `BuildingResult.svelte`, `SuggestAdditionPanel.svelte`, `ProposalReviewPanel.svelte` |
| Schema | `drizzle/schema.ts` (`edit_proposals`), `drizzle/0005_add_edit_proposals.sql` |
| Notifications | `src/lib/notifications/proposal-events.ts` (see [discord-notifications](../discord-notifications/SKILL.md)) |

## Proposal statuses

| Status | Meaning |
| --- | --- |
| `pending` | Awaiting editor |
| `needs_changes` | Editor sent back with note; contributor may revise |
| `approved` | Published (or failed publish rolled back to prior status) |
| `rejected` | Closed |

## Submit flow

1. Contributor opens entity panel → **Suggest an edit** (or **Suggest addition** for `create_*` types).
2. `POST /api/proposals` → `submitProposal()` creates or **merges** an open proposal (same entity + submitter).
3. Fire-and-forget `proposal.submitted` → Discord `#contributors`.

Anonymous: requires `submitterName`; tracks proposal via `localStorage` (`room-tba-proposal-refs`).

## Review flow

Editors use shield menu → review queue:

| Action | API | On success |
| --- | --- | --- |
| Approve | `POST /api/admin/proposals/[id]/approve` | Atomic publish + `editor_history` + sync key bump + `proposal.reviewed` |
| Reject | `.../reject` | Status rejected + optional note + `proposal.reviewed` |
| Request changes | `.../request-changes` | Status needs_changes + **required** note + `proposal.reviewed` |

**409 on approve:** live data changed; proposal stays open; **no** `proposal.reviewed` event.

## Create proposals (`create_building`, `create_room`, …)

- `entity_id = 0`, `base_version = 0`.
- Approved → `applyProposalPatch()` calls `createBuilding`, `createRoom`, etc. in `admin-service.ts`.
- **Gap (v1 UX):** new building pending → room create form explains the wait and requires a live building picker ([#255](https://github.com/uplbtools/room-tba/issues/255)). Bundled building+rooms and dependency graph are follow-ups.

## Known edge cases (check before closing issues)

- Revise pending: merge patch if same submitter + open status; anonymous needs same browser/`proposalId`.
- Multiple pending `create_*` from one logged-in user may collide on `(entity_type, entity_id=0)` — fixed: create merges only via explicit `proposalId` ([#255](https://github.com/uplbtools/room-tba/issues/255) PR pending).
- No **withdraw** API yet.
- Contributor credit on approve: proposal row only today; ledger is [#450](https://github.com/uplbtools/room-tba/issues/450).

## Tests (same PR as code)

| Change | Test |
| --- | --- |
| Service logic | `integration/services/proposals.integration.test.ts` |
| Approve 409 | integration stale-version test |
| UI flow | `e2e/admin/proposals.spec.ts` (partial; expand when stable) |
| Notifications | `src/lib/notifications/proposal-events.test.ts` |

## Verification

```sh
bun test src/lib/notifications/proposal-events.test.ts
bun run test:integration   # when proposal-service or admin routes change
```

Manual: suggest edit on staging → pending in queue → approve → live map updates; Discord submit + reviewed embeds in `#contributors`.
