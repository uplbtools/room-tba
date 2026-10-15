import { R2_PUBLIC_URL } from '$app/env/private';
import { checkRateLimit, clientIp, rateLimitResponse } from '#lib/api/rate-limit.js';
import { json, errorResponse } from '#lib/api/json.js';
import {
	buildUploadKey,
	detectImageContentType,
	isR2Configured,
	UPLOAD_MAX_BYTES,
	uploadImageToR2,
	sanitizeUploadPrefix
} from '#lib/utils/r2-upload.js';

export const UPLOAD_LIMIT = { max: 30, windowMs: 10 * 60 * 1000 };
export type UploadPrefixSource = string | ((formData: FormData) => string | Response);

export function uploadConfigurationResponse() {
	return json({
		configured: isR2Configured(),
		maxBytes: UPLOAD_MAX_BYTES,
		allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
	});
}
export function scopedUploadPrefix(
	formData: FormData,
	scopes: readonly string[]
): string | Response {
	const raw = formData.get('prefix');
	if (typeof raw !== 'string' || !raw.trim()) {
		return errorResponse('Missing upload prefix', 400);
	}
	const rawSegments = raw.trim().replace(/\\/g, '/').split('/').filter(Boolean);
	if (
		rawSegments.length !== 2 ||
		rawSegments.some((segment) => segment === '.' || segment === '..') ||
		!scopes.includes(rawSegments[0]) ||
		!rawSegments[1]
	) {
		return errorResponse('Invalid upload prefix', 400);
	}
	const prefix = sanitizeUploadPrefix(raw);
	return prefix === 'uploads' ? errorResponse('Invalid upload prefix', 400) : prefix;
}

export async function uploadImageRequest(options: {
	request: Request;
	prefix: UploadPrefixSource;
	rateLimitKey?: string;
	uploadedBy: string;
}): Promise<Response> {
	const rate = checkRateLimit(
		`upload:${options.rateLimitKey ?? clientIp(options.request)}`,
		UPLOAD_LIMIT.max,
		UPLOAD_LIMIT.windowMs
	);
	if (!rate.allowed) return rateLimitResponse(rate.resetAt);

	if (!isR2Configured()) {
		return errorResponse(
			'Image uploads are not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.',
			503
		);
	}

	if (!R2_PUBLIC_URL?.trim()) {
		return errorResponse(
			'Image uploads require R2_PUBLIC_URL so saved URLs can be validated.',
			503
		);
	}

	let formData: FormData;
	try {
		formData = await options.request.formData();
	} catch {
		return errorResponse('Expected multipart form data', 400);
	}
	const file = formData.get('file');
	if (!(file instanceof File)) return errorResponse('Missing image file', 400);
	if (file.size === 0) return errorResponse('Image file is empty', 400);
	if (file.size > UPLOAD_MAX_BYTES) {
		return errorResponse('Image must be 5 MB or smaller', 413);
	}

	const bytes = new Uint8Array(await file.arrayBuffer());
	const contentType = detectImageContentType(bytes);
	if (!contentType) {
		return errorResponse('Only JPEG, PNG, and WebP images are allowed', 415);
	}

	const prefix = typeof options.prefix === 'function' ? options.prefix(formData) : options.prefix;
	if (prefix instanceof Response) return prefix;

	try {
		const key = buildUploadKey(prefix, contentType);
		const uploaded = await uploadImageToR2({ key, body: bytes, contentType });
		return json({
			success: true,
			url: uploaded.url,
			key: uploaded.key,
			uploadedBy: options.uploadedBy
		});
	} catch (error) {
		console.error('Failed to upload image:', error);
		return errorResponse('Failed to upload image', 500);
	}
}
