**Status:** spec — not started  
**Last verified against staging:** 2026-07-12
**Track:** Spec / epic (maintainer infra)

## Problem

The UPLB Tools Discord server ([discord.uplbtools.me](https://discord.uplbtools.me)) serves both **campus users** (questions, vibe) and **contributors** (dev, triage, shipping). We want an **agentic coding assistant** for contributors — not a student-facing “where is my room?” chatbot.

Maintainers already use agent docs in-repo (`AGENTS.md`, issue hygiene, test matrix). A Discord agent should extend that surface: issue context, code pointers, test drafts, triage help — in `#development` / `#contribution`.

## Scope

| In scope | Out of scope (v1) |
| --- | --- |
| Contributor-only coding agent via `@mention` | Free-response agent in `#lounge` or user help forums |
| Hermes model on a **VM** (Ollama or API) | Running LLM inference on Heroku |
| Read tools: GitHub issues/PRs, repo search, docs | Auto-merge PRs, prod DB access |
| Confirm-before-write for any GitHub mutation | User campus Q&A (`/room` stays a simple command) |

## Architecture

```
Discord (#development, @mention)
        ↓
Hermes Agent gateway (VM, always-on)
        ↓
Ollama + Hermes 3 (3B/8B — size to VM RAM) OR OpenRouter/Nous Portal fallback
        ↓
Tools: GitHub API, ripgrep/read_file on cloned org repos
```

**Optional (existing Heroku student plan):** lightweight webhook bot for `#github`, `#deploys`, `#ci-bot-logs` — no LLM. Can live in same VM later.

**Suggested repo:** `uplbtools/discord-bot` (new) or `uplbtools/hermes-gateway` — not inside `room-tba` app bundle.

## Discord channel policy

| Channel | Agent behavior |
| --- | --- |
| `#development` | `@mention` only; coding help, issue/PR context |
| `#contribution` | `@mention`; good-first-issue pointers, onboarding |
| `#agent-lab` (optional) | Sandbox; can enable free-response for experiments |
| `#lounge`, `room-tba-help`, `gradesim-help` | **No agent** — humans + simple slash commands only |

Hermes Agent settings (or equivalent):

- `DISCORD_REQUIRE_MENTION=true` globally
- `DISCORD_FREE_RESPONSE_CHANNELS` = `#agent-lab` only (if created)
- `group_sessions_per_user: true` in shared channels
- `DISCORD_ALLOWED_USERS` — maintainers/trusted contributors first; expand gradually

Pin in `#contribution`:

> Tag the bot for issue context, code pointers, and test drafts. It does not commit code for you.

## VM setup

- Clone org repos under e.g. `/srv/uplbtools/room-tba` (cron or webhook `git pull` on `staging`)
- Ollama: `hermes3:8b` or `hermes3:3b` depending on RAM
- Hermes Agent with Discord gateway + model pointed at local Ollama
- Optional API fallback when VM/Ollama is down (OpenRouter / Nous Portal)

**RAM guide:** 3B ≈ 4–6 GB; 8B ≈ 8–12 GB.

## Tools (phased)

### Phase 1 — read-only (ship first)

- [ ] `github_issue(number)` — `gh`-equivalent via GitHub API
- [ ] `github_search_issues(query)` — org/repo scoped
- [ ] `github_pr(number)` / `list_open_prs(base: staging)`
- [ ] `search_repo(query)` — ripgrep over cloned repos
- [ ] `read_file(path)` — deny `.env`, secrets, paths outside repo roots

### Phase 2 — guarded writes & ops

- [ ] `draft_github_issue(...)` — returns preview; **Confirm / Cancel** button before create
- [ ] `fetch_ci_status(pr)` — link/summary from GitHub Checks API
- [ ] Scheduled Monday triage draft → `#development` (reuse [volunteer-triage.md](docs/volunteer-triage.md) queries)

### Phase 3 — optional

- [ ] `run_tests(path?)` — sandboxed, timeout, contributor-only channel
- [ ] RAG over `AGENTS.md`, `docs/issue-test-matrix.md`, `CONTRIBUTING.md`

## Security

- Never read or log `DATABASE_URL`, `ADMIN_*`, AMIS tokens, or `#secrets` content
- No instructor/PII from AMIS in agent context
- Tool execution scoped to cloned repos + public GitHub API
- Audit notable actions in `#admin-logs` (issue created, test run requested)

## Acceptance criteria

- [ ] VM runs Hermes Agent (or equivalent) with Discord bot connected 24/7
- [ ] Bot responds in `#development` only when `@mentioned` (except optional `#agent-lab`)
- [ ] Phase 1 read tools work against `uplbtools/room-tba` (issue view, repo search, file read)
- [ ] Agent refuses to run in user-facing help forums / `#lounge`
- [ ] `DISCORD_ALLOWED_USERS` documented; maintainer allowlist configured for v1
- [ ] README in bot repo: env vars, deploy, channel IDs, model choice, fallback API
- [ ] Pin/post contributor usage note in `#contribution`

## Tests (required in implementation PR)

- [ ] Unit: tool handlers (GitHub mock, path denylist for `read_file`)
- [ ] Manual: `@mention` in `#development` with real issue number; verify repo search returns expected path
- [ ] Manual: confirm write path shows Confirm button and does not create issue on Cancel

## Related

- #217 — volunteer onboarding epic (Discord as first contact; this issue is **contributor upgrade** tooling)
- [docs/volunteer-triage.md](docs/volunteer-triage.md) — Monday scribe queries (Phase 2)
- [AGENTS.md](AGENTS.md) — agent policy the coding bot should respect
- Discord redirect: `astro.config.mjs` → `https://discord.uplbtools.me`

## Open decisions

1. New repo name: `discord-bot` vs `hermes-gateway`?
2. Hermes 3 3B vs 8B on available VM RAM?
3. Keep Heroku for webhooks only, or consolidate all bot traffic on VM?