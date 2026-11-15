<script lang="ts">
	import { addRoomSuggestion } from '#lib/functions/rooms.remote.js';
	import * as v from 'valibot';
	import EntityEditForm from './EntityEditForm.svelte';
	import InputField from './InputField.svelte';
	import Textarea from './Textarea.svelte';

	const rawProps: Record<string, unknown> = $props();

	const { id, version, ...body } = $derived(
		v.parse(
			v.object({
				id: v.pipe(v.number(), v.integer()),
				version: v.number(),
				directions: v.string()
			}),
			rawProps
		)
	);
</script>

<EntityEditForm remote={addRoomSuggestion} {id} {version} {body}>
	<InputField>
		<label for="room-directions">How do you get to this room?</label>
		<Textarea id="room-directions" {...addRoomSuggestion.fields.body.directions.as('text')} />
	</InputField>
</EntityEditForm>
