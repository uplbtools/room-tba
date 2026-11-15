<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import EntityDirectionsChip from '#lib/components/entity/EntityDirectionsChip.svelte';
	import EntityShareCopyLink from '#lib/components/entity/EntityShareCopyLink.svelte';
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

<div class="entity-detail">
	<header class="entity-header">
		<h2 class="entity-header__title">{room.code}</h2>
		{#if room.buildingId != null && room.buildingName}
			<a href={resolve('/map/buildings/[id]', { id: String(room.buildingId) })}>
				{room.buildingName}
			</a>
		{/if}
		<div class="entity-actions">
			{#if room.lat != null && room.lon != null}
				<EntityDirectionsChip lat={room.lat} lon={room.lon} destinationLabel={room.code} />
			{/if}
			<EntityShareCopyLink url={page.url.href} entityLabel={room.code} />
		</div>
	</header>

	{#if room.directions}
		<p class="entity-directions__text">{room.directions}</p>
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
			<h3 class="entity-section-heading">Classes</h3>
			<Classes
				classes={await getClassesByRoomId({ termId, roomId: room.id })}
				currentRoomCode={room.code}
			/>
		</svelte:boundary>
		<svelte:boundary>
			{#snippet failed()}
				Could not load final exams.
			{/snippet}
			{#await getFinalExams({ termId, roomCode: room.code }) then exams}
				{#if exams.length > 0}
					<h3 class="entity-section-heading">Final exams</h3>
					<FinalExamsList {exams} />
				{/if}
			{/await}
		</svelte:boundary>
	{/if}
</div>
