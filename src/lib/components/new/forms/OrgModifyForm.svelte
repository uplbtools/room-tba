<script lang="ts">
	import { addOrgSuggestion } from '#lib/functions/organizations.remote.js';
	import { OrgProposalSchema } from '#lib/schema/functions.js';
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
				OrgProposalSchema.entries.body,
				v.object({ id: v.pipe(v.number(), v.integer()), version: v.number() })
			]),
			rawProps
		)
	);
</script>

<EntityEditForm remote={addOrgSuggestion} {id} {version} {body}>
	<InputField>
		<label for="org-name">Organization name</label>
		<Input {...addOrgSuggestion.fields.body.name.as('text')} id="org-name" />
		<InputIssues issues={addOrgSuggestion.fields.body.name.issues()} />
	</InputField>
	<InputField>
		<label for="org-description">Description</label>
		<Textarea id="org-description" {...addOrgSuggestion.fields.body.description.as('text')} />
	</InputField>
</EntityEditForm>
