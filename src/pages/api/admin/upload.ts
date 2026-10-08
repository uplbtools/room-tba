import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { R2_PUBLIC_URL } from "astro:env/server";
import { editProposalsTable } from "@drizzle/schema";
import { canPublishDirectly, type SessionUser } from "@lib/admin/auth";
import { optionalEditorSession } from "@lib/admin/require-editor";
import { clientIp, rateLimitResponse } from "@lib/api/rate-limit";
import { sharedRateLimit } from "@lib/api/rate-limit-db";
import { db } from "@lib/db";
import {
  UPLOAD_MAX_BYTES,
  buildQuarantineKey,
  buildUploadKey,
  detectImageContentType,
  isQuarantinePrefix,
  isR2Configured,
  uploadImageToR2,
} from "@lib/r2-upload";
import { ownsProposal } from "@lib/services/proposal-access";
import { readProposalTokenHash } from "@lib/services/proposal-service";

export const prerender = false;

// Image upload to Cloudflare R2 (public bucket). Who may write:
// - accounts with publish rights (editor/admin): straight to a public prefix;
// - anyone else only for an open proposal they own (signed-in owner, or the
//   anonymous author holding the proposal token). Those files go to
//   quarantine/<proposalId>/ and become public only when a reviewer approves
//   the proposal; the daily cron sweeps unreferenced ones after 7 days.

/** Per account (or IP for anonymous): 30 uploads / 10 minutes. */
const UPLOAD_LIMIT = { max: 30, windowMs: 10 * 60 * 1000 };

const NEEDS_PROPOSAL_MESSAGE =
  "Send your suggestion first, then add a photo while it is waiting for review.";

/** Capability probe for the editor's photo field. Public: it only reports
 * whether uploads work and whether this caller can publish directly. */
export const GET: APIRoute = async ({ cookies }) => {
  const session = await optionalEditorSession(cookies);
  return json({
    configured: isR2Configured(),
    canPublish: session ? canPublishDirectly(session.role) : false,
    maxBytes: UPLOAD_MAX_BYTES,
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
  });
};

/** Open proposal owned by the caller, or null. */
async function ownedOpenProposalId(
  session: SessionUser | null,
  proposalIdRaw: FormDataEntryValue | null,
  proposalToken: FormDataEntryValue | null,
): Promise<number | null> {
  const proposalId = Number(proposalIdRaw);
  if (!Number.isInteger(proposalId) || proposalId < 1) return null;
  const [row] = await db
    .select({
      status: editProposalsTable.status,
      submitterUserId: editProposalsTable.submitterUserId,
    })
    .from(editProposalsTable)
    .where(eq(editProposalsTable.id, proposalId))
    .limit(1);
  if (!row || !["pending", "needs_changes"].includes(row.status)) return null;
  const withdrawTokenHash = row.submitterUserId
    ? null
    : await readProposalTokenHash(proposalId);
  return ownsProposal(session, { ...row, withdrawTokenHash }, proposalToken)
    ? proposalId
    : null;
}

export const POST: APIRoute = async ({ cookies, request }) => {
  const session = await optionalEditorSession(cookies);
  const canPublish = session ? canPublishDirectly(session.role) : false;

  const ip = clientIp(request);
  const rate = await sharedRateLimit(
    session ? `upload:user:${session.id}` : `upload:ip:${ip}`,
    UPLOAD_LIMIT.max,
    UPLOAD_LIMIT.windowMs,
  );
  if (!rate.allowed) {
    return rateLimitResponse(rate.resetAt);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: "Expected multipart form data" }, 400);
  }

  let quarantineProposalId: number | null = null;
  if (!canPublish) {
    quarantineProposalId = await ownedOpenProposalId(
      session,
      formData.get("proposalId"),
      formData.get("proposalToken"),
    );
    if (quarantineProposalId === null) {
      return json(
        { error: session ? NEEDS_PROPOSAL_MESSAGE : "Unauthorized" },
        session ? 403 : 401,
      );
    }
  }

  if (!isR2Configured()) {
    return json(
      {
        error:
          "Image uploads are not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.",
      },
      503,
    );
  }

  if (!R2_PUBLIC_URL?.trim()) {
    return json(
      {
        error:
          "Image uploads require R2_PUBLIC_URL so saved event URLs can be validated.",
      },
      503,
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return json({ error: "Missing image file" }, 400);
  }

  if (file.size === 0) {
    return json({ error: "Image file is empty" }, 400);
  }
  if (file.size > UPLOAD_MAX_BYTES) {
    return json({ error: "Image must be 5 MB or smaller" }, 413);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = detectImageContentType(bytes);
  if (!contentType) {
    return json({ error: "Only JPEG, PNG, and WebP images are allowed" }, 415);
  }

  const requestedPrefix = formData.get("prefix");
  const prefix =
    typeof requestedPrefix === "string" && !isQuarantinePrefix(requestedPrefix)
      ? requestedPrefix
      : "uploads";

  try {
    const key =
      quarantineProposalId !== null
        ? buildQuarantineKey(quarantineProposalId, contentType)
        : buildUploadKey(prefix, contentType);
    const uploaded = await uploadImageToR2({ key, body: bytes, contentType });
    return json({
      success: true,
      url: uploaded.url,
      key: uploaded.key,
      quarantined: quarantineProposalId !== null,
    });
  } catch (error) {
    console.error("Failed to upload image:", error);
    return json({ error: "Failed to upload image" }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
