# AI agent tooling (Cursor, Claude Code, Codex)

Cross-tool setup for token-efficient, low-slop agent sessions on Room TBA.

| Layer | Tool | What it fixes |
| --- | --- | --- |
| Talk | [Caveman](https://github.com/JuliusBrussee/caveman) | Verbose prose, recap paragraphs |
| Code | [Ponytail](https://github.com/DietrichGebert/ponytail) | Over-engineering, mystery deps |
| Memory | `AGENTS.md` + scoped `.cursor/rules/*.mdc` | Re-explaining the repo every chat |
| Workflow | `.cursor/skills/*` | Load detail only when relevant |

Repo ships Ponytail + agent contract rules. Caveman installs locally via `bun run install:agent-tooling` (skills land in `.agents/skills/`, gitignored).

---

## Already in this repo (clone = done)

| Path | Role |
| --- | --- |
| [AGENTS.md](../AGENTS.md) | Index + policies |
| [docs/agent-contract.md](agent-contract.md) | Human-readable contract |
| `.cursor/rules/agent-contract.mdc` | Output + process (always on in Cursor) |
| `.cursor/rules/ponytail.mdc` | YAGNI / smallest diff (always on in Cursor) |
| `.cursor/rules/caveman-default.mdc` | Caveman **full** activation (needs `install:agent-tooling`) |
| `.cursor/skills/agent-handoff/SKILL.md` | Epic handoff template |
| `.cursor/skills/ponytail-review/SKILL.md` | Over-engineering review (Cursor; mirrors plugin skill) |
| `.cursor/skills/hallmark/` | Anti-AI-slop UI skill ([Nutlope/hallmark](https://github.com/Nutlope/hallmark)); Room TBA overlay in `references/room-tba.md` |
| `.cursor/skills/impeccable/` | UI polish / critique / hooks on UI edits |
| `.cursor/rules/hallmark.mdc` | Hallmark gates on Svelte/CSS/Astro UI (scoped) |
| [CLAUDE.md](../CLAUDE.md) | Pointer for Claude Code / Codex |

---

## One-shot setup (maintainers)

```sh
bun run install:agent-tooling   # Cursor: Caveman skills → .agents/skills/
bun run install:agent-plugins   # Claude Code + Codex: ponytail + caveman plugins (user scope)
```

Restart Cursor after the first command.

### Shopped skills (aisles 1–4)

```sh
bun run install:shopped-skills
```

| Aisle | Skills | Scope |
| --- | --- | --- |
| 1 Workflow | `systematic-debugging`, `verification-before-completion`, `using-git-worktrees`, `finishing-a-development-branch` | project |
| 2 Stack | `playwright-best-practices`, `svelte-code-writer`, `svelte-core-bestpractices`, `web-design-guidelines` | project |
| 3 Anti-slop | `fuck-slop`, `context-canary`, `grill-me`, `junior-to-senior` | **global** (`~/.agents/skills/`) |
| 4 UI | `interface-kit` | project |

**Vendored in repo (no install):** `hallmark`, `impeccable` under `.cursor/skills/`. Rule: `.cursor/rules/hallmark.mdc` (map chrome, side panel, landing).

Project skills install to `.agents/skills/` (gitignored). Pin versions in committed `skills-lock.json`; teammates run `npx skills experimental_install` after `install:agent-tooling` to sync project skills from the lockfile.

**Triggers:** `grill-me` / `junior-to-senior` before big epics · `fuck-slop` on issue/PR prose · `web-design-guidelines` at 320px map QA · `interface-kit` only on UI sprints (pairs with Ponytail) · `hallmark audit <path>` before map chrome / sidebar redesigns · Impeccable hooks on direct UI file edits.

## Caveman (local install per clone)

Compresses **reply prose** (~50–65% fewer output tokens). Code blocks stay normal.

### Cursor

```sh
bun run install:agent-tooling
# or: npx skills add JuliusBrussee/caveman -a cursor
```

Skills install to `.agents/skills/` (per-clone, gitignored). `.cursor/rules/caveman-default.mdc` activates **full** mode in-repo.

Restart Cursor after first install.

| Level | When |
| --- | --- |
| `full` | Daily implement/debug (default) |
| `lite` | PR descriptions, issues for humans |
| off | Architecture debates needing nuance |

Say `stop caveman` or `normal mode` to revert mid-session.

### Claude Code

```sh
bun run install:agent-plugins
# or manually:
# /plugin marketplace add JuliusBrussee/caveman && /plugin install caveman@caveman
```

Or prefix prompts with `/caveman full`.

### Codex

```sh
bun run install:agent-plugins
# installs ponytail@ponytail and caveman@caveman (user scope)
```

Repo `CLAUDE.md` + `AGENTS.md` cover instruction-tier when plugins are off.

### Compress bloated context

If `AGENTS.md` or `CLAUDE.md` grows huge:

```sh
# In Claude Code with caveman plugin
/caveman-compress AGENTS.md
```

---

## Ponytail (in repo + plugins)

**Cursor:** `.cursor/rules/ponytail.mdc` + `.cursor/skills/ponytail-review/SKILL.md` — committed, no install.

**Claude Code / Codex (hooks + `/ponytail`, `/ponytail-review`):**

```sh
bun run install:agent-plugins
```

Manual Claude Code: `/plugin marketplace add DietrichGebert/ponytail` → `/plugin install ponytail@ponytail`

Manual Codex: `codex plugin marketplace add https://github.com/DietrichGebert/ponytail.git` → `codex plugin add ponytail@ponytail`

Review pass after a fat diff: `@ponytail-review` (plugins) or ask Cursor to use `ponytail-review` skill.

---

## Token tactics

**Input**

- Scoped rules (`alwaysApply: false` + globs) — see `map-layout.mdc`, `side-panel.mdc`
- New session + [handoff skill](../.cursor/skills/agent-handoff/SKILL.md) instead of endless thread
- Point at paths; don't paste 400-line dumps

**Output**

- Caveman `full` for chat; normal grammar for commits and PR bodies
- Agent contract bans recap menus and decorative diagrams

**Process**

- Same-PR tests (`AGENTS.md`)
- Agent runs `gh` / `vercel` — no dashboard handoffs

---

## Intensity dial (quick reference)

| Task | Caveman | Ponytail |
| --- | --- | --- |
| Bug fix / feature | `full` | on (rules) |
| PR / issue for humans | `lite` or off | on |
| Security / prod / irreversible | off | on (don't skip validation) |
| Post-implementation review | any | `@ponytail-review` |

---

## Upstream

- Caveman: https://github.com/JuliusBrussee/caveman
- Ponytail: https://github.com/DietrichGebert/ponytail
- Hallmark: https://github.com/Nutlope/hallmark (vendored at `.cursor/skills/hallmark/`)

Bump vendored `ponytail.mdc` when upstream ladder changes materially. Bump Hallmark by replacing `.cursor/skills/hallmark/` from upstream `skills/hallmark/`.
