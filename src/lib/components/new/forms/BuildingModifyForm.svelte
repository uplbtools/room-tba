<script lang="ts">
	import { addBuildingSuggestion } from '#lib/functions/buildings.remote.js';
	import { BuildingProposalSchema } from '#lib/schema/functions.js';
	import * as v from 'valibot';
	import EntityEditForm from './EntityEditForm.svelte';
	import Input from './Input.svelte';
	import InputField from './InputField.svelte';
	import InputIssues from './InputIssues.svelte';
	import Textarea from './Textarea.svelte';

	const rawProps: Record<string, unknown> = $props();

	const { id, version, ...body } = $derived(
		v.parse(
			v.intersect([
				BuildingProposalSchema.entries.body,
				v.object({ id: v.pipe(v.number(), v.integer()), version: v.number() })
			]),
			rawProps
		)
	);
</script>

<EntityEditForm remote={addBuildingSuggestion} {id} {version} {body}>
	<InputField>
		<label for="building-buildingname">Building name</label>
		<Input
			{...addBuildingSuggestion.fields.body.buildingName.as('text')}
			id="building-buildingname"
		/>
		<InputIssues issues={addBuildingSuggestion.fields.body.buildingName.issues()} />
	</InputField>
	<InputField>
		<label for="building-directions">How would you describe the building?</label>
		<Textarea
			id="building-directions"
			{...addBuildingSuggestion.fields.body.directions.as('text')}
		/>
	</InputField>
</EntityEditForm>
