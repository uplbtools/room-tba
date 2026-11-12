import { R2_PUBLIC_URL } from '$app/env/private';
import { parseRequiredEditorVersion } from '#lib/admin/expected-version.js';
import { editorSessionOrUnauthorized } from '#lib/admin/require-editor.js';
import { json } from '#lib/api/json.js';
import { parseEntityPhotoUrls, reconcileEntityPhotos } from '#lib/utils/entity/entity-photos.js';
import { resolvePhotoAttribution } from '#lib/services/contribution/entity-photo.js';
import {
	DuplicateNameError,
	EditConflictError,
	getBuildingById,
	updateBuilding
} from '#lib/services/admin/actions.js';
import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';

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

	const id = parseInt(params.id ?? '', 10);
	if (Number.isNaN(id)) {
		error(400, 'Invalid building ID');
	}

	let body: BuildingPatchBody;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON body');
	}

	if (body.buildingName !== undefined && body.buildingName.trim().length === 0) {
		error(400, 'Building name cannot be empty');
	}

	if (body.buildingType && !['admin', 'non-admin'].includes(body.buildingType)) {
		error(400, 'Invalid building type');
	}

	const parsedPhotoUrls = parseEntityPhotoUrls(body.photoUrls, R2_PUBLIC_URL);
	if (!parsedPhotoUrls.ok) {
		error(400, parsedPhotoUrls.error);
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
		error(500, 'Failed to save building');
	}
};
