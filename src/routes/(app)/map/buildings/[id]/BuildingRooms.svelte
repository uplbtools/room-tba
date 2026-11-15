<script lang="ts">
	import { resolve } from '$app/paths';
	import { getRoomsByBuildingId } from '#lib/functions/rooms.remote.js';

	const { buildingId }: { buildingId: number } = $props();
	const PAGE_SIZE = 10;
	let offsets = $state([0]);
</script>

{#if (await getRoomsByBuildingId({ id: buildingId, offset: 0 })).length > 0}
	<section aria-label="Rooms">
		<h3 class="entity-section-heading">Rooms</h3>
		<div class="entity-tag-list">
			{#each offsets as offset (offset)}
				{@const rooms = await getRoomsByBuildingId({ id: buildingId, offset })}
				{#each rooms as room (room.id)}
					<a class="entity-tag-chip" href={resolve('/map/rooms/[id]', { id: String(room.id) })}>
						{room.code}
					</a>
				{/each}
				{#if offset === offsets.at(-1) && rooms.length === PAGE_SIZE}
					<button type="button" onclick={() => offsets.push(offset + PAGE_SIZE)}>Show more</button>
				{/if}
			{/each}
		</div>
	</section>
{/if}
