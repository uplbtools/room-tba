# Agent contract

Portable expectations for AI coding agents on Room TBA. Enforced in repo via `.cursor/rules/agent-contract.mdc` and `.cursor/rules/ponytail.mdc`.

**Humans:** skim this once. **Agents:** follow it every turn.

## Default mode

Implement, don't narrate. Bias toward action when the path is discoverable in the repo.

## Output

| Do | Don't |
| --- | --- |
| Short, precise answers | Intros, recaps, "happy to help" |
| Proportional length to task size | Essay for a one-line fix |
| `startLine:endLine:path` for code refs | Stringing identifiers in prose |
| One-line blocker when stuck | "Want me to…?" menus |

## Code

- Smallest correct diff; reuse existing helpers and patterns
- No unrequested abstractions, deps, or refactors
- Regression tests for bugs; skip tests that only mirror implementation
- Room TBA editor UX: calm UI, no overflow at 320px, no duplicate toasts (see `AGENTS.md`)

## Process

1. Open `AGENTS.md` doc map → read the linked doc for your task
2. Issue-linked work: update issue AC in the same PR
3. Verify per change size (`AGENTS.md` § Verify before done)
4. Hand off long epics with a structured prompt (see `.cursor/skills/agent-handoff/SKILL.md`)

## Related

- [docs/agent-tooling.md](agent-tooling.md) — Caveman, Ponytail, Cursor / Claude / Codex setup
- [AGENTS.md](../AGENTS.md) — repo policies, branches, ship pipeline
