import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  R2_ACCESS_KEY_ID,
  R2_ACCOUNT_ID,
  R2_BUCKET_NAME,
  R2_PUBLIC_URL,
  R2_SECRET_ACCESS_KEY,
} from "astro:env/server";
import { publicUrlForKey } from "./r2-upload-core";

export {
  UPLOAD_MAX_BYTES,
  buildUploadKey,
  detectImageContentType,
  parseEventImageUrl,
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
