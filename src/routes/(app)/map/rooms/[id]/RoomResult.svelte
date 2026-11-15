<script lang="ts">
	import EntityLastUpdated from '#lib/components/new/EntityLastUpdated.svelte';
	import { resolve } from '$app/paths';
	import ResultActions from '#lib/components/new/ResultActions.svelte';
	import SuggestEditButton from '#lib/components/new/SuggestEditButton.svelte';
	import Classes from '#lib/components/room/Classes.svelte';
	import FinalExamsList from '#lib/components/room/FinalExamsList.svelte';
	import { getClassesByRoomId } from '#lib/functions/classes.remote.js';
	import { getFinalExams } from '#lib/functions/final-exams.remote.js';
	import type { getRoomById } from '#lib/functions/rooms.remote.js';
	import { getTermStore } from '#lib/utils/context.js';

	interface Props {
		room: Awaited<ReturnType<typeof getRoomById>>;
	}
	const { room }: Props = $props();
	const termStore = getTermStore();
</script>

<div class="flex flex-col gap-3 p-6">
	<header class="flex flex-col">
		<h2 class="text-2xl font-semibold">{room.code}</h2>
		{#if room.buildingId != null && room.buildingName}
			<a
				class="text-sm text-neutral-700 hover:underline"
				href={resolve('/map/buildings/[id]', { id: String(room.buildingId) })}
			>
				{room.buildingName}
			</a>
		{/if}
	</header>
	<ResultActions data={room} name={room.buildingName ?? room.code} label={room.code} />
	<SuggestEditButton
		data={{ id: room.id, version: room.version, directions: room.directions ?? '' }}
	/>

	<EntityLastUpdated entityType="room" entityId={room.id} entityName={room.code} />
	{#if room.directions}
		<p class="text-sm text-neutral-800">{room.directions}</p>
	{/if}

	{#if termStore.activeTermId != null}
		{@const termId = termStore.activeTermId}
		<svelte:boundary>
			{#snippet failed()}
				Could not load this room's schedule.
			{/snippet}
			{#snippet pending()}
				Loading classes...
			{/snippet}
			{@const classes = await getClassesByRoomId({ termId, roomId: room.id })}
			<h3 class="font-semibold">Classes</h3>
			{#if classes.length > 0}
				<Classes {classes} currentRoomCode={room.code} />
			{:else}
				<p class="text-sm text-neutral-700">No classes in this room this term.</p>
			{/if}
		</svelte:boundary>
		<svelte:boundary>
			{#snippet failed()}
				Could not load final exams.
			{/snippet}
			{#await getFinalExams({ termId, roomCode: room.code }) then exams}
				{#if exams.length > 0}
					<h3 class="font-semibold">Final exams</h3>
					<FinalExamsList {exams} />
				{/if}
			{/await}
		</svelte:boundary>
	{/if}
</div>
