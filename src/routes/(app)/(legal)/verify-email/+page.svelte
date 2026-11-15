<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import EntityEditorMessage from '#lib/components/editor/EntityEditorMessage.svelte';
	import EntityEditorSubmitButton from '#lib/components/editor/EntityEditorSubmitButton.svelte';
	import '#lib/components/editor/entity-editor.css';

	let token = $state<string | null>(null);
	let status = $state<'loading' | 'missing' | 'ready' | 'working' | 'done' | 'error'>('loading');
	let error = $state('This link is invalid or has expired.');

	onMount(() => {
		token = new URLSearchParams(window.location.search).get('token');
		status = token ? 'ready' : 'missing';
		if (token) replaceState(window.location.pathname, {});
	});

	async function confirm() {
		status = 'working';
		try {
			const res = await fetch('/api/account/verify-email', {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token })
			});
			if (res.ok) {
				status = 'done';
				return;
			}
			const data = (await res.json().catch(() => ({}))) as { error?: string };
			if (data.error) error = data.error;
			status = 'error';
		} catch {
			error = 'Network error. Try again.';
			status = 'ready';
		}
	}
</script>

<h1>Confirm your email</h1>
<div class="entity-editor-form mt-6">
	{#if status === 'missing'}
		<EntityEditorMessage
			variant="error"
			message="This link is incomplete. Open the newest confirmation email and use its link, or send a new one from Account settings."
		/>
	{:else if status === 'done'}
		<EntityEditorMessage variant="success" message="Your email is confirmed." />
		<a href="/map">Go back to the map</a>
	{:else if status === 'error'}
		<EntityEditorMessage
			variant="error"
			message="{error} Send a new one from Account settings, then use the newest email."
		/>
	{:else if status !== 'loading'}
		<p>
			Press the button to confirm this address for your Room TBA account. You can then reset your
			password by email and hear back about your suggested edits.
		</p>
		<EntityEditorSubmitButton
			label="Confirm email"
			savingLabel="Confirming…"
			saving={status === 'working'}
			onclick={confirm}
		/>
	{/if}
</div>
