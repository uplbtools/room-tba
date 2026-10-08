import {
  canPublishDirectly,
  canReviewProposals,
  createSessionToken,
  type SessionUser,
  setSessionCookie,
} from "@lib/admin/auth";
import { createSignedToken, verifySignedToken } from "@lib/admin/signed-token";
import type { LoginStep } from "@lib/auth/login-steps";
import { readSessionVersion } from "@lib/services/account-security";

/**
 * A password sign-in that still owes steps (2FA code, enrollment, new
 * password) gets this short-lived signed challenge instead of a session.
 * It names the user and the steps already passed; every step re-reads the
 * account, so the challenge grants nothing on its own.
 */
const LOGIN_CHALLENGE_TTL_SECONDS = 10 * 60;

type LoginChallengePayload = {
  purpose: "login-step";
  userId: number;
  done: LoginStep[];
};

export function createLoginChallenge(
  userId: number,
  done: LoginStep[],
): string {
  return createSignedToken<LoginChallengePayload>(
    { purpose: "login-step", userId, done },
    LOGIN_CHALLENGE_TTL_SECONDS,
  );
}

export function readLoginChallenge(
  token: string,
): { userId: number; done: LoginStep[] } | null {
  try {
    const payload = verifySignedToken<LoginChallengePayload>(token);
    if (
      payload?.purpose !== "login-step" ||
      !Number.isInteger(payload.userId) ||
      !Array.isArray(payload.done)
    ) {
      return null;
    }
    return { userId: payload.userId, done: payload.done };
  } catch {
    return null;
  }
}

/** JSON body for a step the client must show next. */
export function loginStepResponse(
  userId: number,
  steps: LoginStep[],
  done: LoginStep[],
  extra: Record<string, unknown> = {},
): Response {
  return new Response(
    JSON.stringify({
      step: steps[0],
      steps,
      challenge: createLoginChallenge(userId, done),
      ...extra,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

/**
 * Signed-in response with the session cookie (same shape as before). The
 * cookie carries the account's current session version, read after any step
 * that bumped it (a forced password change), so the next "sign out
 * everywhere" or password change revokes it.
 */
export async function sessionLoginResponse(
  user: SessionUser,
  extra: Record<string, unknown> = {},
): Promise<Response> {
  const sessionVersion =
    user.sessionVersion ?? (await readSessionVersion(user.id));
  return new Response(
    JSON.stringify({
      success: true,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      canPublish: canPublishDirectly(user.role),
      canReview: canReviewProposals(user.role),
      ...extra,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": setSessionCookie(
          createSessionToken({ ...user, sessionVersion }),
        ),
      },
    },
  );
}
