<script lang="ts">
	import { addPlaceSuggestion } from '#lib/functions/places.remote.js';
	import { PlaceProposalSchema } from '#lib/schema/functions.js';
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
				PlaceProposalSchema.entries.body,
				v.object({ id: v.pipe(v.number(), v.integer()), version: v.number() })
			]),
			rawProps
		)
	);
</script>

<EntityEditForm remote={addPlaceSuggestion} {id} {version} {body}>
	<InputField>
		<label for="place-name">Place name</label>
		<Input {...addPlaceSuggestion.fields.body.name.as('text')} id="place-name" />
		<InputIssues issues={addPlaceSuggestion.fields.body.name.issues()} />
	</InputField>
	<InputField>
		<label for="place-description">Description</label>
		<Textarea id="place-description" {...addPlaceSuggestion.fields.body.description.as('text')} />
	</InputField>
</EntityEditForm>
