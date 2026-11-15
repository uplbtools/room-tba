import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import EditorShelf from './EditorShelf.svelte';
import AdminAuthStore from '#lib/stores/new/data/AdminAuthStore.svelte.js';
import PlannerStore from '#lib/stores/new/data/PlannerStore.svelte.js';
import ProposalsStore from '#lib/stores/new/data/ProposalsStore.svelte.js';
import type ModalStore from '#lib/stores/new/ui/ModalStore.svelte.js';
import ToastStore from '#lib/stores/new/ui/ToastStore.svelte.js';
import { mountAtWidth } from '@test/layout-assertions';

vi.mock('$env/dynamic/public', () => ({ env: {} }));
vi.mock('#lib/utils/context.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/utils/context.js')>()),
	getAdminAuthStore: () => adminAuthStore,
	getProposalsStore: () => proposalsStore,
	getToast: () => toastStore
}));

const modalStore = { closeModal: vi.fn() };
const proposalsStore: ProposalsStore = new ProposalsStore(() => adminAuthStore.canReview);
const adminAuthStore: AdminAuthStore = new AdminAuthStore({
	modalStore: modalStore as unknown as ModalStore,
	plannerStore: new PlannerStore(() => null),
	proposalsStore
});
const toastStore = new ToastStore();

describe('EditorShelf', () => {
	beforeEach(() => {
		adminAuthStore.isLoggedIn = true;
		adminAuthStore.username = 'e2e-admin';
		adminAuthStore.displayName = 'E2E Admin';
		adminAuthStore.role = 'admin';
		adminAuthStore.canPublish = true;
		adminAuthStore.canReview = true;
		adminAuthStore.manageUsersOpen = false;
		proposalsStore.pendingCount = 2;
	});

	test('editor shelf renders signed-in controls at 320px', () => {
		mountAtWidth(320);
		render(EditorShelf);
		expect(screen.getByRole('button', { name: /sign out/i })).toBeVisible();
		expect(screen.getByText(/signed in as admin/i)).toBeVisible();
		expect(screen.getByRole('button', { name: /account settings/i })).toBeVisible();
	});

	test('review link goes to the suggestions queue with the pending count', () => {
		render(EditorShelf);
		const link = screen.getByRole('link', { name: /review suggested edits/i });
		expect(link.getAttribute('href')).toBe('/map/admin/suggestions');
		expect(link.textContent).toContain('2');
	});

	test('admins can open manage users and close the dialog', async () => {
		const onclose = vi.fn();
		render(EditorShelf, { props: { onclose } });
		await fireEvent.click(screen.getByRole('button', { name: /manage users/i }));
		expect(adminAuthStore.manageUsersOpen).toBe(true);
		expect(onclose).toHaveBeenCalled();
	});

	test('editors do not see manage users', () => {
		adminAuthStore.role = 'editor';
		render(EditorShelf);
		expect(screen.queryByRole('button', { name: /manage users/i })).toBeNull();
	});
});
