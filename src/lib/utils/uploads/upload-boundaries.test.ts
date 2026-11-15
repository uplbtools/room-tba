import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const componentSources = [
	'src/lib/components/AccountSettingsModal.svelte',
	'src/lib/components/SuggestAdditionPanel.svelte',
	'src/lib/components/editor/ImageUpload.svelte',
	'src/lib/components/editor/EntityPhotoUpload.svelte',
	'src/lib/components/editor/PhotoCollectionUpload.svelte',
	'src/routes/(app)/map/buildings/[id]/BuildingResult.svelte',
	'src/lib/components/entity/DormEditorPanel.svelte',
	'src/lib/components/entity/EventResult.svelte',
	'src/lib/components/room/RoomResult.svelte',
	'src/lib/components/map-chrome/EventPlacementImageField.svelte'
];

describe('image upload endpoint boundaries', () => {
	test('has no legacy admin upload callers', () => {
		for (const source of componentSources) {
			expect(readFileSync(source, 'utf8'), source).not.toContain('/api/admin/upload');
		}
	});

	test('keeps proposal submissions on the proposals API', () => {
		expect(readFileSync('src/lib/utils/proposals/client.ts', 'utf8')).toContain('/api/proposals');
	});
});
