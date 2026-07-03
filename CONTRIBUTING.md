# Contributing to Room TBA

Thanks for helping UPLB students find rooms. You do **not** need to clone this repo unless you are writing code.

**Start here:** pick the path that fits you.

| Path                                                                                                         | Who               | What to do                              | Open a PR? |
| ------------------------------------------------------------------------------------------------------------ | ----------------- | --------------------------------------- | ---------- |
| [Report wrong data](#report-wrong-data)                                                                      | Anyone on campus  | File a data issue or use in-app suggest | No         |
| [Campus QA](#campus-qa)                                                                                      | Testers           | Verify the app on your phone            | No         |
| [Developers](#developers-no-ai-required)                                                                     | Coders            | Branch, code, PR to `staging`           | Yes        |
| [Good first issues](https://github.com/uplbtools/room-tba/issues?q=is%3Aopen+label%3A%22good+first+issue%22) | New devs          | Smaller coding tasks                    | Yes        |
| [Maintainers / AI agents](#maintainers-and-agents)                                                           | Core team, Cursor | See [AGENTS.md](AGENTS.md)              | Yes        |

**Community:** [Discord](https://discord.uplbtools.me) · [Messenger (contribute)](https://messenger.uplbtools.me/contribute) · [UPLB Tools](https://uplbtools.me)

---

## Report wrong data

Use this when a schedule, pin, direction, or building name is wrong.

1. **In the app:** open the room or building → **Suggest an edit** (if you have contributor access).
2. **On GitHub:** [New data correction issue](https://github.com/uplbtools/room-tba/issues/new?template=data_correction.yml).
3. **Chat:** [Discord](https://discord.uplbtools.me) or [Messenger](https://messenger.uplbtools.me/contribute) if GitHub is awkward.

Include:

- Room or building name (e.g. PSLH 1, PhySci)
- Term, if it is schedule-related
- What is wrong and what it should be
- How you verified (walked there, SAIS, org page, photo)

**You do not need to open a pull request.** Someone else will ship the fix and reply on the issue.

---

## Campus QA

Use this when you can test the live or staging app on a real device.

1. [New campus QA issue](https://github.com/uplbtools/room-tba/issues/new?template=campus_qa.yml)
2. Label `qa` is applied automatically.

Helpful checks: search a room you know, open schedules for the current term, try offline mode after loading once, check layout at narrow phone width.

**No PR required.** Describe what you saw. A developer will fix it from your report.

---

## Developers (no AI required)

You can contribute code without using Cursor, agents, or [AGENTS.md](AGENTS.md).

### Setup

1. Install [Bun](https://bun.sh) 1.3+
2. Clone the repo, copy [`.env.example`](.env.example) to `.env`
3. Set `DATABASE_URL` (Supabase Postgres; session pooler recommended for local dev)
4. Optional: `ADMIN_PASSWORD` for editor login locally

```sh
bun install
bun dev
```

Open http://localhost:4321. More setup help: [docs/developer-guide.md](docs/developer-guide.md).

### Workflow

1. Find or file an issue ([coding task template](https://github.com/uplbtools/room-tba/issues/new?template=coding_task.yml) or [good first issue](https://github.com/uplbtools/room-tba/issues?q=is%3Aopen+label%3A%22good+first+issue%22)).
2. Branch off **`staging`** (not `main`).
3. Make your change.
4. Before opening a PR:
   - `bun test src`
   - `bun run lint` (or `bunx biome format` on files you touched)
   - `bun run build` for substantive changes (needs `DATABASE_URL`)
5. Open a PR to **`staging`**. Use the PR template checkboxes.
6. Use [Conventional Commits](https://www.conventionalcommits.org/) in commit messages (`fix(map): …`, `feat(api): …`).

**Production:** features merge to `staging` first. Release to production is a separate **`staging` → `main`** PR (maintainers).

### Picking up a campus issue

If someone filed a `data` or `qa` issue without code:

1. Comment that you are working on it
2. Implement the fix
3. Open a PR to `staging` and link the issue (`Closes #NNN`)
4. Thank the reporter in the issue when merged

### Optional (map / editor PRs only)

- [docs/editor-foundation-test-plan.md](docs/editor-foundation-test-plan.md)
- [docs/agentic-qa-process.md](docs/agentic-qa-process.md)

---

## Maintainers and agents

[AGENTS.md](AGENTS.md) is for AI assistants and maintainers who ship quickly across many files. **Human developers do not need to read it.**

Includes: branch rules, issue hygiene for detailed specs, Cursor workflow skill, map chrome guardrails, [agent tooling](docs/agent-tooling.md) (Caveman + Ponytail).

**One-time agent setup (maintainers):** `bun run install:agent-tooling` then `bun run install:agent-plugins` — see [agent tooling](docs/agent-tooling.md).

**Maintainer chat:** [Discord](https://discord.uplbtools.me) · [Messenger (maintain)](https://messenger.uplbtools.me/maintain)

---

## Volunteer triage

Running Discord triage or weekly issue review? See [docs/volunteer-triage.md](docs/volunteer-triage.md).

---

## Code of conduct

Be helpful to students. Do not commit secrets (`.env`, passwords). Campus data fixes should be verifiable when possible.
