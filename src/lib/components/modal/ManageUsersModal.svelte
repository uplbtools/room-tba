<script lang="ts">
	import LoadingIndicator from '#lib/components/LoadingIndicator.svelte';
	import IconButton from '#lib/components/IconButton.svelte';
	import { fade, fly } from 'svelte/transition';
	import { X, Users } from '@lucide/svelte';
	import { getAdminAuthStore, getToast } from '#lib/utils/context.js';
	import { modalContentDismiss, modalContentReveal, overlayFade } from '#lib/utils/motion.js';
	import { trapFocus } from '#lib/utils/focus-trap.js';
	import EntityEditorFormField from '#lib/components/editor/EntityEditorFormField.svelte';
	import EntityEditorSubmitButton from '#lib/components/editor/EntityEditorSubmitButton.svelte';
	import EntityEditorMessage from '#lib/components/editor/EntityEditorMessage.svelte';
	import '../editor/entity-editor.css';
	import { MediaQuery } from 'svelte/reactivity';

	const adminAuthStore = getAdminAuthStore();
	const toastStore = getToast();
	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');

	type ManagedUser = {
		id: number;
		username: string;
		displayName: string;
		email: string | null;
		role: 'admin' | 'editor' | 'contributor';
		isActive: boolean;
	};

	let frameEl = $state<HTMLDivElement | null>(null);
	let users = $state<ManagedUser[] | null>(null);
	let loadError = $state<string | null>(null);
	let rowError = $state<string | null>(null);
	let savingUserId = $state<number | null>(null);

	type PendingInvite = { id: number; email: string; role: ManagedUser['role']; expiresAt: string };
	let invites = $state<PendingInvite[]>([]);

	type AccessRequest = { id: number; displayName: string; username: string; message: string };
	let accessRequests = $state<AccessRequest[]>([]);

	let showCreateForm = $state(false);
	let newDisplayName = $state('');
	let newEmail = $state('');
	let newRole = $state<'admin' | 'editor' | 'contributor'>('editor');
	let creating = $state(false);
	let createError = $state<string | null>(null);
	let manualInviteUrl = $state<string | null>(null);

	async function loadUsers() {
		loadError = null;
		try {
			const res = await fetch('/api/admin/users', { credentials: 'same-origin' });
			if (!res.ok) {
				loadError = 'Could not load users.';
				return;
			}
			const data = (await res.json()) as {
				users: ManagedUser[];
				invites?: PendingInvite[];
				accessRequests?: AccessRequest[];
			};
			users = data.users;
			invites = data.invites ?? [];
			accessRequests = data.accessRequests ?? [];
		} catch {
			loadError = 'Network error loading users.';
		}
	}

	$effect(() => {
		if (adminAuthStore.manageUsersOpen) void loadUsers();
	});

	function close() {
		adminAuthStore.closeManageUsers();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}

	$effect(() => {
		if (!frameEl) return;
		return trapFocus(frameEl, { onEscape: close });
	});

	async function changeRole(user: ManagedUser, role: ManagedUser['role']) {
		if (role === user.role) return;
		savingUserId = user.id;
		rowError = null;
		try {
			const res = await fetch(`/api/admin/users/${user.id}`, {
				method: 'PATCH',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role })
			});
			const data = await res.json().catch(() => ({}) as { error?: string });
			if (!res.ok) {
				rowError = data.error ?? 'Could not update role.';
				return;
			}
			users = (users ?? []).map((u) => (u.id === user.id ? { ...u, role } : u));
		} catch {
			rowError = 'Network error. Try again.';
		} finally {
			savingUserId = null;
		}
	}

	async function toggleActive(user: ManagedUser) {
		savingUserId = user.id;
		rowError = null;
		try {
			const res = await fetch(`/api/admin/users/${user.id}`, {
				method: 'PATCH',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isActive: !user.isActive })
			});
			const data = await res.json().catch(() => ({}) as { error?: string });
			if (!res.ok) {
				rowError = data.error ?? 'Could not update account.';
				return;
			}
			users = (users ?? []).map((u) => (u.id === user.id ? { ...u, isActive: !user.isActive } : u));
		} catch {
			rowError = 'Network error. Try again.';
		} finally {
			savingUserId = null;
		}
	}

	async function decideRequest(id: number, decision: 'approved' | 'declined') {
		savingUserId = id;
		rowError = null;
		try {
			const res = await fetch(`/api/admin/access-requests/${id}`, {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ decision })
			});
			if (!res.ok) {
				const data = (await res.json().catch(() => ({}))) as { error?: string };
				rowError = data.error ?? "Couldn't update the request.";
			}
			await loadUsers();
		} catch {
			rowError = 'Network error. Try again.';
		} finally {
			savingUserId = null;
		}
	}

	async function revokeInvite(id: number) {
		rowError = null;
		try {
			const res = await fetch(`/api/admin/users/invite?id=${id}`, {
				method: 'DELETE',
				credentials: 'same-origin'
			});
			if (!res.ok) {
				rowError = "Couldn't revoke the invite.";
				return;
			}
			invites = invites.filter((invite) => invite.id !== id);
		} catch {
			rowError = 'Network error. Try again.';
		}
	}

	async function sendInvite() {
		creating = true;
		createError = null;
		manualInviteUrl = null;
		try {
			const res = await fetch('/api/admin/users/invite', {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: newEmail,
					displayName: newDisplayName || undefined,
					role: newRole
				})
			});
			const data = (await res.json().catch(() => ({}))) as {
				error?: string;
				emailed?: boolean;
				inviteUrl?: string | null;
			};
			if (!res.ok) {
				createError = data.error ?? "Couldn't send the invite.";
				return;
			}
			if (data.emailed) {
				toastStore.show(`Invite sent to ${newEmail}.`, 'success');
				showCreateForm = false;
			} else {
				manualInviteUrl = data.inviteUrl ?? null;
			}
			newDisplayName = '';
			newEmail = '';
			newRole = 'editor';
			await loadUsers();
		} catch {
			createError = 'Network error. Try again.';
		} finally {
			creating = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="settings-overlay" transition:fade={overlayFade(reducedMotion.current)}>
	<div
		bind:this={frameEl}
		class="settings-frame"
		role="dialog"
		aria-modal="true"
		aria-labelledby="manage-users-title"
		in:fly={modalContentReveal(reducedMotion.current)}
		out:fly={modalContentDismiss(reducedMotion.current)}
	>
		<header class="settings-header">
			<div class="settings-title" id="manage-users-title">
				<Users size={16} aria-hidden="true" />
				<span>Manage users</span>
			</div>
			<IconButton size="sm" shape="rounded" label="Close" onclick={close}>
				<X size={18} aria-hidden="true" />
			</IconButton>
		</header>

		<div class="settings-body">
			{#if loadError}
				<EntityEditorMessage variant="error" message={loadError} />
			{:else if !users}
				<p class="settings-loading"><LoadingIndicator /></p>
			{:else}
				{#if rowError}
					<EntityEditorMessage variant="error" message={rowError} />
				{/if}
				<ul class="user-list">
					{#each users as user (user.id)}
						<li class="user-row" class:user-row--inactive={!user.isActive}>
							<div class="user-row-info">
								<strong>{user.displayName}</strong>
								<small>{user.username}{user.email ? ` · ${user.email}` : ''}</small>
							</div>
							<select
								value={user.role}
								disabled={savingUserId === user.id}
								onchange={(e) =>
									changeRole(
										user,
										(e.currentTarget as HTMLSelectElement).value as ManagedUser['role']
									)}
							>
								<option value="admin">Admin</option>
								<option value="editor">Editor</option>
								<option value="contributor">Contributor</option>
							</select>
							<button
								type="button"
								class="settings-link-btn"
								disabled={savingUserId === user.id}
								onclick={() => toggleActive(user)}
							>
								{user.isActive ? 'Deactivate' : 'Reactivate'}
							</button>
						</li>
					{/each}
				</ul>

				{#if accessRequests.length > 0}
					<section class="settings-section">
						<h3>Editor access requests</h3>
						<ul class="user-list">
							{#each accessRequests as request (request.id)}
								<li class="user-row">
									<div class="user-row-info">
										<strong>{request.displayName}</strong>
										<small>{request.username}</small>
										<p class="request-message">{request.message}</p>
									</div>
									<button
										type="button"
										class="settings-link-btn"
										disabled={savingUserId === request.id}
										onclick={() => decideRequest(request.id, 'declined')}
									>
										Decline
									</button>
									<button
										type="button"
										class="settings-link-btn"
										disabled={savingUserId === request.id}
										onclick={() => decideRequest(request.id, 'approved')}
									>
										Make editor
									</button>
								</li>
							{/each}
						</ul>
					</section>
				{/if}

				{#if invites.length > 0}
					<section class="settings-section">
						<h3>Pending invites</h3>
						<ul class="user-list">
							{#each invites as invite (invite.id)}
								<li class="user-row">
									<div class="user-row-info">
										<strong>{invite.email}</strong>
										<small>
											{invite.role}, expires {new Date(
												`${invite.expiresAt.replace(' ', 'T')}Z`
											).toLocaleDateString()}
										</small>
									</div>
									<button
										type="button"
										class="settings-link-btn"
										onclick={() => revokeInvite(invite.id)}
									>
										Revoke
									</button>
								</li>
							{/each}
						</ul>
					</section>
				{/if}

				{#if !showCreateForm}
					<EntityEditorSubmitButton
						label="Invite admin / editor"
						variant="secondary"
						onclick={() => (showCreateForm = true)}
					/>
				{:else}
					<section class="settings-section entity-editor-form">
						<h3>Invite admin / editor</h3>
						<EntityEditorFormField label="Display name" inputId="new-user-display-name">
							{#snippet control()}
								<input id="new-user-display-name" bind:value={newDisplayName} disabled={creating} />
							{/snippet}
						</EntityEditorFormField>
						<EntityEditorFormField label="Email" inputId="new-user-email">
							{#snippet control()}
								<input id="new-user-email" type="email" bind:value={newEmail} disabled={creating} />
							{/snippet}
						</EntityEditorFormField>
						<EntityEditorFormField label="Role" inputId="new-user-role">
							{#snippet control()}
								<select id="new-user-role" bind:value={newRole} disabled={creating}>
									<option value="admin">Admin</option>
									<option value="editor">Editor</option>
									<option value="contributor">Contributor</option>
								</select>
							{/snippet}
						</EntityEditorFormField>
						{#if createError}
							<EntityEditorMessage variant="error" message={createError} />
						{/if}
						{#if manualInviteUrl}
							<EntityEditorMessage
								variant="error"
								message="The invite email couldn't be sent. Share this one-time link with them directly."
							/>
							<input
								readonly
								value={manualInviteUrl}
								aria-label="Invite link"
								onfocus={(e) => e.currentTarget.select()}
							/>
						{/if}
						<div class="settings-danger-actions">
							<EntityEditorSubmitButton
								label="Send invite"
								savingLabel="Sending…"
								saving={creating}
								disabled={!newEmail.trim()}
								onclick={sendInvite}
							/>
							<EntityEditorSubmitButton
								label="Cancel"
								variant="secondary"
								disabled={creating}
								onclick={() => {
									showCreateForm = false;
									manualInviteUrl = null;
								}}
							/>
						</div>
					</section>
				{/if}
			{/if}
		</div>
	</div>
</div>

<style>
	.settings-overlay {
		position: fixed;
		inset: 0;
		background-color: rgba(8, 12, 22, 0.55);
		z-index: var(--z-login-modal, 200);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}
	.settings-frame {
		width: min(28rem, 100%);
		max-height: min(38rem, 90vh);
		background: white;
		border-radius: 0.75rem;
		box-shadow: 0 18px 38px rgba(0, 0, 0, 0.3);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}
	.settings-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid hsl(0, 0%, 92%);
	}
	.settings-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		color: hsl(0, 0%, 15%);
	}
	.settings-body {
		padding: 1rem;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.settings-loading {
		margin: 0;
		color: hsl(0, 0%, 45%);
	}
	.settings-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.settings-section h3 {
		margin: 0 0 0.25rem;
		font-size: 0.875rem;
		font-weight: 700;
		color: hsl(5, 53%, 32%);
	}
	.settings-link-btn {
		background: none;
		border: none;
		padding: 0;
		color: hsl(5, 53%, 32%);
		font-weight: 600;
		font-size: 0.75rem;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.settings-danger-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.user-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.user-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		border: 1px solid hsl(0, 0%, 92%);
		border-radius: 0.5rem;
	}
	.user-row--inactive {
		opacity: 0.55;
	}
	.user-row-info {
		display: flex;
		flex-direction: column;
		flex: 1 1 auto;
		min-width: 0;
	}
	.user-row-info strong {
		font-size: 0.8125rem;
	}
	.request-message {
		margin: 0.25rem 0 0;
		font-size: 0.75rem;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.user-row-info small {
		font-size: 0.6875rem;
		color: hsl(0, 0%, 45%);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
