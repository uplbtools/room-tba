/**
 * Auth reliability and staff security tables (auth audit items 12 to 20,
 * migrations 0061 to 0065). Server-only: none are synced to the client PGlite
 * cache. Kept beside schema.ts rather than in it so the account columns other
 * work adds to admin_users never collide with these.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { adminRoleEnum, adminUsersTable } from "./schema";

/** Discord/gateway delivery queue (0061). */
export const notificationOutboxTable = pgTable("notification_outbox", {
  id: bigserial({ mode: "number" }).primaryKey(),
  eventType: varchar("event_type", { length: 64 }).notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  event: jsonb().notNull(),
  /** `pending` | `sent` | `dead` */
  status: varchar({ length: 16 }).default("pending").notNull(),
  attempts: integer().default(0).notNull(),
  nextAttemptAt: timestamp("next_attempt_at", { mode: "string" })
    .defaultNow()
    .notNull(),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  sentAt: timestamp("sent_at", { mode: "string" }),
});

/** One row per outbound email attempt (0062). */
export const emailLogTable = pgTable("email_log", {
  id: bigserial({ mode: "number" }).primaryKey(),
  toAddress: text("to_address").notNull(),
  template: varchar({ length: 48 }).notNull(),
  /** `sent` | `failed` */
  status: varchar({ length: 16 }).notNull(),
  providerId: text("provider_id"),
  error: text(),
  idempotencyKey: text("idempotency_key"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

/** Scheduled job runs, one per job per period (0062). */
export const cronRunsTable = pgTable(
  "cron_runs",
  {
    job: varchar({ length: 64 }).notNull(),
    period: varchar({ length: 32 }).notNull(),
    /** `running` | `done` | `failed` */
    status: varchar({ length: 16 }).default("running").notNull(),
    detail: jsonb(),
    startedAt: timestamp("started_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    finishedAt: timestamp("finished_at", { mode: "string" }),
  },
  (table) => [primaryKey({ columns: [table.job, table.period] })],
);

/** Append-only account and review audit trail (0063). */
export const adminAuditLogTable = pgTable("admin_audit_log", {
  id: bigserial({ mode: "number" }).primaryKey(),
  actorUserId: integer("actor_user_id"),
  actorLabel: text("actor_label"),
  action: varchar({ length: 48 }).notNull(),
  targetUserId: integer("target_user_id"),
  targetLabel: text("target_label"),
  detail: jsonb(),
  ip: text(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

/** Staff 2FA and forced password change, keyed by user (0064). */
export const adminUserSecurityTable = pgTable("admin_user_security", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => adminUsersTable.id, { onDelete: "cascade" }),
  totpSecretEnc: text("totp_secret_enc"),
  totpEnabledAt: timestamp("totp_enabled_at", { mode: "string" }),
  totpLastStep: bigint("totp_last_step", { mode: "number" }),
  recoveryCodeHashes: jsonb("recovery_code_hashes")
    .$type<string[]>()
    .default(sql`'[]'::jsonb`)
    .notNull(),
  mustChangePassword: boolean("must_change_password").default(false).notNull(),
  mfaGraceUntil: timestamp("mfa_grace_until", { mode: "string" }),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

/** Email invites for new staff (0064). */
export const staffInvitesTable = pgTable("staff_invites", {
  id: bigserial({ mode: "number" }).primaryKey(),
  email: text().notNull(),
  displayName: varchar("display_name", { length: 100 }),
  role: adminRoleEnum().notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  invitedBy: integer("invited_by").references(() => adminUsersTable.id, {
    onDelete: "set null",
  }),
  expiresAt: timestamp("expires_at", { mode: "string" }).notNull(),
  acceptedAt: timestamp("accepted_at", { mode: "string" }),
  acceptedUserId: integer("accepted_user_id").references(
    () => adminUsersTable.id,
    { onDelete: "set null" },
  ),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

/** Email preferences; a missing row means both on (0065). */
export const notificationPreferencesTable = pgTable(
  "notification_preferences",
  {
    userId: integer("user_id")
      .primaryKey()
      .references(() => adminUsersTable.id, { onDelete: "cascade" }),
    digest: boolean().default(true).notNull(),
    reviewNotices: boolean("review_notices").default(true).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
);

/** In-app editor access requests (0065). */
export const editorAccessRequestsTable = pgTable("editor_access_requests", {
  id: bigserial({ mode: "number" }).primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => adminUsersTable.id, { onDelete: "cascade" }),
  message: text().notNull(),
  /** `pending` | `approved` | `declined` */
  status: varchar({ length: 16 }).default("pending").notNull(),
  decidedBy: integer("decided_by").references(() => adminUsersTable.id, {
    onDelete: "set null",
  }),
  decidedAt: timestamp("decided_at", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});
