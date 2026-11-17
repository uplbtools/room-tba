<script lang="ts">
	import { isHttpError } from '@sveltejs/kit';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Form from '#lib/components/new/forms/Form.svelte';
	import Input from '#lib/components/new/forms/Input.svelte';
	import InputField from '#lib/components/new/forms/InputField.svelte';
	import InputIssues from '#lib/components/new/forms/InputIssues.svelte';
	import Textarea from '#lib/components/new/forms/Textarea.svelte';
	import {
		PLACE_CATEGORIES,
		PLACE_CATEGORY_LABELS
	} from '#lib/constants/content/categories/place.js';
	import { addPlace, getMapPlacesData } from '#lib/functions/places.remote.js';
	import { getAdminAuthStore, getMapStore, getToast } from '#lib/utils/context.js';

	const map = getMapStore();
	const toast = getToast();
	const adminAuthStore = getAdminAuthStore();
	const { body, meta } = addPlace.fields;
</script>

<div class="flex flex-col gap-3 p-6" {@attach () => map.startPickingPin()}>
	<h2 class="text-2xl font-semibold">Add a place</h2>
	<p class="text-sm text-neutral-700">
		Tap the map where it is. {adminAuthStore.canPublish
			? 'It goes on the map right away.'
			: 'Editors review it before it goes on the map.'}
	</p>
	<Form
		{...addPlace.enhance(async (form) => {
			try {
				if (!(await form.submit().updates(getMapPlacesData())))
					return toast.show('Some fields need fixing', 'error');
				const result = addPlace.result;
				toast.show(
					result?.published ? 'Added to the map.' : 'Thanks, we will review it.',
					'success'
				);
				await goto(result?.id ? resolve(`map/places/${result.id}`) : resolve('map'));
			} catch (e) {
				toast.show(isHttpError(e) ? e.body.message : "Couldn't send it.", 'error');
			}
		})}
	>
		{#if adminAuthStore.isLoggedIn}
			<Input {...meta.submitterName.as('hidden', adminAuthStore.displayName ?? '')} />
		{:else}
			<InputField>
				<label for="submitter-name">What is your name?</label>
				<Input {...meta.submitterName.as('text')} id="submitter-name" />
				<InputIssues issues={meta.submitterName.issues()} />
			</InputField>
		{/if}
		<InputField>
			<label for="place-name">Place name</label>
			<Input {...body.name.as('text')} id="place-name" />
			<InputIssues issues={body.name.issues()} />
		</InputField>
		<InputField>
			<label for="place-category">Category</label>
			<select
				{...body.category.as('select')}
				id="place-category"
				class="border border-neutral-300 px-3 py-2"
			>
				{#each PLACE_CATEGORIES as category (category)}
					<option value={category}>{PLACE_CATEGORY_LABELS[category]}</option>
				{/each}
			</select>
			<InputIssues issues={body.category.issues()} />
		</InputField>
		<InputField>
			<label for="place-description">Description</label>
			<Textarea id="place-description" {...body.description.as('text')} />
		</InputField>
		{#if map.draftPin}
			<Input {...body.lat.as('hidden', map.draftPin.lat)} />
			<Input {...body.lon.as('hidden', map.draftPin.lon)} />
		{/if}
		<InputIssues issues={body.lat.issues()} />
	</Form>
</div>
