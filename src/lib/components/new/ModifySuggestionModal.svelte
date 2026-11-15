<script lang="ts">
	import { getModalStore, getSearchInfo } from '#lib/utils/context.js';
	import ModalContent from './ModalContent.svelte';
	import BuildingModifyForm from './forms/BuildingModifyForm.svelte';
	import CollegeModifyForm from './forms/CollegeModifyForm.svelte';
	import DivisionModifyForm from './forms/DivisionModifyForm.svelte';
	import DormModifyForm from './forms/DormModifyForm.svelte';
	import EventModifyForm from './forms/EventModifyForm.svelte';
	import OrgModifyForm from './forms/OrgModifyForm.svelte';
	import PlaceModifyForm from './forms/PlaceModifyForm.svelte';
	import RoomModifyForm from './forms/RoomModifyForm.svelte';

	// script code
	const searchInfo = getSearchInfo();
	const modalStore = getModalStore();
	const dataRecord = $derived(modalStore.getDataRecord());
</script>

<ModalContent className="p-5 max-w-96">
	{#if dataRecord !== null}
		{#if searchInfo.category === 'building'}
			<BuildingModifyForm {...dataRecord} />
		{:else if searchInfo.category === 'college'}
			<CollegeModifyForm {...dataRecord} />
		{:else if searchInfo.category === 'division'}
			<DivisionModifyForm {...dataRecord} />
		{:else if searchInfo.category === 'dorm'}
			<DormModifyForm {...dataRecord} />
		{:else if searchInfo.category === 'organization'}
			<OrgModifyForm {...dataRecord} />
		{:else if searchInfo.category === 'place'}
			<PlaceModifyForm {...dataRecord} />
		{:else if searchInfo.category === 'room'}
			<RoomModifyForm {...dataRecord} />
		{:else if searchInfo.category === 'event'}
			<EventModifyForm {...dataRecord} />
		{/if}
	{/if}
</ModalContent>

<style>
	/* styling for website goes here */
</style>
