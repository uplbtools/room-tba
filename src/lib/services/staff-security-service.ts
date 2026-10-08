import { and, eq, sql } from "drizzle-orm";
import { TOTP_ENCRYPTION_KEY } from "astro:env/server";
import { adminUserSecurityTable } from "@drizzle/auth-ops-schema";
import { adminUsersTable } from "@drizzle/schema";
import { db } from "@lib/db";
import type { SessionUser } from "@lib/admin/auth";
import { type LoginStepPlan, planLoginSteps } from "@lib/auth/login-steps";
import { deriveKey, open, seal } from "@lib/auth/secret-box";
import {
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  otpauthUri,
  verifyTotp,
} from "@lib/auth/totp";
import { AccountActionError } from "@lib/services/admin-user-service";

type SecurityRow = typeof adminUserSecurityTable.$inferSelect;

/** The active account behind a login challenge, as a session user. */
export async function getActiveSessionUser(
  userId: number,
): Promise<SessionUser | null> {
  const [row] = await db
    .select({
      id: adminUsersTable.id,
      username: adminUsersTable.username,
      displayName: adminUsersTable.displayName,
      role: adminUsersTable.role,
    })
    .from(adminUsersTable)
    .where(
      and(eq(adminUsersTable.id, userId), eq(adminUsersTable.isActive, true)),
    )
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName ?? row.username,
    role: row.role ?? "editor",
  };
}

export function isMfaAvailable(): boolean {
  return Boolean(TOTP_ENCRYPTION_KEY?.trim());
}

function encryptionKey(): Buffer {
  if (!TOTP_ENCRYPTION_KEY?.trim()) {
    throw new AccountActionError(
      "Two-step verification is not configured on this server.",
      503,
    );
  }
  return deriveKey(TOTP_ENCRYPTION_KEY);
}

/** `timestamp` columns hold UTC wall time without a zone. */
function parseUtcTimestamp(value: string): Date {
  return new Date(`${value.replace(" ", "T")}Z`);
}

async function getRow(userId: number): Promise<SecurityRow | null> {
  const [row] = await db
    .select()
    .from(adminUserSecurityTable)
    .where(eq(adminUserSecurityTable.userId, userId))
    .limit(1);
  return row ?? null;
}

async function upsert(
  userId: number,
  values: Partial<Omit<SecurityRow, "userId" | "updatedAt">>,
): Promise<void> {
  await db
    .insert(adminUserSecurityTable)
    .values({ userId, ...values })
    .onConflictDoUpdate({
      target: adminUserSecurityTable.userId,
      set: { ...values, updatedAt: sql`now()` },
    });
}

/**
 * Sign-in steps for a password login. Starts the admin grace period on the
 * first sign-in without 2FA. A missing table (migration not yet applied)
 * means no extra steps rather than locking everyone out.
 */
export async function loginPlanFor(user: SessionUser): Promise<LoginStepPlan> {
  let row: SecurityRow | null = null;
  try {
    row = await getRow(user.id);
  } catch (error) {
    console.error("admin_user_security lookup failed:", error);
    return { steps: [], enrollSuggested: false, startGraceUntil: null };
  }
  const plan = planLoginSteps({
    role: user.role,
    mfaEnabled: Boolean(row?.totpEnabledAt && row.totpSecretEnc),
    mfaAvailable: isMfaAvailable(),
    mustChangePassword: row?.mustChangePassword ?? false,
    mfaGraceUntil: row?.mfaGraceUntil
      ? parseUtcTimestamp(row.mfaGraceUntil)
      : null,
  });
  if (plan.startGraceUntil) {
    await upsert(user.id, {
      mfaGraceUntil: plan.startGraceUntil.toISOString(),
    });
  }
  return plan;
}

export type MfaStatus = {
  available: boolean;
  enabled: boolean;
  recoveryCodesLeft: number;
  /** Admins must enroll; editors may. */
  required: boolean;
  graceUntil: string | null;
};

