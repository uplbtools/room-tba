import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import AdminLoginModal from '#lib/components/AdminLoginModal.svelte';
import AdminAuthStore from '#lib/stores/new/data/AdminAuthStore.svelte.js';
import PlannerStore from '#lib/stores/new/data/PlannerStore.svelte.js';
import ProposalsStore from '#lib/stores/new/data/ProposalsStore.svelte.js';
import type ModalStore from '#lib/stores/new/ui/ModalStore.svelte.js';
import ToastStore from '#lib/stores/new/ui/ToastStore.svelte.js';

vi.mock('$env/dynamic/public', () => ({ env: {} }));
vi.mock('#lib/utils/context.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/utils/context.js')>()),
	getAdminAuthStore: () => adminAuthStore,
	getProposalsStore: () => proposalsStore,
	getToast: () => toastStore
}));

const proposalsStore = new ProposalsStore(() => adminAuthStore.canReview);
const adminAuthStore = new AdminAuthStore({
	modalStore: { closeModal: () => {} } as unknown as ModalStore,
	plannerStore: new PlannerStore(() => null),
	proposalsStore
});
const toastStore = new ToastStore();
import { expectNoHorizontalOverflow, mountAtWidth } from '@test/layout-assertions';

describe('AdminLoginModal', () => {
	beforeEach(() => {
		adminAuthStore.openLogin();
	});

	test('login frame fits 320px viewport without horizontal scroll', () => {
		mountAtWidth(320);
		render(AdminLoginModal);
		const frame = document.querySelector('.login-frame') as HTMLElement;
		expect(frame).toBeTruthy();
		expectNoHorizontalOverflow(frame);
		expect(screen.getByLabelText('Username or email')).toBeVisible();
		expect(screen.getByLabelText('Password')).toBeVisible();
		expect(screen.getByRole('link', { name: /Message maintainers/i })).toHaveAttribute(
			'href',
			'https://m.me/j/AbZtqMU8UUTiwQfn/'
		);
	});

	test('the "Sign up" toggle reveals the contributor signup form', async () => {
		render(AdminLoginModal);
		// Sign-in mode: no confirm-password field yet.
		expect(screen.queryByLabelText('Confirm password')).toBeNull();

		await fireEvent.click(screen.getByRole('button', { name: /^Sign up$/i }));

		expect(screen.getByLabelText('Username')).toBeVisible();
		expect(screen.getByLabelText('Confirm password')).toBeVisible();
		expect(screen.getByLabelText('Email (optional)')).toBeVisible();
		expect(screen.getByRole('button', { name: /Create account/i })).toBeVisible();

		// And back again.
		await fireEvent.click(screen.getByRole('button', { name: /^Sign in$/i }));
		expect(screen.queryByLabelText('Confirm password')).toBeNull();
	});
});
