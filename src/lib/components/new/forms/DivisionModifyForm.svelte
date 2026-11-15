<script lang="ts">
	import { addDivisionSuggestion } from '#lib/functions/divisions.remote.js';
	import { DivisionProposalSchema } from '#lib/schema/functions.js';
	import * as v from 'valibot';
	import EntityEditForm from './EntityEditForm.svelte';
	import Input from './Input.svelte';
	import InputField from './InputField.svelte';
	import InputIssues from './InputIssues.svelte';

	const rawProps: Record<string, unknown> = $props();

	const { id, version, ...body } = $derived(
		v.parse(
			v.intersect([
				DivisionProposalSchema.entries.body,
				v.object({ id: v.pipe(v.number(), v.integer()), version: v.number() })
			]),
			rawProps
		)
	);
</script>

<EntityEditForm remote={addDivisionSuggestion} {id} {version} {body}>
	<InputField>
		<label for="division-name">Division name</label>
		<Input {...addDivisionSuggestion.fields.body.divisionName.as('text')} id="division-name" />
		<InputIssues issues={addDivisionSuggestion.fields.body.divisionName.issues()} />
	</InputField>
</EntityEditForm>
