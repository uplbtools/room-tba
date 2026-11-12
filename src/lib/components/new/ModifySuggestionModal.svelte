<script lang="ts">
	import { getModalStore, getSearchInfo } from '#lib/utils/context.js';
	import ModalContent from './ModalContent.svelte';
	import BuildingModifyForm from './forms/BuildingModifyForm.svelte';

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

		{/if}
	{/if}
</ModalContent>

<style>
	/* styling for website goes here */
</style>
