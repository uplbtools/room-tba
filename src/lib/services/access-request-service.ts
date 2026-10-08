import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { editorAccessRequestsTable } from "@drizzle/auth-ops-schema";
import { adminUsersTable } from "@drizzle/schema";
import { db } from "@lib/db";
import type { SessionUser } from "@lib/admin/auth";
import { isResendConfigured, sendEmail } from "@lib/email/resend";
import { enqueueNotification } from "@lib/notifications/outbox";
import type { AccessRequestedPayload } from "@lib/notifications/types";
import { afterResponse } from "@lib/server/after-response";
import {
  AccountActionError,
  updateManagedUser,
} from "@lib/services/admin-user-service";
import { SITE_URL } from "@lib/site";

/**
 * In-app "Request editor access" (auth audit item 15), replacing the
 * Messenger link: the request is stored, admins hear about it on Discord
 * (outbox) and by email, and they approve or decline from /admin.
 */
export const ACCESS_REQUEST_MAX_LENGTH = 1000;

export type AccessRequestStatus = "pending" | "approved" | "declined";

export type MyAccessRequest = {
  id: number;
  status: AccessRequestStatus;
  message: string;
  createdAt: string;
  decidedAt: string | null;
};

export type PendingAccessRequest = MyAccessRequest & {
  userId: number;
  username: string;
  displayName: string;
  email: string | null;
};

export async function getMyAccessRequest(
  userId: number,
): Promise<MyAccessRequest | null> {
  const [row] = await db
    .select({
      id: editorAccessRequestsTable.id,
      status: editorAccessRequestsTable.status,
      message: editorAccessRequestsTable.message,
      createdAt: editorAccessRequestsTable.createdAt,
      decidedAt: editorAccessRequestsTable.decidedAt,
    })
    .from(editorAccessRequestsTable)
    .where(eq(editorAccessRequestsTable.userId, userId))
    .orderBy(desc(editorAccessRequestsTable.createdAt))
    .limit(1);
  return row ? { ...row, status: row.status as AccessRequestStatus } : null;
}

async function adminEmails(): Promise<string[]> {
  const rows = await db
    .select({ email: adminUsersTable.email })
    .from(adminUsersTable)
    .where(
      and(
        eq(adminUsersTable.isActive, true),
        eq(adminUsersTable.role, "admin"),
        isNotNull(adminUsersTable.email),
        sql`${adminUsersTable.email} <> ''`,
      ),
    );
  return rows
    .map((r) => r.email?.trim().toLowerCase() ?? "")
    .filter(Boolean);
}

async function notifyAdmins(payload: AccessRequestedPayload): Promise<void> {
  await enqueueNotification({
    schemaVersion: 1,
    type: "access.requested",
    source: "room-tba",
    occurredAt: new Date().toISOString(),
    idempotencyKey: `access:${payload.requestId}:requested`,
    payload,
  });
  if (!isResendConfigured()) return;
  const emails = await adminEmails();
  await afterResponse(
    (async () => {
      for (const to of emails) {
        try {
          await sendEmail({
            to: [to],
            subject: `Room TBA: ${payload.displayName} asked for editor access`,
            template: "access-request",
            idempotencyKey: `access:${payload.requestId}:${to}`,
            text: [
              `${payload.displayName} (${payload.username}) asked for editor access:`,
              "",
              payload.message,
              "",
              `Approve or decline it on the dashboard: ${SITE_URL}/admin`,
            ].join("\n"),
          });
        } catch (error) {
          console.error(`Access request email to ${to} failed:`, error);
        }
      }
    })(),
  );
}

export async function createAccessRequest(
  user: SessionUser,
  rawMessage: string,
): Promise<MyAccessRequest> {
  if (user.role !== "contributor") {
    throw new AccountActionError("Your account already has editor access.", 409);
  }
  const message = rawMessage.trim();
  if (message.length < 10) {
    throw new AccountActionError(
      "Tell the admins a little about what you want to edit (at least 10 characters).",
    );
  }
  if (message.length > ACCESS_REQUEST_MAX_LENGTH) {
    throw new AccountActionError(
      `Keep it under ${ACCESS_REQUEST_MAX_LENGTH} characters.`,
    );
  }
  let created: typeof editorAccessRequestsTable.$inferSelect | undefined;
  try {
    [created] = await db
      .insert(editorAccessRequestsTable)
      .values({ userId: user.id, message })
      .returning();
  } catch (error) {
    const code =
      (error as { code?: string })?.code ??
      (error as { cause?: { code?: string } })?.cause?.code;
    if (code === "23505") {
      throw new AccountActionError(
        "You already have a request waiting for an admin.",
        409,
      );
    }
    throw error;
  }
  if (!created) throw new AccountActionError("Could not save the request.", 500);
  await notifyAdmins({
    requestId: created.id,
    username: user.username,
    displayName: user.displayName || user.username,
    message,
  });
  return {
    id: created.id,
    status: "pending",
    message: created.message,
    createdAt: created.createdAt,
    decidedAt: null,
  };
}

export async function listPendingAccessRequests(): Promise<PendingAccessRequest[]> {
  const rows = await db
    .select({
      id: editorAccessRequestsTable.id,
      status: editorAccessRequestsTable.status,
      message: editorAccessRequestsTable.message,
      createdAt: editorAccessRequestsTable.createdAt,
      decidedAt: editorAccessRequestsTable.decidedAt,
      userId: editorAccessRequestsTable.userId,
      username: adminUsersTable.username,
      displayName: adminUsersTable.displayName,
      email: adminUsersTable.email,
    })
    .from(editorAccessRequestsTable)
    .innerJoin(
      adminUsersTable,
      eq(adminUsersTable.id, editorAccessRequestsTable.userId),
    )
    .where(inArray(editorAccessRequestsTable.status, ["pending"]))
    .orderBy(desc(editorAccessRequestsTable.createdAt));
  return rows.map((r) => ({
    ...r,
    status: r.status as AccessRequestStatus,
    displayName: r.displayName ?? r.username,
  }));
}

/** Approve (grants the editor role) or decline a pending request. */
export async function decideAccessRequest(
  id: number,
  decision: "approved" | "declined",
  admin: SessionUser,
): Promise<{ userId: number; username: string }> {
  const [row] = await db
    .update(editorAccessRequestsTable)
    .set({ status: decision, decidedBy: admin.id, decidedAt: sql`now()` })
    .where(
      and(
        eq(editorAccessRequestsTable.id, id),
        eq(editorAccessRequestsTable.status, "pending"),
      ),
    )
    .returning({ userId: editorAccessRequestsTable.userId });
  if (!row) {
    throw new AccountActionError("That request was already handled.", 409);
  }
  const [user] = await db
    .select({ username: adminUsersTable.username, role: adminUsersTable.role })
    .from(adminUsersTable)
    .where(eq(adminUsersTable.id, row.userId));
  if (decision === "approved" && user?.role === "contributor") {
    await updateManagedUser(row.userId, { role: "editor" });
  }
  return { userId: row.userId, username: user?.username ?? `#${row.userId}` };
}
