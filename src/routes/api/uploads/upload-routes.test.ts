import { beforeEach, describe, expect, test, vi } from 'vitest';

const { uploadImageToR2, editorSessionOrUnauthorized } = vi.hoisted(() => ({
	uploadImageToR2: vi.fn(async ({ key }: { key: string }) => ({
		key,
		url: `https://cdn.example.test/${key}`
	})),
	editorSessionOrUnauthorized: vi.fn()
}));

vi.mock('$env/dynamic/private', () => ({
	env: {
		R2_PUBLIC_URL: 'https://cdn.example.test',
		R2_ACCOUNT_ID: 'account',
		R2_ACCESS_KEY_ID: 'key',
		R2_SECRET_ACCESS_KEY: 'secret',
		R2_BUCKET_NAME: 'bucket'
	}
}));
vi.mock('#lib/admin/require-editor.js', () => ({ editorSessionOrUnauthorized }));
vi.mock('#lib/utils/r2-upload.js', () => ({
	UPLOAD_MAX_BYTES: 5 * 1024 * 1024,
	buildUploadKey: (prefix: string) => `${prefix}/image.jpg`,
	detectImageContentType: (bytes: Uint8Array) =>
		bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? 'image/jpeg' : null,
	isR2Configured: () => true,
	uploadImageToR2,
	sanitizeUploadPrefix: (prefix: string) => prefix.trim().replace(/^\/+|\/+$/g, '')
}));

const { POST: postSuggestion } = await import('./suggestion-photo/+server');
const { POST: postEditor } = await import('./editor-photo/+server');
const { POST: postAvatar } = await import('../account/avatar/+server');

function imageRequest(prefix?: string, bytes = [0xff, 0xd8, 0xff]) {
	const formData = new FormData();
	formData.set('file', new File([new Uint8Array(bytes)], 'image.jpg', { type: 'image/jpeg' }));
	if (prefix) formData.set('prefix', prefix);
	return new Request('https://room.test/api/upload', { method: 'POST', body: formData });
}

const cookies = {} as never;

beforeEach(() => {
	vi.clearAllMocks();
	editorSessionOrUnauthorized.mockResolvedValue({
		session: { id: 42, username: 'editor', displayName: 'Editor' }
	});
});

describe('upload routes', () => {
	test('anonymous suggestion upload accepts image bytes and scoped prefix', async () => {
		const response = await postSuggestion({ request: imageRequest('events/summer-fair') } as never);
		expect(response.status).toBe(200);
		expect(uploadImageToR2).toHaveBeenCalledWith(
			expect.objectContaining({ key: 'events/summer-fair/image.jpg' })
		);
	});

	test('suggestion upload rejects invalid image bytes', async () => {
		const response = await postSuggestion({
			request: imageRequest('events/summer-fair', [1, 2, 3])
		} as never);
		expect(response.status).toBe(415);
		expect(uploadImageToR2).not.toHaveBeenCalled();
	});

	test('editor upload requires authenticated editor session', async () => {
		editorSessionOrUnauthorized.mockResolvedValueOnce(
			new Response('Unauthorized', { status: 401 })
		);
		const response = await postEditor({ cookies, request: imageRequest('rooms/7') } as never);
		expect(response.status).toBe(401);
		expect(uploadImageToR2).not.toHaveBeenCalled();
	});

	test('account avatar upload forces session account prefix', async () => {
		const response = await postAvatar({
			cookies,
			request: imageRequest('accounts/99/avatar')
		} as never);
		expect(response.status).toBe(200);
		expect(uploadImageToR2).toHaveBeenCalledWith(
			expect.objectContaining({ key: 'accounts/42/avatar/image.jpg' })
		);
	});
});
