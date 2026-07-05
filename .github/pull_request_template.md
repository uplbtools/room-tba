## Who are you?

- [ ] **Campus / data / QA only:** no code in this PR? Comment on the issue and skip the rest.
- [ ] **Developer:** code PR to `staging` ([CONTRIBUTING.md](CONTRIBUTING.md)).
- [ ] **Maintainer / agent:** full QA below plus issue hygiene for linked specs.

## Summary

<!, What changed and why (1–3 sentences)., >

**Linked issues:** Closes # / Refs #

## Developer checklist

- [ ] `bun test src`
- [ ] `bun run lint` (or Biome format on touched files)
- [ ] Linked issue commented with this PR URL
- [ ] **Heavy CI:** PR marked ready for review (or `run/e2e` label) before merge: integration + E2E are gated ([testing.md § Heavy CI gating](docs/testing.md#heavy-ci-gating-prs))

## QA Summary (code changes)

Automated:

- [ ] Biome format passed: `bunx biome format.` (PR CI)
- [ ] Unit tests passed: `bun test src` (PR CI)
- [ ] E2E + integration passed: mark PR ready or add `run/e2e` label ([testing.md](docs/testing.md#heavy-ci-gating-prs))
- [ ] Full lint passed (local): `bun run lint`
- [ ] Build passed (local): `bun run build` (needs `DATABASE_URL`; not run in PR CI)

If auth, routing, or schema changed:

- [ ] Admin redirects verified: `/admin`, `/admin/login`
- [ ] Migration applied on Supabase (if `drizzle/` changed)

If map chrome, editor, or side panel changed:

- [ ] Verified at 320px and/or 768px per [map-ui-mode-matrix.md](docs/map-ui-mode-matrix.md)
- [ ] Editor/login/drag-save flows (see [editor-foundation-test-plan.md](docs/editor-foundation-test-plan.md))

Known gaps:

- <!, Anything not tested and why, >

Follow-up:

- <!, Issues or PRs to file next, >

## Issues updated (maintainers / detailed specs)

- [ ] Linked issue(s) commented with this PR
- [ ] Acceptance criteria / paths updated on issue body ([issue-hygiene.md](docs/issue-hygiene.md))
- [ ] `Last verified against staging:` date set on linked issues

## Test plan

<!, Optional: steps a reviewer can run locally., >
