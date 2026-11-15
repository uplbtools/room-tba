<script lang="ts">
	import EntityEditorFormField from '#lib/components/editor/EntityEditorFormField.svelte';
	import EntityEditorMessage from '#lib/components/editor/EntityEditorMessage.svelte';
	import EntityEditorSubmitButton from '#lib/components/editor/EntityEditorSubmitButton.svelte';
	import '#lib/components/editor/entity-editor.css';
	import {
		MIN_CONTRIBUTOR_PASSWORD_LENGTH,
		USERNAME_MAX_LENGTH,
		USERNAME_MIN_LENGTH
	} from '#lib/auth/contributor-signup.js';

	type Props = {
		token: string | null;
		invite: { email: string; role: string; displayName: string | null } | null;
	};

	let { token, invite }: Props = $props();

	let username = $state('');
	let displayName = $state('');
	let password = $state('');
	let saving = $state(false);
	let error = $state<string | null>(null);
	let done = $state(false);

	async function submit(e: Event) {
		e.preventDefault();
		saving = true;
		error = null;
		try {
			const res = await fetch('/api/auth/accept-invite', {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token, username, password, displayName })
			});
			const data = (await res.json().catch(() => ({}))) as { error?: string };
			if (!res.ok) {
				error = data.error ?? "Couldn't finish the invite.";
				return;
			}
			done = true;
		} catch {
			error = 'Network error. Try again.';
		} finally {
			saving = false;
		}
	}
</script>

<div class="invite-card">
	{#if !token || !invite}
		<EntityEditorMessage
			variant="error"
			message="This invite link is invalid, already used, or expired. Ask the admin who invited you for a new one."
		/>
		<a class="invite-link" href="/map">Back to Room TBA</a>
	{:else if done}
		<EntityEditorMessage variant="success" message="Your account is ready and you're signed in." />
		<a class="invite-link" href="/map">Open the map</a>
	{:else}
		<p>
			You were invited as <strong>{invite.role}</strong> with <strong>{invite.email}</strong>.
			Choose how you sign in.
		</p>
		<form class="entity-editor-form contributor-form" onsubmit={submit}>
			<EntityEditorFormField
				label="Username"
				inputId="invite-username"
				hint="{USERNAME_MIN_LENGTH} to {USERNAME_MAX_LENGTH} characters. Use lowercase letters, numbers, and . _ -"
			>
				{#snippet control()}
					<input
						id="invite-username"
						autocomplete="username"
						autocapitalize="none"
						spellcheck="false"
						minlength={USERNAME_MIN_LENGTH}
						maxlength={USERNAME_MAX_LENGTH}
						aria-describedby="invite-username-hint"
						bind:value={username}
						disabled={saving}
						required
					/>
				{/snippet}
			</EntityEditorFormField>
			<EntityEditorFormField label="Display name" inputId="invite-display-name">
				{#snippet control()}
					<input
						id="invite-display-name"
						autocomplete="name"
						maxlength="100"
						placeholder={invite?.displayName ?? ''}
						bind:value={displayName}
						disabled={saving}
					/>
				{/snippet}
			</EntityEditorFormField>
			<EntityEditorFormField
				label="Password"
				inputId="invite-password"
				hint="At least {MIN_CONTRIBUTOR_PASSWORD_LENGTH} characters."
			>
				{#snippet control()}
					<input
						id="invite-password"
						type="password"
						autocomplete="new-password"
						minlength={MIN_CONTRIBUTOR_PASSWORD_LENGTH}
						aria-describedby="invite-password-hint"
						bind:value={password}
						disabled={saving}
						required
					/>
				{/snippet}
			</EntityEditorFormField>
			{#if error}
				<EntityEditorMessage variant="error" message={error} />
			{/if}
			<EntityEditorSubmitButton
				type="submit"
				label="Create my account"
				savingLabel="Creating…"
				{saving}
			/>
		</form>
	{/if}
</div>

<style>
	.invite-card {
		max-width: 24rem;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.invite-link {
		align-self: flex-start;
		color: var(--theme-accent-text, hsl(5, 53%, 32%));
		font-weight: 600;
		text-decoration: underline;
		text-underline-offset: 2px;
	}
</style>
