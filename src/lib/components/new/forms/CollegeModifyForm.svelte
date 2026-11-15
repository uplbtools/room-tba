<script lang="ts">
	import { addCollegeSuggestion } from '#lib/functions/colleges.remote.js';
	import { CollegeProposalSchema } from '#lib/schema/functions.js';
	import * as v from 'valibot';
	import EntityEditForm from './EntityEditForm.svelte';
	import Input from './Input.svelte';
	import InputField from './InputField.svelte';
	import InputIssues from './InputIssues.svelte';

	const rawProps: Record<string, unknown> = $props();

	const { id, version, ...body } = $derived(
		v.parse(
			v.intersect([
				CollegeProposalSchema.entries.body,
				v.object({ id: v.pipe(v.number(), v.integer()), version: v.number() })
			]),
			rawProps
		)
	);
</script>

<EntityEditForm remote={addCollegeSuggestion} {id} {version} {body}>
	<InputField>
		<label for="college-name">College name</label>
		<Input {...addCollegeSuggestion.fields.body.collegeName.as('text')} id="college-name" />
		<InputIssues issues={addCollegeSuggestion.fields.body.collegeName.issues()} />
	</InputField>
</EntityEditForm>
