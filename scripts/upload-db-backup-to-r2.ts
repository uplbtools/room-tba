#!/usr/bin/env bun
/**
 * Upload a pg_dump custom-format file to Cloudflare R2 for long-term retention.
 * Skips with exit 0 when R2 secrets are unset (GitHub Actions optional step).
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: bun scripts/upload-db-backup-to-r2.ts <path-to.dump>");
  process.exit(1);
}

const accountId = process.env.R2_ACCOUNT_ID?.trim();
const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
const bucket = process.env.R2_BUCKET_NAME?.trim();
const prefix = (process.env.R2_BACKUP_PREFIX ?? "db-backups").replace(
  /\/$/,
  "",
);

if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
  console.warn("R2 backup upload skipped: R2_* secrets not fully configured");
  process.exit(0);
}

const key = `${prefix}/${basename(filePath)}`;
const body = readFileSync(filePath);

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

await client.send(
  new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: "application/octet-stream",
  }),
);

console.log(`Uploaded s3://${bucket}/${key} (${body.byteLength} bytes)`);
