export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export function detectImageContentType(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function sanitizeUploadPrefix(prefix: string | null | undefined): string {
  if (!prefix?.trim()) return "uploads";
  const cleaned = prefix
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean)
    .filter((segment) => segment !== "." && segment !== "..")
    .map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, "-"))
    .filter(Boolean)
    .join("/");
  return cleaned || "uploads";
}

export function extensionForContentType(contentType: string): string | null {
  return ALLOWED_IMAGE_TYPES.get(contentType) ?? null;
}

export function buildUploadKey(
  prefix: string,
  contentType: string,
  id = crypto.randomUUID(),
): string {
  const extension = extensionForContentType(contentType);
  if (!extension) {
    throw new Error("Unsupported image type");
  }
  return `${sanitizeUploadPrefix(prefix)}/${id}.${extension}`;
}

export function publicUrlForKey(key: string, publicBaseUrl?: string | null): string {
  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/$/, "")}/${key}`;
  }
  return key;
}