export async function getMfaStatus(user: SessionUser): Promise<MfaStatus> {
  const row = await getRow(user.id);
  return {
    available: isMfaAvailable(),
    enabled: Boolean(row?.totpEnabledAt),
    recoveryCodesLeft: row?.recoveryCodeHashes.length ?? 0,
    required: user.role === "admin",
    graceUntil: row?.mfaGraceUntil ?? null,
  };
}

/**
 * Begin enrollment: a fresh secret, stored sealed but not yet enabled until
 * the user proves their app produces matching codes.
 */
export async function startMfaEnrollment(
  user: Pick<SessionUser, "id" | "username">,
): Promise<{ secret: string; otpauthUri: string }> {
  const key = encryptionKey();
  const row = await getRow(user.id);
  if (row?.totpEnabledAt) {
    throw new AccountActionError("Two-step verification is already on.", 409);
  }
  const secret = generateTotpSecret();
  await upsert(user.id, {
    totpSecretEnc: seal(secret, key),
    totpEnabledAt: null,
    totpLastStep: null,
  });
  return { secret, otpauthUri: otpauthUri(secret, user.username) };
}

/** Finish enrollment with a code from the app; returns recovery codes once. */
export async function confirmMfaEnrollment(
  userId: number,
  code: string,
): Promise<string[]> {
  const key = encryptionKey();
  const row = await getRow(userId);
  if (!row?.totpSecretEnc || row.totpEnabledAt) {
    throw new AccountActionError("Start two-step setup again.", 409);
  }
  const step = verifyTotp(open(row.totpSecretEnc, key), code);
  if (step === null) {
    throw new AccountActionError(
      "That code did not match. Check the time on your phone and try the newest code.",
      400,
    );
  }
  const codes = generateRecoveryCodes();
  await upsert(userId, {
    totpEnabledAt: new Date().toISOString(),
    totpLastStep: step,
    recoveryCodeHashes: codes.map(hashRecoveryCode),
    mfaGraceUntil: null,
  });
  return codes;
}

/**
 * Check a sign-in code: a current TOTP code (each step usable once) or an
 * unused recovery code (consumed).
 */
export async function verifyMfaCode(
  userId: number,
  code: string,
): Promise<"totp" | "recovery" | null> {
  const row = await getRow(userId);
  if (!row?.totpSecretEnc || !row.totpEnabledAt) return null;
  const step = verifyTotp(open(row.totpSecretEnc, encryptionKey()), code, {
    lastUsedStep: row.totpLastStep,
  });
  if (step !== null) {
    await upsert(userId, { totpLastStep: step });
    return "totp";
  }
  const hash = hashRecoveryCode(code);
  if (row.recoveryCodeHashes.includes(hash)) {
    await upsert(userId, {
      recoveryCodeHashes: row.recoveryCodeHashes.filter((h) => h !== hash),
    });
    return "recovery";
  }
  return null;
}

/**
 * Turn 2FA off. For an admin the grace period is already over, so the next
 * password sign-in asks them to enroll again rather than granting a fresh
 * week each time it is switched off.
 */
export async function disableMfa(
  user: Pick<SessionUser, "id" | "role">,
): Promise<void> {
  await upsert(user.id, {
    totpSecretEnc: null,
    totpEnabledAt: null,
    totpLastStep: null,
    recoveryCodeHashes: [],
    mfaGraceUntil: user.role === "admin" ? new Date().toISOString() : null,
  });
}

export async function regenerateRecoveryCodes(
  userId: number,
): Promise<string[]> {
  const row = await getRow(userId);
  if (!row?.totpEnabledAt) {
    throw new AccountActionError("Turn on two-step verification first.", 409);
  }
  const codes = generateRecoveryCodes();
  await upsert(userId, { recoveryCodeHashes: codes.map(hashRecoveryCode) });
  return codes;
}

export async function setMustChangePassword(
  userId: number,
  value: boolean,
): Promise<void> {
  await upsert(userId, { mustChangePassword: value });
}
