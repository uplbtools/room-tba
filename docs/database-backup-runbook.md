# Production database backup runbook

Parent: [#281](https://github.com/uplbtools/room-tba/issues/281). Staging mirror (not a backup): [#289](https://github.com/uplbtools/room-tba/issues/289).

Room TBA runtime data lives in **Supabase Postgres** (`DATABASE_URL` on Vercel production). Nightly dumps complement Supabase dashboard backups; they are restorable snapshots of the `public` schema (rooms, buildings, classes, proposals, editor history, sync metadata, and related tables).

## Schedule and workflow

| Item | Value |
| --- | --- |
| Workflow | [`.github/workflows/backup.yml`](../.github/workflows/backup.yml) |
| Cron | 02:00 UTC daily |
| Manual run | GitHub Actions → **Database backup** → **Run workflow** |
| Source DB | Production only via Actions secret `PROD_DATABASE_URL` (session pooler; project `ccdqtmscmnixjbynwdvb`) |
| Client | `pg_dump` from `postgres:17-alpine` (Supabase runs Postgres 17) |

## Where backups live

| Tier | Location | Retention | Access |
| --- | --- | --- | --- |
| Short | GitHub Actions artifact `db-backup-<run_id>` | 7 days | GitHub org collaborators with Actions read |
| Long | Cloudflare R2 `db-backups/room-tba-*.dump` (prefix overridable via repo variable `R2_BACKUP_PREFIX`) | 90 days (set R2 lifecycle rule in Cloudflare dashboard) | Maintainers with R2 API keys |

Artifacts include both `.dump` (custom format, preferred for restore) and `.sql` (plain SQL). R2 stores the `.dump` only.

**Do not** commit dumps to git (size + secrets in connection metadata).

## GitHub Actions secrets

| Secret | Purpose |
| --- | --- |
| `PROD_DATABASE_URL` | Prod Supabase session pooler URL for `pg_dump` |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | Long-term upload (same bucket as image uploads; different key prefix) |
| `DISCORD_CI_WEBHOOK_URL` | Failure alerts via [`.github/workflows/discord-notify-backup.yml`](../.github/workflows/discord-notify-backup.yml) |

R2 upload skips cleanly when R2 secrets are unset; short-term artifacts still upload.

## Download a backup

### From GitHub Actions (last 7 days)

1. Open **Actions** → **Database backup** → latest green run.
2. Under **Artifacts**, download `db-backup-<run_id>` (zip with `.dump` and `.sql`).
3. Unzip; use the `.dump` file for restore.

### From R2 (older than 7 days)

1. Cloudflare dashboard → R2 → bucket (`R2_BUCKET_NAME`) → prefix `db-backups/`.
2. Download `room-tba-YYYYMMDD-HHMMSS.dump`.

## Restore to a throwaway database

Use **Postgres 17** client tools (`pg_restore` version must match or exceed the server major version).

### Local Podman/Docker

```sh
podman run -d --name pg-restore-test \
  -e POSTGRES_PASSWORD=dev \
  -p 5433:5432 \
  postgres:17-alpine

export TARGET_URL="postgresql://postgres:dev@localhost:5433/postgres"
pg_restore --verbose --no-owner --no-acl -d "$TARGET_URL" room-tba-YYYYMMDD-HHMMSS.dump
```

### Restore to staging Supabase (maintainers only)

Point `TARGET_URL` at an isolated staging project (see [#289](https://github.com/uplbtools/room-tba/issues/289)). **Never** restore over production unless executing a deliberate disaster recovery with a written rollback plan.

## Verify after restore

```sql
SELECT 'rooms' AS tbl, COUNT(*) FROM rooms
UNION ALL SELECT 'buildings', COUNT(*) FROM buildings
UNION ALL SELECT 'classes', COUNT(*) FROM classes
UNION ALL SELECT 'edit_proposals', COUNT(*) FROM edit_proposals
UNION ALL SELECT 'editor_history', COUNT(*) FROM editor_history;
```

Compare counts to production (read-only query on prod). Spot-check one building slug and one room code in the restored DB.

Log the verification date on [#281](https://github.com/uplbtools/room-tba/issues/281) when completing the formal restore test.

## Supabase-native backups vs repo dumps

| Mechanism | Use when |
| --- | --- |
| Supabase dashboard backup / PITR (plan-dependent) | Fast point-in-time recovery inside Supabase |
| Repo nightly `pg_dump` | Portable restore to local Postgres, alternate Supabase project, or audit snapshot outside Supabase UI |

## Failure handling

1. Check the failed **Database backup** run log (`PROD_DATABASE_URL` missing, `pg_dump` auth, or R2 upload).
2. Discord posts to the CI webhook channel when `DISCORD_CI_WEBHOOK_URL` is set.
3. Re-run via **workflow_dispatch** after fixing secrets or connectivity.
4. If the nightly job missed a day, use the newest R2 object or Supabase dashboard backup for recovery.

## Non-goals (v1)

- In-app point-in-time recovery UI.
- Backing up PGlite browser cache (client-only; re-syncs from server).
- Storing dumps in git.
