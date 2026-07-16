# Contributor proposal QA

This is the repeatable QA record for [#255](https://github.com/uplbtools/room-tba/issues/255): contributor suggestions, editor review, and publication. It documents the behavior that currently ships and separates product follow-ups from regressions.

## Safety and prerequisites

- Run manual workflow checks only against staging with throwaway data. Never automate writes to production.
- Use one contributor account, one editor account, and a unique marker such as `QA-255-YYYYMMDD-<suffix>` in a safe text field (for example, room directions).
- Record the staging URL, deployment commit, identities/fixture labels, and proposal ID before reviewing.
- Withdraw pending test proposals or reject them after recording the result. Do not leave test data in a shared queue.

## Expected happy path

1. A signed-in contributor opens a live entity, selects **Suggest an edit**, changes a stable field, and submits.
2. The contributor sees the pending status. Signed-in pending suggestions are loaded from `/api/proposals/mine`; anonymous tracking relies on the stored proposal reference in that browser.
3. An editor opens **Editor tools** → **Review suggested edits**, verifies the before/after diff, and approves the marker's proposal.
4. The queue removes the approved proposal and the open entity reflects the published value without a hard reload.
5. Record review-notification delivery as **pass**, **fail**, or **not configured**. Notification delivery is infrastructure-dependent and is not a pass merely because the proposal was approved.

## Lifecycle checks

- Request changes with a non-empty note; verify the proposal becomes `needs_changes`.
- Revise the same open proposal; verify its ID remains stable, its patch changes, and no duplicate row is created.
- Withdraw an open proposal as its owner; verify it becomes `withdrawn`.
- Attempt withdrawal as another signed-in user; verify it is rejected with `403`.
- Cause an approval conflict by changing the live entity after submission; verify approval returns `409`, leaves the proposal open, and clears any review claim.

## Proposal rate limits ([#223](https://github.com/uplbtools/room-tba/issues/223))

`POST /api/proposals` and `POST /api/proposals/:id/withdraw` are rate-limited in [`src/lib/api/proposal-rate-limit.ts`](../src/lib/api/proposal-rate-limit.ts). Limits use an in-memory bucket **per serverless instance** (effective cap scales with cold-start fan-out; shared KV is deferred).

| Actor | Short window (10 min) | Daily window (24 h) |
| --- | --- | --- |
| Anonymous (by IP) | 8 submits | 40 submits |
| Signed-in (IP + user id) | 24 submits each | 40 per IP, 120 per user |
| Withdraw (IP + user when signed in) | 12 per 10 min | — |

- **429** response: JSON `{ "error": "Too many requests…" }` plus `Retry-After` (seconds).
- **Honeypot:** non-empty `_hp` body field returns **201** `{ "success": true }` without creating a row or sending Discord.
- **CI / E2E:** set `ASTRO_E2E_SKIP_LOGIN_RATE_LIMIT=1` to skip proposal limits (same flag as login rate-limit tests).

Manual check: from one browser session, submit nine anonymous suggestions within ten minutes; the ninth should fail with the rate-limit message.

## Scope and edge-case disposition

| Scenario | Expected behavior today | Coverage | Disposition / follow-up |
| --- | --- | --- | --- |
| New building, then rooms | A room must select a live building, unless rooms are bundled in the new-building proposal. | Manual + proposal service | Shipped; dependency graph/staging preview remain deferred. |
| Revise a pending suggestion | An open proposal is revised by its own `proposalId`; signed-in update proposals may also merge by entity and user. | Integration | Shipped. Anonymous cross-browser recovery is unsupported without a stored reference. |
| Multiple create proposals | Separate `create_*` suggestions do not merge merely because they share `entity_id = 0`; explicit `proposalId` revises one. | Service behavior | Shipped. |
| Withdraw / undo | Owners may withdraw `pending` or `needs_changes` suggestions. Post-approval correction is a new suggestion; editor history/revert is separate. | Integration + manual | Shipped withdrawal; post-approval revert: [#202](https://github.com/uplbtools/room-tba/issues/202). |
| Contributor attribution | Proposal rows retain submitter data; reader-visible attribution and profile/ledger experiences are separate. | Manual | [#308](https://github.com/uplbtools/room-tba/issues/308), [#310](https://github.com/uplbtools/room-tba/issues/310), [#450](https://github.com/uplbtools/room-tba/issues/450). |
| A: competing suggestions | Each remains separate; the first successful approval can make the other stale. | Integration/manual | Shipped. |
| B: published data changed | Approval returns `409`; proposal remains open for re-review. | Integration | Shipped. |
| C: duplicate create | Duplicate validation occurs during approval and returns `409`. | Manual | Shipped. |
| D: anonymous pin move | Anonymous suggestions require a display name and local stored reference. | Manual | Shipped within same browser. |
| E: contributor deletion | Deactivate/delete proposals are not a contributor v1 feature. | Manual | Won't fix v1. |
| F: spam / abuse | Short + daily IP limits, dual-key for signed-in users, honeypot no-op, withdraw cap. In-memory per serverless instance. | Integration + manual | Shipped ([#223](https://github.com/uplbtools/room-tba/issues/223)). Turnstile / shared KV deferred. |
| G: review notification failure | Notifications are fire-and-forget; record the configured staging result. | Manual | Ops/configuration follow-up if failed. |
| H: wrong approval | Editors publish a corrective change; no contributor undo control exists. | Manual | [#202](https://github.com/uplbtools/room-tba/issues/202). |
| I: request changes without note | The server rejects it. | Component/manual | Shipped. |
| J: entity merge after a suggestion | Merge remains an editor workflow. | Manual | Existing editor merge path. |
| K: contributor/editor race | A concurrent editor publish makes the contributor proposal stale; approval must not publish it. | Integration | Shipped. |
| L: create event image | Image URLs are validated when the proposal is approved. | Manual | [#191](https://github.com/uplbtools/room-tba/issues/191) for upload concerns. |

## Evidence template

```md
### #255 staging QA evidence

- Staging URL / deployment commit:
- Timestamp and timezone:
- Contributor and editor identities (or fixture labels):
- Proposal IDs / unique markers:
- Automated result: integration / Playwright commands and outcomes
- Manual submit → review diff → approve → refresh:
- Lifecycle result: revise / request changes / withdraw / unauthorized withdraw / conflict
- Notification result: pass / fail / not configured
- Screenshots or trace links:
- Cleanup: withdrawn or rejected proposal IDs and result
- Follow-ups or blockers:
```
