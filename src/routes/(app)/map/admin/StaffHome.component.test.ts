import { render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import Page from './+page.svelte';
import AdminAuthStore from '#lib/stores/new/data/AdminAuthStore.svelte.js';
import PlannerStore from '#lib/stores/new/data/PlannerStore.svelte.js';
import ProposalsStore from '#lib/stores/new/data/ProposalsStore.svelte.js';
import type ModalStore from '#lib/stores/new/ui/ModalStore.svelte.js';
import { expectNoHorizontalOverflow, mountAtWidth } from '@test/layout-assertions';

vi.mock('#lib/supabase/env.js', () => ({ isSupabaseConfigured: () => false }));
vi.mock('#lib/functions/dashboard.remote.js', () => ({
	getStaffDashboard: async () => ({
		pendingReviews: 4,
		recentActivity: [
			{
				id: 1,
				entityType: 'room',
				action: 'update',
				editedBy: 'Stimmie',
				summary: 'Updated CEM 203',
				createdAt: '2026-10-08 01:00:00'
			}
		],
		digest: { recipientCount: 3, youReceiveIt: true },
		outbox: { pending: 0, dead: 1 },
		accessRequests: [
			{
				id: 3,
				username: 'newbie',
				displayName: 'Newbie',
				message: 'I map the CAS rooms.',
				createdAt: '2026-10-07 09:00:00'
			}
		]
	})
}));
vi.mock('#lib/utils/context.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/utils/context.js')>()),
	getAdminAuthStore: () => adminAuthStore
}));

const adminAuthStore = new AdminAuthStore({
	modalStore: { closeModal: () => {} } as unknown as ModalStore,
	plannerStore: new PlannerStore(() => null),
	proposalsStore: new ProposalsStore(() => adminAuthStore.canReview)
});

describe('staff home', () => {
	beforeEach(() => {
		adminAuthStore.isLoggedIn = true;
		adminAuthStore.canReview = true;
		adminAuthStore.role = 'admin';
		adminAuthStore.displayName = 'Stimmie';
	});

	test('signed out shows a sign-in message and no data', () => {
		adminAuthStore.canReview = false;
		render(Page);
		expect(screen.getByText(/Sign in as an editor/)).toBeVisible();
		expect(screen.queryByTestId('pending-reviews')).toBeNull();
	});

	test('admin sees the queue, digest, activity and access requests at 360px', async () => {
		mountAtWidth(360);
		const { container } = render(Page);
		expect(await screen.findByTestId('pending-reviews')).toHaveTextContent('4');
		expect(screen.getByRole('link', { name: 'Open review queue' })).toHaveAttribute(
			'href',
			'/map/admin/suggestions'
		);
		expect(screen.getByText(/goes to 3 editors/)).toBeVisible();
		expect(screen.getByText('Updated CEM 203')).toBeVisible();
		expect(screen.getByText('I map the CAS rooms.')).toBeVisible();
		expect(screen.getByRole('button', { name: 'Manage users' })).toBeVisible();
		expect(screen.getByRole('link', { name: 'Audit log' })).toHaveAttribute(
			'href',
			'/map/admin/audit-log'
		);
		expectNoHorizontalOverflow(container.firstElementChild as HTMLElement);
	});
});
