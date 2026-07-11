Parent: #451

**Status:** proposed  
**Last verified against staging:** 2026-07-12

## Problem

Playwright CI runs Chromium only. Map chrome at **320px / 768px**, iOS Safari, and PWA install flows need real-device coverage that local automation does not provide.

## Goal

Claim the GitHub Student Pack **BrowserStack** offer and establish a documented manual/advisory QA workflow on staging — without blocking PR CI.

## Implementation pointers

- Claim offer at [education.github.com/pack](https://education.github.com/pack); store credentials in team secret manager (1Password)
- Document smoke checklist in `docs/testing.md` § Manual only
- Target flows aligned with existing E2E specs:
  - `e2e/smoke/boot.spec.ts` — bootstrap, map canvas, dismiss landing modal
  - `e2e/browse/search-flow.spec.ts` — search, side panel
  - Side panel parity at 320px / 768px
  - PWA add-to-home (manual steps)
- Run against `staging.room-tba.uplbtools.me` after integration deploys
- **Optional follow-up:** advisory GitHub Actions job using BrowserStack Automate / Playwright connect — non-blocking like `e2e-advisory.yml`

## Acceptance criteria

- [ ] BrowserStack Student Pack offer claimed
- [ ] Manual QA matrix documented with browsers/devices to test (minimum: iOS Safari + one Android Chrome)
- [ ] Credentials documented as stored off-repo (not in git)
- [ ] At least one maintainer run recorded in issue comment (date + browsers + pass/fail notes)
- [ ] `docs/testing.md` links matrix from Playwright section as supplemental coverage

## Tests (required in implementation PR)

- [ ] Docs-only PR acceptable if matrix + credential runbook ship first
- [ ] Manual only: execute matrix on staging; note results in PR or issue comment

## Coordination

- Parent #451: if LambdaTest (#454) is chosen as primary cloud instead, close this as deferred and note rationale in comment