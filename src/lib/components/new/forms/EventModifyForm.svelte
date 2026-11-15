<script lang="ts">
	import { addEventSuggestion } from '#lib/functions/events.remote.js';
	import { EventProposalSchema } from '#lib/schema/functions.js';
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
				EventProposalSchema.entries.body,
				v.object({ id: v.pipe(v.number(), v.integer()), version: v.number() })
			]),
			rawProps
		)
	);
</script>

<EntityEditForm remote={addEventSuggestion} {id} {version} {body}>
	<InputField>
		<label for="event-title">Event name</label>
		<Input {...addEventSuggestion.fields.body.title.as('text')} id="event-title" />
		<InputIssues issues={addEventSuggestion.fields.body.title.issues()} />
	</InputField>
	<InputField>
		<label for="event-description">Description</label>
		<Textarea id="event-description" {...addEventSuggestion.fields.body.description.as('text')} />
	</InputField>
</EntityEditForm>
