import { R2_PUBLIC_URL } from '$app/env/private';
import { parseRequiredEditorVersion } from '#lib/admin/expected-version.js';
import { editorSessionOrUnauthorized } from '#lib/admin/require-editor.js';
import { parseEntityPhotoUrls, reconcileEntityPhotos } from '#lib/utils/entity/entity-photos.js';
import { resolvePhotoAttribution } from '#lib/services/contribution/entity-photo.js';
import {
	DuplicateNameError,
	EditConflictError,
	ManualPositionError,
	getRoomById,
	updateRoom,
	updateRoomPosition
} from '#lib/services/admin/actions.js';
import type { RequestHandler } from './$types';

type RoomPatchBody = {
	roomCode?: string;
	directions?: string | null;
	buildingId?: number | null;
	collegeId?: number | null;
	divisionId?: number | null;
	photoUrls?: unknown;
	version?: number;
	position?: {
		floor: number;
		posX: string;
		posY: string;
		source?: 'manual' | 'inferred';
	};
};

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

function invalidRelationId(value: unknown) {
	return value !== undefined && value !== null && !Number.isInteger(value);
}

function invalidPosition(value: unknown) {
	if (value === undefined) return false;
	if (!value || typeof value !== 'object') return true;
	const position = value as NonNullable<RoomPatchBody['position']>;

	return (
		!Number.isInteger(position.floor) ||
		position.floor < 1 ||
		!Number.isFinite(Number(position.posX)) ||
		!Number.isFinite(Number(position.posY)) ||
		(position.source !== undefined &&
			position.source !== 'manual' &&
			position.source !== 'inferred')
	);
}

export const PATCH: RequestHandler = async ({ cookies, params, request }) => {
	const auth = await editorSessionOrUnauthorized(cookies, {
		requirePublish: true
	});
	if (auth instanceof Response) return auth;

	const id = parseInt(params.id ?? '', 10);
	if (Number.isNaN(id)) {
		return json({ error: 'Invalid room ID' }, 400);
	}

	let body: RoomPatchBody;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, 400);
	}

	if (body.roomCode !== undefined && body.roomCode.trim().length === 0) {
		return json({ error: 'Room code is required' }, 400);
	}

	if (invalidRelationId(body.buildingId)) {
		return json({ error: 'Building must be a valid selection' }, 400);
	}
	if (invalidRelationId(body.collegeId)) {
		return json({ error: 'College must be a valid selection' }, 400);
	}
	if (invalidRelationId(body.divisionId)) {
		return json({ error: 'Division must be a valid selection' }, 400);
	}
	if (invalidPosition(body.position)) {
		return json({ error: 'Position must include a valid floor, posX, and posY' }, 400);
	}

	const parsedPhotoUrls = parseEntityPhotoUrls(body.photoUrls, R2_PUBLIC_URL);
	if (!parsedPhotoUrls.ok) {
		return json({ error: parsedPhotoUrls.error }, 400);
	}

	const parsedVersion = parseRequiredEditorVersion(body.version);
	if (!parsedVersion.ok) return parsedVersion.response;
	const expectedVersion = parsedVersion.version;

	try {
		const updates: Parameters<typeof updateRoom>[1] = {};
		if (body.roomCode !== undefined) updates.roomCode = body.roomCode.trim();
		if (body.directions !== undefined) {
			updates.directions = body.directions?.trim() || null;
		}
		if (body.buildingId !== undefined) updates.buildingId = body.buildingId;
		if (body.collegeId !== undefined) updates.collegeId = body.collegeId;
		if (body.divisionId !== undefined) updates.divisionId = body.divisionId;
		if (parsedPhotoUrls.provided) {
			const current = await getRoomById(id);
			const attribution = await resolvePhotoAttribution(auth.session.id, auth.session.displayName);
			updates.photos = reconcileEntityPhotos(
				current?.photos ?? [],
				parsedPhotoUrls.photoUrls,
				attribution
			);
		}
		const hasRoomFieldUpdates = Object.keys(updates).length > 0;

		if (body.position && hasRoomFieldUpdates) {
			return json(
				{
					error: 'Room field updates and position updates must be saved separately.'
				},
				400
			);
		}

		if (body.position && !hasRoomFieldUpdates) {
			const room = await updateRoomPosition(
				id,
				{
					floor: body.position.floor,
					posX: String(body.position.posX),
					posY: String(body.position.posY),
					source: body.position.source ?? 'manual'
				},
				expectedVersion,
				auth.editedBy
			);

			return json({ success: true, room });
		}

		const room = await updateRoom(id, updates, expectedVersion, auth.editedBy);

		return json({ success: true, room });
	} catch (err) {
		if (err instanceof EditConflictError) {
			return json(
				{
					error: 'This room was changed by another editor.',
					latest: err.latest
				},
				409
			);
		}

		if (err instanceof ManualPositionError) {
			return json(
				{
					error: err.message,
					code: 'manual_position',
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

		console.error('Failed to update room:', err);
		return json({ error: 'Failed to save room' }, 500);
	}
};
