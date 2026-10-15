import { R2_PUBLIC_URL } from '$app/env/private';
import { parseRequiredEditorVersion } from '#lib/admin/expected-version.js';
import { editorSessionOrUnauthorized } from '#lib/admin/require-editor.js';
import { errorResponse, json } from '#lib/api/json.js';
import { parseEntityPhotoUrls, reconcileEntityPhotos } from '#lib/utils/entity/entity-photos.js';
import { resolvePhotoAttribution } from '#lib/services/contribution/entity-photo.js';
import {
	DuplicateNameError,
	EditConflictError,
	getDormById,
	updateDorm
} from '#lib/services/admin/actions.js';
import type { RequestHandler } from './$types';

type DormPatchBody = {
	photoUrls?: unknown;
	dormName?: string;
	shortName?: string;
	lat?: number | null;
	lon?: number | null;
	gender?: string;
	capacity?: number | null;
	managingOffice?: string | null;
	contactEmail?: string | null;
	amenities?: string[];
	osmLink?: string | null;
	description?: string | null;
	isUpManaged?: boolean;
	priceRange?: string | null;
	contactPhone?: string[];
	facebookLink?: string | null;
	version?: number;
};

export const PATCH: RequestHandler = async ({ cookies, params, request }) => {
	const auth = await editorSessionOrUnauthorized(cookies, {
		requirePublish: true
	});
	if (auth instanceof Response) return auth;

	const id = parseInt(params.id ?? '', 10);
	if (Number.isNaN(id)) {
		return errorResponse('Invalid dorm ID', 400);
	}

	let body: DormPatchBody;
	try {
		body = await request.json();
	} catch {
		return errorResponse('Invalid JSON body', 400);
	}

	if (body.dormName !== undefined && body.dormName.trim().length === 0) {
		return errorResponse('Dorm name is required', 400);
	}

	const parsedPhotoUrls = parseEntityPhotoUrls(body.photoUrls, R2_PUBLIC_URL);
	if (!parsedPhotoUrls.ok) {
		return errorResponse(parsedPhotoUrls.error, 400);
	}

	const parsedVersion = parseRequiredEditorVersion(body.version);
	if (!parsedVersion.ok) return parsedVersion.response;
	const expectedVersion = parsedVersion.version;

	try {
		const updates: Parameters<typeof updateDorm>[1] = {};
		if (parsedPhotoUrls.provided) {
			const current = await getDormById(id);
			const attribution = await resolvePhotoAttribution(auth.session.id, auth.session.displayName);
			updates.photos = reconcileEntityPhotos(
				current?.photos ?? [],
				parsedPhotoUrls.photoUrls,
				attribution
			);
		}
		if (body.dormName !== undefined) updates.dormName = body.dormName.trim();
		if (body.shortName !== undefined) updates.shortName = body.shortName || null;
		if (body.lat !== undefined) updates.lat = body.lat === null ? null : Number(body.lat);
		if (body.lon !== undefined) updates.lon = body.lon === null ? null : Number(body.lon);
		if (body.gender !== undefined) updates.gender = body.gender || 'Mixed';
		if (body.capacity !== undefined) {
			updates.capacity = body.capacity === null ? null : Number(body.capacity);
		}
		if (body.managingOffice !== undefined) {
			updates.managingOffice = body.managingOffice || null;
		}
		if (body.contactEmail !== undefined) updates.contactEmail = body.contactEmail || null;
		if (body.amenities !== undefined) {
			updates.amenities = Array.isArray(body.amenities) ? body.amenities : [];
		}
		if (body.osmLink !== undefined) updates.osmLink = body.osmLink || null;
		if (body.description !== undefined) updates.description = body.description || null;
		if (body.isUpManaged !== undefined) updates.isUpManaged = body.isUpManaged !== false;
		if (body.priceRange !== undefined) updates.priceRange = body.priceRange || null;
		if (body.contactPhone !== undefined) {
			updates.contactPhone = Array.isArray(body.contactPhone) ? body.contactPhone : [];
		}
		if (body.facebookLink !== undefined) updates.facebookLink = body.facebookLink || null;

		const dorm = await updateDorm(id, updates, expectedVersion, auth.editedBy);

		return json({ success: true, dorm });
	} catch (err) {
		if (err instanceof EditConflictError) {
			return json(
				{
					error: 'This dorm was changed by another editor.',
					latest: err.latest
				},
				409
			);
		}

		if (err instanceof DuplicateNameError) {
			return json(
				{
					error: err.message,
					code: 'duplicate_name',
					entityType: err.entityType,
					mergeCandidate: err.candidate,
					attemptedName: err.attemptedName
				},
				409
			);
		}

		console.error('Failed to update dorm:', err);
		return errorResponse('Failed to save dorm', 500);
	}
};
