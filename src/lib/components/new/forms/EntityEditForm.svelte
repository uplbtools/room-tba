<script lang="ts">
	import { isHttpError, type RemoteForm } from '@sveltejs/kit';
	import { onMount, type Snippet } from 'svelte';
	import { getAdminAuthStore, getEscapeActions, getToast } from '#lib/utils/context.js';
	import Form from './Form.svelte';
	import Input from './Input.svelte';
	import InputField from './InputField.svelte';
	import InputIssues from './InputIssues.svelte';

	interface Props {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		remote: RemoteForm<any, { published: boolean }>;
		id: number;
		version: number;
		body: Record<string, unknown>;
		children: Snippet;
	}
	const { remote, id, version, body, children }: Props = $props();

	const toastStore = getToast();
	const escapedActions = getEscapeActions();
	const adminAuthStore = getAdminAuthStore();

	onMount(() => {
		remote.fields.set({
			body,
			meta: { baseVersion: version, entityId: id, submitterName: adminAuthStore.displayName ?? '' }
		});
		remote.validate();
	});
</script>

<Form
	{...remote.enhance(async (form) => {
		try {
			if (await form.submit()) {
				escapedActions.trigger();
				toastStore.show(
					remote.result?.published ? 'Saved.' : 'Contribution submitted, thank you!!!',
					'success'
				);
			} else {
				toastStore.show('Contribution has some validation errors', 'error');
			}
		} catch (e) {
			toastStore.show(isHttpError(e) ? e.body.message : "Couldn't send your edit.", 'error');
		}
	})}
	oninput={() => remote.validate()}
>
	{#if adminAuthStore.isLoggedIn}
		<Input {...remote.fields.meta.submitterName.as('hidden', adminAuthStore.displayName ?? '')} />
	{:else}
		<InputField>
			<label for="contributor-name">What is your name?</label>
			<Input {...remote.fields.meta.submitterName.as('text')} id="contributor-name" />
			<InputIssues issues={remote.fields.meta.submitterName.issues()} />
		</InputField>
	{/if}
	{@render children()}
	<Input {...remote.fields.meta.entityId.as('hidden', id)} />
	<Input {...remote.fields.meta.baseVersion.as('hidden', version)} />
</Form>
