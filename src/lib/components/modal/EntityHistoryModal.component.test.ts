import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import EntityHistoryModal from './EntityHistoryModal.svelte';

const mocks = vi.hoisted(() => ({
	getPublicHistory: vi.fn(),
	record: {} as Record<string, unknown>
}));
vi.mock('#lib/functions/history.remote.js', () => ({ getPublicHistory: mocks.getPublicHistory }));
vi.mock('#lib/utils/context.js', () => ({
	getModalStore: () => ({ getDataRecord: () => mocks.record })
}));

const entry = (id: number, name: string) => ({
	id,
	action: 'update',
	by: 'Stim',
	createdAt: '2026-09-08T16:57:21Z',
	changes: [{ field: 'buildingName', label: 'Name', before: 'Old', after: name }]
});

beforeEach(() => {
	mocks.getPublicHistory.mockReset();
	mocks.record = { entityType: 'building', entityId: 30, name: 'LHKCB' };
});

describe('EntityHistoryModal', () => {
	test('names the entity and shows times in campus time', async () => {
		mocks.getPublicHistory.mockResolvedValue({
			entries: [entry(1, 'LHKCB Building')],
			nextOffset: null
		});
		render(EntityHistoryModal);

		expect(screen.getByText('LHKCB')).toBeInTheDocument();
		expect(await screen.findByText('LHKCB Building')).toBeInTheDocument();
		expect(screen.getByText('Sep 9, 2026, 12:57 AM PHT')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Show older edits' })).toBeNull();
	});

	test('says so when there are no recorded edits', async () => {
		mocks.getPublicHistory.mockResolvedValue({ entries: [], nextOffset: null });
		render(EntityHistoryModal);

		expect(await screen.findByText('There are no recorded edits yet.')).toBeInTheDocument();
	});

	test('offers older edits when a page held only hidden ones', async () => {
		mocks.getPublicHistory
			.mockResolvedValueOnce({ entries: [], nextOffset: 500 })
			.mockResolvedValueOnce({ entries: [entry(2, 'Older name')], nextOffset: null });
		render(EntityHistoryModal);

		const more = await screen.findByRole('button', { name: 'Show older edits' });
		expect(screen.queryByText('There are no recorded edits yet.')).toBeNull();
		await fireEvent.click(more);

		expect(await screen.findByText('Older name')).toBeInTheDocument();
		expect(mocks.getPublicHistory).toHaveBeenLastCalledWith({
			entityType: 'building',
			entityId: 30,
			offset: 500
		});
		expect(screen.queryByRole('button', { name: 'Show older edits' })).toBeNull();
	});
});
