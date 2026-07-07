---
name: ponytail-review
description: >-
  Review diffs for over-engineering only — delete, stdlib, native, yagni, shrink.
  Use after a fat agent diff, before merge, or when user says ponytail-review,
  simplify review, what can we delete. Codex/Claude: use @ponytail-review plugin skill when installed.
---

# Ponytail review

Hunt complexity only. One line per finding: location, what to cut, what replaces it.

## Format

`path:L42: tag: finding. replacement.`

Tags: `delete:` | `stdlib:` | `native:` | `yagni:` | `shrink:`

End with: `net: -N lines possible.` or `Lean already. Ship.`

## Out of scope

Correctness, security, performance — normal review. Do not apply fixes; list only.

## Room TBA

Pair with [agent-contract](../../rules/agent-contract.mdc). Flag drive-by refactors and duplicate UI surfaces.

Upstream: https://github.com/DietrichGebert/ponytail — `skills/ponytail-review/SKILL.md`
