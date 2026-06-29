# Weekly volunteer triage ritual

A 30-minute weekly process to keep issues moving and volunteers unblocked.

## When
Every Monday at 09:00 UTC (or async if no one is online).

## Roles
- **Scribe:** rotates weekly; updates issue labels and writes a brief summary.
- **Driver:** the person with the most context on current sprint work.

## Agenda (30 min)

1. **Open issues review (10 min)**
   - Sort by `priority/high` then `priority/medium`.
   - Check issues untouched for >14 days; ping assignee or unassign.
   - Close stale `qa` issues that have been verified.

2. **PR queue (10 min)**
   - List open PRs targeting `staging`.
   - Identify blockers (missing reviews, CI failures, merge conflicts).
   - Assign reviewers or mark as `ready for review`.

3. **Sprint health (5 min)**
   - Count closed vs opened issues in the last 7 days.
   - Flag any `size/S` or `size/XS` issues that could be picked up by new volunteers.

4. **Action items (5 min)**
   - Scribe posts summary in `#dev` Discord channel.
   - Update project board columns if using GitHub Projects.

## Runbook

```sh
# Quick triage query
cd room-tba
gh issue list --state open --label "priority/high" --limit 20
gh issue list --state open --label "priority/medium" --limit 20
gh pr list --state open --base staging
```

## Resources
- [Issue hygiene](issue-hygiene.md)
- [Volunteer triage](volunteer-triage.md)
