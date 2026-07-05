---
name: no-ai-slop
description: Louis Rossmann anti-AI-slop rules for prose (README, docs, MDX, PRs, blog). From realrossmanngroup/no_ai_slop_writing_rules. Use when writing or editing any user-facing text. Not for code generation.
---

# No AI slop (Rossmann)

Upstream: https://github.com/realrossmanngroup/no_ai_slop_writing_rules

Read `.cursor/rules/no-ai-slop.mdc` before drafting prose.

## Quick WRONG → RIGHT

| Slop | Fix |
|------|-----|
| "This significantly impacted users." | "Apple replaced 11 million batteries in 2018." |
| "Furthermore, the policy was robust." | "The FTC voted 5-0 in July 2021 to enforce repair restrictions." |
| "The Hidden Cost of Repair Bans" | "Economic impact of manufacturer repair restrictions" |
| "It's important to note that…" | Start on the fact. |
| "Not just a tool — a paradigm shift" | State what actually changed, with evidence. |

## When to apply

- README, CONTRIBUTING, docs, MDX articles, PR/issue bodies, marketing copy
- Before publishing agent-drafted prose

## When to skip

- Source code, types, configs, SQL
- One-line commit messages (unless they're essays)

## With other rules

- `eductools` `writing-tone.mdc` and this rule align: specific, cited, no glaze.
- Run a self-check pass after drafting; fix banned patterns before handing text back.
