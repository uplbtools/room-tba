<script lang="ts">
	import { addBuildingSuggestion } from '#lib/functions/buildings.remote.js';
	import { BuildingProposalSchema } from '#lib/schema/functions.js';
	import { getEscapeActions, getToast } from '#lib/utils/context.js';
	import * as v from 'valibot';
	import Input from './Input.svelte';
	import Form from './Form.svelte';
	import InputField from './InputField.svelte';
	import InputIssues from './InputIssues.svelte';
	import Textarea from './Textarea.svelte';
	import { onMount } from 'svelte';

	// script code
	const rawProps: Record<string, unknown> = $props();

	const toastStore = getToast();
	const escapedActions = getEscapeActions();

	const { id, ...buildingInitData } = $derived(
		v.parse(
			v.intersect([
				BuildingProposalSchema.entries.body,
				v.object({ id: v.pipe(v.number(), v.integer()) })
			]),
			rawProps
		)
	);

	onMount(() => {
		addBuildingSuggestion.fields.set({
			body: buildingInitData,
			meta: {
				baseVersion: 1,
				entityId: id,
				submitterName: '  '
			}
		});
		addBuildingSuggestion.validate();
	});
</script>

<Form
	{...addBuildingSuggestion.enhance(async (form) => {
		try {
			if (await form.submit()) {
				escapedActions.trigger();
				toastStore.show('Contribution submitted, thank you!!!', 'success');
			} else {
				toastStore.show('Contribution has some validation errors', 'error');
			}
		} catch (e) {
			toastStore.show('An error occrred while parsing', 'error');
			console.error(e);
		}
	})}
	oninput={() => addBuildingSuggestion.validate()}
>
	<InputField>
		<label for="contributor-name">What is your name?</label>
		<Input {...addBuildingSuggestion.fields.meta.submitterName.as('text')} id="contributor-name" />
		<InputIssues issues={addBuildingSuggestion.fields.meta.submitterName.issues()} />
	</InputField>
	<InputField>
		<label for="building-name">Building name</label>
		<Input {...addBuildingSuggestion.fields.body.buildingName.as('text')} id="building-name" />
		<InputIssues issues={addBuildingSuggestion.fields.body.buildingName.issues()} />
	</InputField>
	<InputField>
		<label for="building-directions">How would you describe the building?</label>
		<Textarea
			id="building-directions"
			{...addBuildingSuggestion.fields.body.directions.as('text')}
		/>
	</InputField>
	<Input {...addBuildingSuggestion.fields.meta.entityId.as('hidden', id)} />
	<Input {...addBuildingSuggestion.fields.meta.baseVersion.as('hidden', 1)} />
</Form>

<style>
</style>
