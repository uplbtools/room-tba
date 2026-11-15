<script lang="ts">
	import EntityEditorMessage from '#lib/components/editor/EntityEditorMessage.svelte';
	import EntityEditorSubmitButton from '#lib/components/editor/EntityEditorSubmitButton.svelte';
	import '#lib/components/editor/entity-editor.css';
	import { unsubscribe } from '#lib/functions/email.remote.js';

	const { data } = $props();
</script>

<h1>Email notifications</h1>
<div class="entity-editor-form mt-6">
	{#if !data.token || unsubscribe.result?.done === false}
		<EntityEditorMessage
			variant="error"
			message="This unsubscribe link is invalid or has expired."
		/>
	{:else if unsubscribe.result?.done}
		<EntityEditorMessage variant="success" message="You won't get {data.topic} anymore." />
		<a href="/map">Go back to the map</a>
	{:else}
		<p>Do you want to stop getting {data.topic}?</p>
		<form {...unsubscribe}>
			<input {...unsubscribe.fields.token.as('hidden', data.token)} />
			<EntityEditorSubmitButton
				type="submit"
				label="Unsubscribe"
				savingLabel="Unsubscribing…"
				saving={unsubscribe.pending > 0}
			/>
		</form>
	{/if}
</div>
