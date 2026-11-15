<script lang="ts">
	import { addDormSuggestion } from '#lib/functions/dorms.remote.js';
	import { DormProposalSchema } from '#lib/schema/functions.js';
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
				DormProposalSchema.entries.body,
				v.object({ id: v.pipe(v.number(), v.integer()), version: v.number() })
			]),
			rawProps
		)
	);
</script>

<EntityEditForm remote={addDormSuggestion} {id} {version} {body}>
	<InputField>
		<label for="dorm-dormname">Dorm name</label>
		<Input {...addDormSuggestion.fields.body.dormName.as('text')} id="dorm-dormname" />
		<InputIssues issues={addDormSuggestion.fields.body.dormName.issues()} />
	</InputField>
	<InputField>
		<label for="dorm-description">Description</label>
		<Textarea id="dorm-description" {...addDormSuggestion.fields.body.description.as('text')} />
	</InputField>
</EntityEditForm>
