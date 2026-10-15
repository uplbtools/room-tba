import { R2_PUBLIC_URL } from '$app/env/private';
import { parseRequiredEditorVersion } from '#lib/admin/expected-version.js';
import { editorSessionOrUnauthorized } from '#lib/admin/require-editor.js';
import { errorResponse, json } from '#lib/api/json.js';
import { parseEntityPhotoUrls, reconcileEntityPhotos } from '#lib/utils/entity/entity-photos.js';
import { resolvePhotoAttribution } from '#lib/services/contribution/entity-photo.js';
import {
	DuplicateNameError,
	EditConflictError,
	getBuildingById,
	updateBuilding
} from '#lib/services/admin/actions.js';
import type { RequestHandler } from './$types';

type BuildingPatchBody = {
	buildingName?: string;
	lat?: number;
	lon?: number;
	buildingType?: 'admin' | 'non-admin';
	directions?: string;
	photoUrls?: unknown;
	crFacilities?: string[] | null;
	version?: number;
};

export const PATCH: RequestHandler = async ({ cookies, params, request }) => {
	const auth = await editorSessionOrUnauthorized(cookies, {
		requirePublish: true
	});
	if (auth instanceof Response) return auth;

	const id = parseInt(params.id ?? '', 10);
	if (Number.isNaN(id)) {
		return errorResponse('Invalid building ID', 400);
	}

	let body: BuildingPatchBody;
	try {
		body = await request.json();
	} catch {
		return errorResponse('Invalid JSON body', 400);
	}

	if (body.buildingName !== undefined && body.buildingName.trim().length === 0) {
		return errorResponse('Building name cannot be empty', 400);
	}

	if (body.buildingType && !['admin', 'non-admin'].includes(body.buildingType)) {
		return errorResponse('Invalid building type', 400);
	}

	const parsedPhotoUrls = parseEntityPhotoUrls(body.photoUrls, R2_PUBLIC_URL);
	if (!parsedPhotoUrls.ok) {
		return errorResponse(parsedPhotoUrls.error, 400);
	}

	const parsedVersion = parseRequiredEditorVersion(body.version);
	if (!parsedVersion.ok) return parsedVersion.response;
	const expectedVersion = parsedVersion.version;

	try {
		const updates: NonNullable<Parameters<typeof updateBuilding>[1]> = {};
		if (body.buildingName !== undefined) updates.buildingName = body.buildingName.trim();
		if (body.lat !== undefined) updates.lat = body.lat;
		if (body.lon !== undefined) updates.lon = body.lon;
		if (body.buildingType !== undefined) updates.buildingType = body.buildingType;
		if (body.directions !== undefined) updates.directions = body.directions;
		if (parsedPhotoUrls.provided) {
			const current = await getBuildingById(id);
			const attribution = await resolvePhotoAttribution(auth.session.id, auth.session.displayName);
			updates.photos = reconcileEntityPhotos(
				current?.photos ?? [],
				parsedPhotoUrls.photoUrls,
				attribution
			);
		}
		if (body.crFacilities !== undefined) updates.crFacilities = body.crFacilities;

		const building = await updateBuilding(id, updates, expectedVersion, auth.editedBy);

		return json({ success: true, building });
	} catch (err) {
		if (err instanceof EditConflictError) {
			return json(
				{
					error: 'This building was changed by another editor.',
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

		console.error('Failed to update building:', err);
		return errorResponse('Failed to save building', 500);
	}
};
