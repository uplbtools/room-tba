import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import AppMenu from './AppMenu.svelte';
import AdminAuthStore from '#lib/stores/new/data/AdminAuthStore.svelte.js';
import OfflineStore from '#lib/stores/new/data/OfflineStore.svelte.js';
import PlannerStore from '#lib/stores/new/data/PlannerStore.svelte.js';
import ProposalsStore from '#lib/stores/new/data/ProposalsStore.svelte.js';
import { MapToolsStore } from '#lib/stores/new/map/map-stores.svelte.js';
import type ModalStore from '#lib/stores/new/ui/ModalStore.svelte.js';
import ToastStore from '#lib/stores/new/ui/ToastStore.svelte.js';

vi.mock('$env/dynamic/public', () => ({ env: {} }));
vi.mock('#lib/utils/context.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/utils/context.js')>()),
	getAdminAuthStore: () => adminAuthStore,
	getMapToolsStore: () => mapToolsStore,
	getModalStore: () => modalStore,
	getOfflineStore: () => offlineStore,
	getProposalsStore: () => proposalsStore,
	getToast: () => toastStore
}));

const modalStore = {
	open: false,
	type: null as string | null,
	landingTab: null as unknown,
	openModal(type: string, data?: { landingTab?: unknown }) {
		this.open = true;
		this.type = type;
		this.landingTab = data?.landingTab ?? null;
	},
	closeModal() {
		this.open = false;
		this.type = null;
		this.landingTab = null;
	}
};
const proposalsStore: ProposalsStore = new ProposalsStore(() => adminAuthStore.canReview);
const adminAuthStore: AdminAuthStore = new AdminAuthStore({
	modalStore: modalStore as unknown as ModalStore,
	plannerStore: new PlannerStore(() => null),
	proposalsStore
});
const mapToolsStore = new MapToolsStore();
const offlineStore = new OfflineStore();
const toastStore = new ToastStore();

describe('AppMenu review entry', () => {
	beforeEach(() => {
		modalStore.closeModal();
		adminAuthStore.canReview = false;
		proposalsStore.pendingCount = 0;
	});

	test('reviewers get a review entry that opens the review modal with the pending count', async () => {
		adminAuthStore.canReview = true;
		proposalsStore.pendingCount = 3;
		render(AppMenu, { props: { onSignOut: () => {} } });

		await fireEvent.click(screen.getByRole('button', { name: /app menu/i }));

		const reviewBtn = screen.getByRole('button', {
			name: /review suggested edits/i
		});
		expect(reviewBtn).toBeVisible();
		expect(reviewBtn.textContent).toContain('3');

		await fireEvent.click(reviewBtn);
		expect(modalStore.open).toBe(true);
		expect(modalStore.type).toBe('review');
	});

	test('non-reviewers do not see the review entry', async () => {
		adminAuthStore.canReview = false;
		render(AppMenu, { props: { onSignOut: () => {} } });

		await fireEvent.click(screen.getByRole('button', { name: /app menu/i }));

		expect(screen.queryByRole('button', { name: /review suggested edits/i })).toBeNull();
	});
});

describe('AppMenu help entry', () => {
	beforeEach(() => {
		modalStore.closeModal();
		adminAuthStore.canReview = false;
	});

	test('Help & FAQ links to the student FAQ page', async () => {
		render(AppMenu, { props: { onSignOut: () => {} } });
		await fireEvent.click(screen.getByRole('button', { name: /app menu/i }));
		const faq = screen.getByRole('link', { name: /help & faq/i });
		expect(faq).toBeVisible();
		expect(faq).toHaveAttribute('href', '/faq');
	});

	test("'How Room TBA works' opens the landing modal on the welcome tab", async () => {
		render(AppMenu, { props: { onSignOut: () => {} } });
		await fireEvent.click(screen.getByRole('button', { name: /app menu/i }));
		await fireEvent.click(screen.getByRole('button', { name: /how room tba works/i }));
		expect(modalStore.open).toBe(true);
		expect(modalStore.type).toBe('landing');
		expect(modalStore.landingTab).toBe('welcome');
	});
});
