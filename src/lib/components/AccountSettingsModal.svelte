<script lang="ts">
	import LoadingIndicator from '$lib/components/LoadingIndicator.svelte';
	import IconButton from '$lib/components/IconButton.svelte';
	import { fade, fly } from 'svelte/transition';
	import { X, User2 } from '@lucide/svelte';
	import { adminAuthStore, toastStore } from '$lib/stores.svelte';
	import { modalContentDismiss, modalContentReveal, overlayFade } from '$lib/utils/motion';
	import { trapFocus } from '$lib/utils/focus-trap';
	import EntityEditorFormField from '$lib/components/editor/EntityEditorFormField.svelte';
	import EntityEditorSubmitButton from '$lib/components/editor/EntityEditorSubmitButton.svelte';
	import EntityEditorMessage from '$lib/components/editor/EntityEditorMessage.svelte';
	import ImageUpload from '$lib/components/editor/ImageUpload.svelte';
	import './editor/entity-editor.css';
	import { MediaQuery } from 'svelte/reactivity';
	import {
		SOCIAL_KIND_METADATA,
		SOCIAL_KINDS,
		type SocialKind
	} from '$lib/utils/contributor-profile';

	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');

	type Profile = {
		username: string;
		displayName: string;
		email: string | null;
		role: 'admin' | 'editor' | 'contributor';
		hasPassword: boolean;
		linkedGoogle: boolean;
		avatarUrl: string | null;
		profileUrl: string | null;
		showInCredits: boolean;
	};

	type EditableProfile = {
		displayName: string;
		role: 'Admin' | 'Editor' | 'Contributor';
		bio: string;
		isPublic: boolean;
		showInCredits: boolean;
		avatarUrl: string | null;
		version: number;
		socialLinks: Array<{
			id: number;
			kind: SocialKind;
			label: string | null;
			url: string;
			isPublic: boolean;
			createdAt: string;
			updatedAt: string;
		}>;
	};

	type SocialDraft = {
		kind: SocialKind;
		label: string | null;
		url: string;
		isPublic: boolean;
	};

	type Contribution = {
		id: number;
		entityLabel: string;
		createdAt: string;
	};

	let frameEl = $state<HTMLDivElement | null>(null);
	let profile = $state<Profile | null>(null);
	let contributorProfile = $state<EditableProfile | null>(null);
	let loadError = $state<string | null>(null);
	let contributions = $state<Contribution[]>([]);
	let contributionsError = $state<string | null>(null);
	let isOnline = $state(true);

	let avatarUrlDraft = $state('');
	let profileUrlDraft = $state('');
	let bioDraft = $state('');
	let isPublicDraft = $state(false);
	let showInCreditsDraft = $state(true);
	let socialLinksDraft = $state<SocialDraft[]>([]);
	let messagingDisclosureAcknowledgedDraft = $state(false);
	let savingProfile = $state(false);
	let profileError = $state<string | null>(null);
	let profileSaved = $state(false);
	let conflictProfile = $state<EditableProfile | null>(null);

	let newEmailDraft = $state('');
	let showChangeEmail = $state(false);
	let emailRequestPending = $state(false);
	let emailRequestSent = $state(false);
	let emailError = $state<string | null>(null);

	let currentPasswordDraft = $state('');
	let newPasswordDraft = $state('');
	let savingPassword = $state(false);
	let passwordError = $state<string | null>(null);
	let passwordSaved = $state(false);

	let unlinkingGoogle = $state(false);
	let identityError = $state<string | null>(null);

	let showDeleteConfirm = $state(false);
	let deletePasswordDraft = $state('');
	let deleting = $state(false);
	let deleteError = $state<string | null>(null);

	function setProfileDraft(next: EditableProfile) {
		contributorProfile = next;
		avatarUrlDraft = next.avatarUrl ?? '';
		bioDraft = next.bio;
		isPublicDraft = next.isPublic;
		showInCreditsDraft = next.showInCredits;
		socialLinksDraft = next.socialLinks.map(({ kind, label, url, isPublic }) => ({
			kind,
			label,
			url,
			isPublic
		}));
		messagingDisclosureAcknowledgedDraft = false;
	}

	function addSocialLink(kind: SocialKind) {
		if (kind !== 'website' && kind !== 'custom' && socialLinksDraft.some((link) => link.kind === kind)) return;
		socialLinksDraft = [
			...socialLinksDraft,
			{
				kind,
				label: kind === 'custom' ? '' : null,
				url: '',
				isPublic: SOCIAL_KIND_METADATA[kind].defaultPublic
			}
		];
	}

	function removeSocialLink(index: number) {
		socialLinksDraft = socialLinksDraft.filter((_, linkIndex) => linkIndex !== index);
	}

	function updateSocialLink(index: number, patch: Partial<SocialDraft>) {
		socialLinksDraft = socialLinksDraft.map((link, linkIndex) =>
			linkIndex === index ? { ...link, ...patch } : link
		);
	}

	function socialIndices(kind: SocialKind) {
		return socialLinksDraft
			.map((link, index) => (link.kind === kind ? index : -1))
			.filter((index) => index >= 0);
	}

	function hasPublicMessagingLink() {
		return socialLinksDraft.some(
			(link) => (link.kind === 'messenger' || link.kind === 'discord') && link.isPublic
		);
	}

	function profileChanged() {
		if (!contributorProfile) return false;
		const currentLinks = contributorProfile.socialLinks.map(({ kind, label, url, isPublic }) => ({
			kind,
			label,
			url,
			isPublic
		}));
		return (
			bioDraft.trim() !== contributorProfile.bio ||
			isPublicDraft !== contributorProfile.isPublic ||
			showInCreditsDraft !== contributorProfile.showInCredits ||
			JSON.stringify(socialLinksDraft) !== JSON.stringify(currentLinks) ||
			avatarUrlDraft.trim() !== (contributorProfile.avatarUrl ?? '')
		);
	}

	async function loadProfile() {
		loadError = null;
		contributionsError = null;
		contributions = [];
		try {
			const [accountRes, contributorRes, contributionsRes] = await Promise.all([
				fetch('/api/account/me', { credentials: 'same-origin' }),
				fetch('/api/contributors/me', { credentials: 'same-origin' }),
				fetch('/api/contributions/mine', { credentials: 'same-origin' })
			]);
			if (!accountRes.ok || !contributorRes.ok) {
				loadError = 'Could not load your account.';
				return;
			}
			profile = (await accountRes.json()) as Profile;
			const contributor = (await contributorRes.json()) as EditableProfile;
			avatarUrlDraft = contributor.avatarUrl ?? '';
			profileUrlDraft = profile.profileUrl ?? '';
			setProfileDraft(contributor);
			if (contributionsRes.ok) {
				const data = (await contributionsRes.json()) as { contributions?: Contribution[] };
				contributions = data.contributions ?? [];
			} else {
				contributionsError = 'Could not load your contributions.';
			}
		} catch {
			loadError = 'Network error loading your account.';
		}
	}

	$effect(() => {
		if (adminAuthStore.accountSettingsOpen) void loadProfile();
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		const updateOnlineState = () => (isOnline = navigator.onLine);
		updateOnlineState();
		window.addEventListener('online', updateOnlineState);
		window.addEventListener('offline', updateOnlineState);
		return () => {
			window.removeEventListener('online', updateOnlineState);
			window.removeEventListener('offline', updateOnlineState);
		};
	});

	function close() {
		adminAuthStore.closeAccountSettings();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}

	$effect(() => {
		if (!frameEl) return;
		return trapFocus(frameEl, { onEscape: close });
	});

	function reloadConflict() {
		if (!conflictProfile) return;
		setProfileDraft(conflictProfile);
		conflictProfile = null;
		profileError = null;
	}

	async function saveProfile() {
		if (!profile || !contributorProfile || !isOnline || savingProfile) return;
		savingProfile = true;
		profileError = null;
		profileSaved = false;
		conflictProfile = null;
		try {
			const res = await fetch('/api/contributors/me', {
				method: 'PUT',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					version: contributorProfile.version,
					bio: bioDraft,
					isPublic: isPublicDraft,
					showInCredits: showInCreditsDraft,
					messagingDisclosureAcknowledged: messagingDisclosureAcknowledgedDraft,
					socialLinks: socialLinksDraft
				})
			});
			const data = (await res.json().catch(() => null)) as
				| (EditableProfile & { error?: string; profile?: EditableProfile })
				| null;
			if (res.status === 409 && data?.profile) {
				conflictProfile = data.profile;
				profileError = data.error ?? 'Profile changed on the server. Reload to continue.';
				return;
			}
			if (!res.ok || !data) {
				profileError = data?.error ?? 'Could not save profile.';
				return;
			}
			const nextAvatarUrl = avatarUrlDraft.trim() || null;
			const accountAvatarChanged = nextAvatarUrl !== profile.avatarUrl;
			const savedContributorProfile = data as EditableProfile;
			setProfileDraft(savedContributorProfile);
			if (accountAvatarChanged) {
				// Keep pending account avatar change intact while contributor state advances.
				avatarUrlDraft = nextAvatarUrl ?? '';
				const accountRes = await fetch('/api/account/me', {
					method: 'PATCH',
					credentials: 'same-origin',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						displayName: profile.displayName,
						avatarUrl: nextAvatarUrl
					})
				});
				if (!accountRes.ok) {
					const accountData = (await accountRes.json().catch(() => ({}))) as { error?: string };
					profileError = accountData.error ?? 'Profile saved, but account photo could not be saved.';
					return;
				}
				setProfileDraft({ ...savedContributorProfile, avatarUrl: nextAvatarUrl });
			}
			profile = {
				...profile,
				avatarUrl: nextAvatarUrl,
				profileUrl: profileUrlDraft.trim() || null,
				showInCredits: showInCreditsDraft
			};
			await adminAuthStore.refresh();
			profileSaved = true;
			setTimeout(() => {
				profileSaved = false;
			}, 1800);
		} catch {
			profileError = 'Network error. Try again.';
		} finally {
			savingProfile = false;
		}
	}

	async function requestEmailChange() {
		emailRequestPending = true;
		emailError = null;
		emailRequestSent = false;
		try {
			const res = await fetch('/api/account/request-email-change', {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ newEmail: newEmailDraft })
			});
			const data = await res.json().catch(() => ({}) as { error?: string });
			if (!res.ok) {
				emailError = data.error ?? 'Could not send confirmation email.';
				return;
			}
			emailRequestSent = true;
			newEmailDraft = '';
		} catch {
			emailError = 'Network error. Try again.';
		} finally {
			emailRequestPending = false;
		}
	}

	async function savePassword() {
		if (!profile) return;
		savingPassword = true;
		passwordError = null;
		passwordSaved = false;
		try {
			const res = await fetch('/api/account/change-password', {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					currentPassword: profile.hasPassword ? currentPasswordDraft : undefined,
					newPassword: newPasswordDraft
				})
			});
			const data = await res.json().catch(() => ({}) as { error?: string });
			if (!res.ok) {
				passwordError = data.error ?? 'Could not change password.';
				return;
			}
			currentPasswordDraft = '';
			newPasswordDraft = '';
			profile = { ...profile, hasPassword: true };
			passwordSaved = true;
			setTimeout(() => {
				passwordSaved = false;
			}, 1800);
		} catch {
			passwordError = 'Network error. Try again.';
		} finally {
			savingPassword = false;
		}
	}

	async function connectGoogle() {
		identityError = null;
		const err = await adminAuthStore.linkGoogle();
		if (err) identityError = err;
	}

	async function disconnectGoogle() {
		if (!profile) return;
		unlinkingGoogle = true;
		identityError = null;
		try {
			const res = await fetch('/api/account/unlink-google', {
				method: 'POST',
				credentials: 'same-origin'
			});
			const data = await res.json().catch(() => ({}) as { error?: string });
			if (!res.ok) {
				identityError = data.error ?? 'Could not disconnect Google.';
				return;
			}
			profile = { ...profile, linkedGoogle: false };
			toastStore.show('Google account disconnected.', 'success');
		} catch {
			identityError = 'Network error. Try again.';
		} finally {
			unlinkingGoogle = false;
		}
	}

	function downloadExport() {
		window.open('/api/account/export', '_blank', 'noopener,noreferrer');
	}

	async function confirmDelete() {
		if (!profile) return;
		deleting = true;
		deleteError = null;
		try {
			const res = await fetch('/api/account/delete', {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					currentPassword: profile.hasPassword ? deletePasswordDraft : undefined
				})
			});
			const data = await res.json().catch(() => ({}) as { error?: string });
			if (!res.ok) {
				deleteError = data.error ?? 'Could not delete account.';
				return;
			}
			close();
			await adminAuthStore.logout();
			toastStore.show('Your account has been deleted.', 'success');
		} catch {
			deleteError = 'Network error. Try again.';
		} finally {
			deleting = false;
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
		aria-labelledby="account-settings-title"
		in:fly={modalContentReveal(reducedMotion.current)}
		out:fly={modalContentDismiss(reducedMotion.current)}
	>
		<header class="settings-header">
			<div class="settings-title" id="account-settings-title">
				<User2 size={16} aria-hidden="true" />
				<span>Account settings</span>
			</div>
			<IconButton size="sm" shape="rounded" label="Close account settings" onclick={close}>
				<X size={18} aria-hidden="true" />
			</IconButton>
		</header>

		<div class="settings-body">
			{#if loadError}
				<EntityEditorMessage variant="error" message={loadError} />
			{:else if !profile}
				<p class="settings-loading"><LoadingIndicator /></p>
			{:else}
				<section class="settings-section entity-editor-form">
					<h3>Profile</h3>
					<EntityEditorFormField label="Username" inputId="account-username">
						{#snippet control()}
							<input id="account-username" value={profile?.username ?? ''} disabled />
						{/snippet}
					</EntityEditorFormField>
					<EntityEditorFormField label="Role" inputId="account-role">
						{#snippet control()}
							<input id="account-role" value={profile?.role ?? ''} disabled />
						{/snippet}
					</EntityEditorFormField>
					<EntityEditorFormField label="Display name" inputId="account-display-name">
						{#snippet control()}
							<input id="account-display-name" value={profile?.displayName ?? ''} disabled />
						{/snippet}
					</EntityEditorFormField>
					<ImageUpload
						inputId="account-avatar-upload"
						label="Profile photo"
						endpoint="/api/account/avatar"
						bind:value={avatarUrlDraft}
						disabled={savingProfile || !isOnline}
					/>
					<EntityEditorFormField label="Bio" inputId="contributor-bio" hint="Up to 280 characters.">
						{#snippet control()}
							<textarea
								id="contributor-bio"
								rows="4"
								maxlength="280"
								bind:value={bioDraft}
								disabled={savingProfile || !isOnline}
							></textarea>
						{/snippet}
					</EntityEditorFormField>
					<label class="credits-visibility">
						<input type="checkbox" bind:checked={isPublicDraft} disabled={savingProfile || !isOnline} />
						Make my contributor profile public
					</label>
					<label class="credits-visibility">
						<input type="checkbox" bind:checked={showInCreditsDraft} disabled={savingProfile || !isOnline} />
						Show my contributions in public credits
					</label>

					<div class="social-links" aria-labelledby="social-links-heading">
						<h4 id="social-links-heading">Social links</h4>
						<p class="field-hint">Only links marked public appear on your profile.</p>
						{#each SOCIAL_KINDS as kind}
							<div class="social-kind-group">
								<h5>{SOCIAL_KIND_METADATA[kind].label}</h5>
								{#each socialIndices(kind) as index (index)}
									<div class="social-row">
										{#if kind === 'custom'}
											<input
												aria-label="Custom link label"
												placeholder="Label"
												value={socialLinksDraft[index].label ?? ''}
												oninput={(event) =>
													updateSocialLink(index, {
														label: (event.currentTarget as HTMLInputElement).value
													})}
												disabled={savingProfile || !isOnline}
											/>
										{/if}
										<input
											type="url"
											aria-label={`${SOCIAL_KIND_METADATA[kind].label} URL`}
											placeholder="https://"
											value={socialLinksDraft[index].url}
											oninput={(event) =>
												updateSocialLink(index, {
													url: (event.currentTarget as HTMLInputElement).value
												})}
											disabled={savingProfile || !isOnline}
										/>
										<label class="social-public">
											<input
												type="checkbox"
												checked={socialLinksDraft[index].isPublic}
												onchange={(event) =>
													updateSocialLink(index, {
														isPublic: (event.currentTarget as HTMLInputElement).checked
													})}
												disabled={savingProfile || !isOnline}
											/>
											Public
										</label>
										<button
											type="button"
											class="settings-link-btn"
											onclick={() => removeSocialLink(index)}
											disabled={savingProfile || !isOnline}
										>
											Remove
										</button>
									</div>
								{/each}
								<button
									type="button"
									class="settings-link-btn"
									onclick={() => addSocialLink(kind)}
									disabled={savingProfile ||
										!isOnline ||
										(kind !== 'website' &&
											kind !== 'custom' &&
											socialLinksDraft.some((link) => link.kind === kind))}
								>
									Add {SOCIAL_KIND_METADATA[kind].label}
								</button>
							</div>
						{/each}
					</div>

					{#if hasPublicMessagingLink()}
						<label class="credits-visibility disclosure">
							<input
								type="checkbox"
								bind:checked={messagingDisclosureAcknowledgedDraft}
								disabled={savingProfile || !isOnline}
							/>
							I understand public messaging links let visitors contact me.
						</label>
					{/if}
					{#if !isOnline}
						<EntityEditorMessage
							variant="error"
							message="Profile editing requires a connection. Cached account and security controls remain available."
						/>
					{/if}
					{#if profileUrlDraft}
						<EntityEditorFormField label="Legacy credit URL" inputId="account-profile-url">
							{#snippet control()}
								<input id="account-profile-url" value={profileUrlDraft} disabled />
							{/snippet}
						</EntityEditorFormField>
					{/if}
					{#if profileError}
						<EntityEditorMessage variant="error" message={profileError} />
					{/if}
					{#if conflictProfile}
						<EntityEditorSubmitButton
							label="Reload server profile"
							variant="secondary"
							onclick={reloadConflict}
						/>
					{/if}
					{#if profileSaved}
						<EntityEditorMessage variant="success" message="Profile saved." />
					{/if}
					<EntityEditorSubmitButton
						label="Save profile"
						savingLabel="Saving…"
						saving={savingProfile}
						disabled={!isOnline || !contributorProfile || !profileChanged()}
						onclick={saveProfile}
					/>
					<section class="contributions-section" aria-labelledby="my-contributions-heading">
						<h4 id="my-contributions-heading">My contributions</h4>
						{#if contributionsError}
							<p>{contributionsError}</p>
						{:else if contributions.length === 0}
							<p>Your approved edits will appear here.</p>
						{:else}
							<ul>
								{#each contributions as contribution (contribution.id)}
									<li>
										<span>{contribution.entityLabel}</span>
										<time datetime={contribution.createdAt}>
											{new Date(contribution.createdAt).toLocaleDateString()}
										</time>
									</li>
								{/each}
							</ul>
						{/if}
					</section>

					<EntityEditorFormField label="Email" inputId="account-email">
						{#snippet control()}
							<input id="account-email" value={profile?.email ?? '(none)'} disabled />
						{/snippet}
					</EntityEditorFormField>
					{#if !showChangeEmail}
						<button
							type="button"
							class="settings-link-btn"
							onclick={() => (showChangeEmail = true)}
						>
							Change email
						</button>
					{:else}
						<EntityEditorFormField label="New email" inputId="account-new-email">
							{#snippet control()}
								<input
									id="account-new-email"
									type="email"
									bind:value={newEmailDraft}
									disabled={emailRequestPending}
								/>
							{/snippet}
						</EntityEditorFormField>
						{#if emailError}
							<EntityEditorMessage variant="error" message={emailError} />
						{/if}
						{#if emailRequestSent}
							<EntityEditorMessage
								variant="success"
								message="Check your new inbox for a confirmation link."
							/>
						{/if}
						<EntityEditorSubmitButton
							label="Send confirmation link"
							savingLabel="Sending…"
							saving={emailRequestPending}
							disabled={!newEmailDraft.trim()}
							onclick={requestEmailChange}
						/>
					{/if}
				</section>

				<section class="settings-section entity-editor-form">
					<h3>{profile.hasPassword ? 'Change password' : 'Set a password'}</h3>
					{#if profile.hasPassword}
						<EntityEditorFormField label="Current password" inputId="account-current-password">
							{#snippet control()}
								<input
									id="account-current-password"
									type="password"
									autocomplete="current-password"
									bind:value={currentPasswordDraft}
									disabled={savingPassword}
								/>
							{/snippet}
						</EntityEditorFormField>
					{/if}
					<EntityEditorFormField
						label="New password"
						inputId="account-new-password"
						hint="At least 10 characters."
					>
						{#snippet control()}
							<input
								id="account-new-password"
								type="password"
								autocomplete="new-password"
								bind:value={newPasswordDraft}
								disabled={savingPassword}
							/>
						{/snippet}
					</EntityEditorFormField>
					{#if passwordError}
						<EntityEditorMessage variant="error" message={passwordError} />
					{/if}
					{#if passwordSaved}
						<EntityEditorMessage variant="success" message="Password saved." />
					{/if}
					<EntityEditorSubmitButton
						label={profile.hasPassword ? 'Change password' : 'Set password'}
						savingLabel="Saving…"
						saving={savingPassword}
						disabled={newPasswordDraft.length < 10 ||
							(profile.hasPassword && !currentPasswordDraft)}
						onclick={savePassword}
					/>
				</section>

				<section class="settings-section entity-editor-form">
					<h3>Connected accounts</h3>
					{#if identityError}
						<EntityEditorMessage variant="error" message={identityError} />
					{/if}
					{#if profile.linkedGoogle}
						<p class="settings-status">Google is connected.</p>
						<EntityEditorSubmitButton
							label="Disconnect Google"
							savingLabel="Disconnecting…"
							saving={unlinkingGoogle}
							disabled={!profile.hasPassword}
							variant="secondary"
							onclick={disconnectGoogle}
						/>
						{#if !profile.hasPassword}
							<p class="field-hint">Set a password first to disconnect Google.</p>
						{/if}
					{:else}
						<EntityEditorSubmitButton
							label="Connect Google"
							variant="secondary"
							onclick={connectGoogle}
						/>
					{/if}
				</section>

				<section class="settings-section entity-editor-form">
					<h3>Data &amp; privacy</h3>
					<EntityEditorSubmitButton
						label="Download my data"
						variant="secondary"
						onclick={downloadExport}
					/>

					{#if !showDeleteConfirm}
						<button
							type="button"
							class="settings-link-btn settings-link-btn--danger"
							onclick={() => (showDeleteConfirm = true)}
						>
							Delete my account
						</button>
					{:else}
						<div class="settings-danger-zone">
							<p>
								This deactivates your account and removes your email, display name, and password.
								Your past proposals and edit history stay on record, attributed to a deleted user.
							</p>
							{#if profile.hasPassword}
								<EntityEditorFormField label="Confirm password" inputId="account-delete-password">
									{#snippet control()}
										<input
											id="account-delete-password"
											type="password"
											bind:value={deletePasswordDraft}
											disabled={deleting}
										/>
									{/snippet}
								</EntityEditorFormField>
							{/if}
							{#if deleteError}
								<EntityEditorMessage variant="error" message={deleteError} />
							{/if}
							<div class="settings-danger-actions">
								<EntityEditorSubmitButton
									label="Permanently delete my account"
									savingLabel="Deleting…"
									saving={deleting}
									disabled={profile.hasPassword && !deletePasswordDraft}
									variant="danger"
									onclick={confirmDelete}
								/>
								<EntityEditorSubmitButton
									label="Cancel"
									variant="secondary"
									disabled={deleting}
									onclick={() => (showDeleteConfirm = false)}
								/>
							</div>
						</div>
					{/if}
				</section>
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
		width: min(26rem, 100%);
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
		gap: 1.25rem;
	}
	.settings-loading {
		margin: 0;
		color: hsl(0, 0%, 45%);
	}
	.settings-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid hsl(0, 0%, 93%);
	}
	.settings-section:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}
	/* Shared entity-editor input geometry comes from entity-editor.css via the
     entity-editor-form class; the rules below only add what it lacks. */
	.settings-body :global(.field-hint) {
		margin: 0;
		font-size: 0.75rem;
		line-height: 1.4;
		color: hsl(0, 0%, 45%);
	}
	.settings-body :global(.editor-field input:disabled) {
		background: hsl(0, 0%, 96%);
		color: hsl(0, 0%, 38%);
	}
	.settings-body :global(.editor-field input:focus-visible) {
		outline: 2px solid hsl(5, 53%, 32%);
		outline-offset: 1px;
	}
	.settings-body :global(.editor-field textarea) {
		width: 100%;
		box-sizing: border-box;
		resize: vertical;
		font: inherit;
		line-height: 1.4;
		padding: 0.5rem;
		border: 1px solid hsl(0, 0%, 78%);
		border-radius: 0.375rem;
	}
	.settings-body :global(.editor-field textarea:focus-visible),
	.social-row input:focus-visible,
	.settings-link-btn:focus-visible {
		outline: 2px solid hsl(5, 53%, 32%);
		outline-offset: 1px;
	}
	.social-links {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}
	.social-links h4,
	.social-kind-group h5 {
		margin: 0;
		font-size: 0.8125rem;
	}
	.social-kind-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}
	.social-row {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		min-width: 0;
		flex-wrap: wrap;
	}
	.social-row input[type='url'],
	.social-row input[aria-label='Custom link label'] {
		min-width: 0;
		flex: 1 1 8rem;
		box-sizing: border-box;
		padding: 0.4rem;
		border: 1px solid hsl(0, 0%, 78%);
		border-radius: 0.375rem;
		font: inherit;
	}
	.social-public {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		white-space: nowrap;
	}
	.social-row .settings-link-btn {
		flex: 0 0 auto;
	}
	.disclosure {
		padding: 0.5rem;
		border: 1px solid hsl(35, 60%, 70%);
		border-radius: 0.375rem;
		background: hsl(45, 100%, 97%);
	}
	.settings-body :global(.editor-field input[type='url']) {
		min-width: 0;
		max-width: 100%;
	}
	@media (max-width: 20rem) {
		.settings-overlay {
			padding: 0.5rem;
		}
		.settings-body {
			padding: 0.75rem;
		}
	}
	.settings-section h3 {
		margin: 0 0 0.25rem;
		font-size: 0.875rem;
		font-weight: 700;
		color: hsl(5, 53%, 32%);
	}
	.settings-status {
		margin: 0;
		font-size: 0.8125rem;
		color: hsl(0, 0%, 35%);
	}
	.settings-link-btn {
		align-self: flex-start;
		background: none;
		border: none;
		padding: 0;
		color: hsl(5, 53%, 32%);
		font-weight: 600;
		font-size: 0.8125rem;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.credits-visibility {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.contributions-section {
		margin: 1rem 0;
	}

	.contributions-section h4,
	.contributions-section p {
		margin: 0 0 0.5rem;
	}

	.contributions-section p {
		color: hsl(0, 0%, 40%);
		font-size: 0.875rem;
	}

	.contributions-section ul {
		display: grid;
		gap: 0.375rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.contributions-section li {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		font-size: 0.875rem;
	}

	.contributions-section time {
		flex: 0 0 auto;
		color: hsl(0, 0%, 40%);
	}
	.settings-link-btn--danger {
		color: #9a1b1b;
	}
	.settings-danger-zone {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem;
		border: 1px solid #f0c9c9;
		border-radius: 0.5rem;
		background: #fdf6f6;
	}
	.settings-danger-zone p {
		margin: 0;
		font-size: 0.8125rem;
		color: hsl(0, 0%, 30%);
	}
	.settings-danger-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
</style>
