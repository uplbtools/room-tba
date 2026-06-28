## Summary

<!-- What changed and why (1–3 sentences). -->

## QA Summary

Automated:

- [ ] Prettier passed: `bunx prettier --check .` (PR CI)
- [ ] Unit tests passed: `bun test src` (PR CI)
- [ ] Full lint passed (local): `bun run lint`
- [ ] Build passed (local): `bun run build` — requires `DATABASE_URL`; not run in PR CI
- [ ] Admin redirects verified (if auth/routing touched): `/admin`, `/admin/login`
- [ ] Migration applied on Supabase (if `drizzle/` changed)

Manual browser (if map chrome, editor, or side panel changed):

- [ ] Verified at 320px and/or 768px per [map-ui-mode-matrix.md](docs/map-ui-mode-matrix.md)
- [ ] Editor/login/drag-save flows (see [editor-foundation-test-plan.md](docs/editor-foundation-test-plan.md))

Known gaps:

- <!-- Anything not tested and why -->

Follow-up:

- <!-- Issues or PRs to file next -->

## Test plan

<!-- Optional: steps a reviewer can run locally. -->
