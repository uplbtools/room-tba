# Vercel Open Source Program — application prep

Findings from a verified multi-source research pass (2026-08-03) plus the repo
work done for readiness. Owner: maintainer. Goal: apply in the next window.

## Why we fit (research-backed)

- **Stars are not a criterion.** The application form (Typeform `oQ2C4mve`,
  reached via vercel.link/oss-apply) never asks for a star count. Its traction
  question: "Please provide evidence of active development. (e.g., recent
  commits, releases, signup numbers)" — usage numbers are explicitly sanctioned.
- **End-user apps get in every cohort.** Five cohorts so far (Spring 2025 to
  Spring 2026, ~139 projects); each included end-user apps (Rallly, Zoonk,
  KanaDojo, Workout Cool, KDE Connect). Fall 2025 was roughly a third end-user
  apps.
- **Low-star precedents:** Gitvizz (100+ stars, 200+ active users),
  YourDigitalRights.org (~121 stars), KanaDojo (student-facing learning app, no
  star count cited, impact framed as "growing global user base"). Vercel's own
  cohort posts describe end-user apps by usage, not stars (Answer Overflow:
  1.5M MAU; Vecto3d: 40k site visits; Triplex: "a few hundred people each week").
- **Eligibility is structural:** fully open source and staying so, hosted (or
  intending to host) on Vercel for the program duration, Code of Conduct,
  credits used only for the project, Vercel Team ID supplied. We satisfy all
  of these today.
- FAQ: "Can I apply if my project is just starting? Absolutely — projects at
  all stages."

## Process logistics

- Windows are announced on the Vercel Community forum by staff (Amy Egan);
  Spring 2026 opened 2026-05-20, cohort announced 2026-06-29. Windows are
  short (~1.5 weeks) and recur roughly every 3 months. **Watch the forum;
  applications reopen around August 2026.**
- One staffer personally reads applications. The impact question is
  open-ended, ~1000 characters. Grant: $3,600 platform credits for 12 months +
  OSS starter pack; projects graduate after a year.
- No public record of rejections or concrete selection rubric exists, so odds
  beyond eligibility are unquantified.

## Our application skeleton (fill numbers at submit time)

- **What it is:** open-source campus map + class finder for UPLB (~12k
  students); rooms, schedules, walking routes, offline PWA.
- **Traction (usage, not stars):** ~21k page views/30d measured off-term
  (July 2026, Vercel Analytics; term-time peaks land in enlistment weeks),
  20 contributors, 30+ releases, 94k+ class sections across 9 terms,
  58 buildings, CC-BY open campus data.
- **Growth:** fork-for-your-campus guide, UP Diliman port in progress,
  template for other PH universities.
- **Why credits matter:** donation-funded student project; credits directly
  cover the Vercel bill (see docs/funding-model.md).
- Already hosted on Vercel (SSR + API routes + ISR). Team ID: from the Vercel
  dashboard at submit time.

## Readiness work landed (2026-08-03)

- README "By the numbers" + SECURITY.md + Messenger link (this PR)
- Org profile at github.com/uplbtools (uplbtools/.github)
- Repo topics fixed (astro/vercel/philippines/open-data/university)
- Repo Discussions enabled; org Discussions needs one click in org settings
- Still open: publish the UPD fork under the org, term-time usage numbers,
  infra costs in docs/funding-model.md
