import { editorSessionOrUnauthorized } from '#lib/admin/require-editor.js';
import {
	uploadConfigurationResponse,
	uploadImageRequest
} from '#lib/utils/uploads/image-upload.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	const auth = await editorSessionOrUnauthorized(cookies);
	if (auth instanceof Response) return auth;
	return uploadConfigurationResponse();
};

export const POST: RequestHandler = async ({ cookies, request }) => {
	const auth = await editorSessionOrUnauthorized(cookies);
	if (auth instanceof Response) return auth;
	return uploadImageRequest({
		request,
		prefix: `accounts/${auth.session.id}/avatar`,
		rateLimitKey: `account:${auth.session.id}`,
		uploadedBy: auth.session.displayName || auth.session.username
	});
};
