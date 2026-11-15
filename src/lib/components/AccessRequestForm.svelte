<script lang="ts">
	import { onMount } from 'svelte';
	import EntityEditorFormField from '#lib/components/editor/EntityEditorFormField.svelte';
	import EntityEditorMessage from '#lib/components/editor/EntityEditorMessage.svelte';
	import EntityEditorSubmitButton from '#lib/components/editor/EntityEditorSubmitButton.svelte';
	import LoadingIndicator from '#lib/components/LoadingIndicator.svelte';

	type MyRequest = { status: string } | null;

	let request = $state<MyRequest>(null);
	let loaded = $state(false);
	let message = $state('');
	let sending = $state(false);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			const res = await fetch('/api/account/access-request', { credentials: 'same-origin' });
			if (res.ok) request = ((await res.json()) as { request: MyRequest }).request;
		} finally {
			loaded = true;
		}
	});

	async function send() {
		sending = true;
		error = null;
		try {
			const res = await fetch('/api/account/access-request', {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message })
			});
			const data = (await res.json().catch(() => ({}))) as { error?: string; request?: MyRequest };
			if (!res.ok) {
				error = data.error ?? "Couldn't send the request.";
				return;
			}
			request = data.request ?? null;
			message = '';
		} catch {
			error = 'Network error. Try again.';
		} finally {
			sending = false;
		}
	}
</script>

{#if !loaded}
	<LoadingIndicator />
{:else if request?.status === 'pending'}
	<EntityEditorMessage
		variant="success"
		message="Your request is with the admins. You'll have the editor role the next time you sign in once it's approved."
	/>
{:else}
	{#if request?.status === 'declined'}
		<p class="field-hint">
			Your last request was declined. You can send a new one with more detail.
		</p>
	{/if}
	<EntityEditorFormField
		label="What would you like to edit?"
		inputId="access-request-message"
		hint="For example, rooms in your college, org listings, or events."
	>
		{#snippet control()}
			<textarea
				id="access-request-message"
				rows="4"
				maxlength="1000"
				bind:value={message}
				disabled={sending}></textarea>
		{/snippet}
	</EntityEditorFormField>
	{#if error}
		<EntityEditorMessage variant="error" message={error} />
	{/if}
	<EntityEditorSubmitButton
		label="Request editor access"
		savingLabel="Sending…"
		saving={sending}
		disabled={message.trim().length < 10}
		onclick={send}
	/>
{/if}
