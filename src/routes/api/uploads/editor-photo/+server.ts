import { editorSessionOrUnauthorized } from '#lib/admin/require-editor.js';
import {
	uploadConfigurationResponse,
	uploadImageRequest,
	scopedUploadPrefix
} from '#lib/utils/uploads/image-upload.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	const auth = await editorSessionOrUnauthorized(cookies, { requirePublish: true });
	if (auth instanceof Response) return auth;
	return uploadConfigurationResponse();
};

export const POST: RequestHandler = async ({ cookies, request }) => {
	const auth = await editorSessionOrUnauthorized(cookies, { requirePublish: true });
	if (auth instanceof Response) return auth;
	return uploadImageRequest({
		request,
		prefix: (formData) => scopedUploadPrefix(formData, ['buildings', 'events', 'dorms', 'rooms']),
		rateLimitKey: `${auth.session.id}:${request.headers.get('x-forwarded-for') ?? 'unknown'}`,
		uploadedBy: auth.session.displayName || auth.session.username
	});
};
