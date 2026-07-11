Parent: #451

**Status:** proposed  
**Last verified against staging:** 2026-07-12

## Problem

Same cross-browser gap as BrowserStack (#453). The Student Pack includes **both** BrowserStack and LambdaTest — Room TBA should evaluate LambdaTest and either adopt it as the primary cloud or explicitly defer it.

## Goal

Claim the LambdaTest Student Pack offer, run the same staging smoke matrix as #453, and document a **vendor decision** so maintainers are not paying duplicate process cost for two clouds forever.

## Implementation pointers

- Claim offer at [education.github.com/pack](https://education.github.com/pack)
- Reuse smoke paths from parent #451 / sibling #453 (map boot, search, side panel 320/768, PWA)
- Compare: Playwright grid support, device list, quota, HyperExecute vs Automate ergonomics
- **Optional:** advisory CI workflow (non-blocking) with minimal smoke subset — only after manual matrix passes
- Credentials in team secret manager only

## Acceptance criteria

- [ ] LambdaTest Student Pack offer claimed (or documented as skipped if BrowserStack chosen first)
- [ ] Same manual smoke matrix executed on LambdaTest against staging OR documented skip with reason
- [ ] Issue comment on #451 records decision: **BrowserStack primary**, **LambdaTest primary**, or **manual-only Playwright for now**
- [ ] If LambdaTest is primary: update `docs/testing.md`; defer/close #453 with cross-link
- [ ] If BrowserStack is primary: close this issue as deferred with cross-link to #453

## Tests (required in implementation PR)

- [ ] Docs + decision comment minimum
- [ ] Optional advisory workflow: must not block merge (same policy as `e2e-advisory.yml`)
- [ ] Manual only: staging smoke on LambdaTest real device/browser

## Non-goals

- Running BrowserStack and LambdaTest in CI permanently
- Replacing local Playwright blocking suite