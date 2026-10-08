import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  R2_ACCESS_KEY_ID,
  R2_ACCOUNT_ID,
  R2_BUCKET_NAME,
  R2_PUBLIC_URL,
  R2_SECRET_ACCESS_KEY,
} from "astro:env/server";
import {
  QUARANTINE_PREFIX,
  promotedKeyFor,
  publicUrlForKey,
} from "./r2-upload-core";

export {
  UPLOAD_MAX_BYTES,
  buildQuarantineKey,
  buildUploadKey,
  isQuarantineKey,
  isQuarantinePrefix,
  keyFromPublicUrl,
  staleQuarantineKeys,
  detectImageContentType,
  parseEventImageUrl,
  parseImageUrl,
  sanitizeUploadPrefix,
} from "./r2-upload-core";

export function isR2Configured(): boolean {
  return Boolean(
    R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME,
  );
}

function getR2Client(): S3Client {
  if (!isR2Configured()) {
    throw new Error("R2 is not configured");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  });
}

export async function uploadImageToR2(params: {
  key: string;
  body: Uint8Array;
  contentType: string;
}): Promise<{ key: string; url: string }> {
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME!,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    }),
  );
  return {
    key: params.key,
    url: publicUrlForKey(params.key, R2_PUBLIC_URL),
  };
}

/**
 * Copy an approved quarantine object to its public prefix and drop the
 * quarantine copy. Returns the new public URL.
 */
export async function promoteQuarantinedObject(
  quarantineKey: string,
): Promise<string> {
  const client = getR2Client();
  const targetKey = promotedKeyFor(quarantineKey);
  await client.send(
    new CopyObjectCommand({
      Bucket: R2_BUCKET_NAME!,
      CopySource: `${R2_BUCKET_NAME}/${quarantineKey}`,
      Key: targetKey,
    }),
  );
  try {
    await client.send(
      new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME!, Key: quarantineKey }),
    );
  } catch (error) {
    // The public copy exists; the leftover is swept by the cleanup cron.
    console.error("Quarantine delete after promotion failed:", error);
  }
  return publicUrlForKey(targetKey, R2_PUBLIC_URL);
}

/** Every object under quarantine/ (paginated). */
export async function listQuarantineObjects(): Promise<
  Array<{ key: string; lastModified: number | null }>
> {
  const client = getR2Client();
  const objects: Array<{ key: string; lastModified: number | null }> = [];
  let token: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME!,
        Prefix: `${QUARANTINE_PREFIX}/`,
        ContinuationToken: token,
      }),
    );
    for (const item of page.Contents ?? []) {
      if (!item.Key) continue;
      objects.push({
        key: item.Key,
        lastModified: item.LastModified ? item.LastModified.getTime() : null,
      });
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return objects;
}

/** Delete objects in batches of 1000 (the S3 DeleteObjects cap). */
export async function deleteR2Objects(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;
  const client = getR2Client();
  let deleted = 0;
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    const result = await client.send(
      new DeleteObjectsCommand({
        Bucket: R2_BUCKET_NAME!,
        Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
      }),
    );
    deleted += batch.length - (result.Errors?.length ?? 0);
  }
  return deleted;
}
