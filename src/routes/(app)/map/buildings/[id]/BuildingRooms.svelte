<script lang="ts">
	import { resolve } from '$app/paths';
	import { getRoomsByBuildingId } from '#lib/functions/rooms.remote.js';

	const { buildingId }: { buildingId: number } = $props();
	const PAGE_SIZE = 10;
	let offsets = $state([0]);
</script>

{#if (await getRoomsByBuildingId({ id: buildingId, offset: 0 })).length > 0}
	<section aria-label="Rooms">
		<h3 class="font-semibold">Rooms</h3>
		<div class="flex flex-wrap gap-2">
			{#each offsets as offset (offset)}
				{@const rooms = await getRoomsByBuildingId({ id: buildingId, offset })}
				{#each rooms as room (room.id)}
					<a
						class="rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-200"
						href={resolve('/map/rooms/[id]', { id: String(room.id) })}
					>
						{room.code}
					</a>
				{/each}
				{#if offset === offsets.at(-1) && rooms.length === PAGE_SIZE}
					<button
						type="button"
						class="text-xs text-blue-700 hover:underline"
						onclick={() => offsets.push(offset + PAGE_SIZE)}>Show more</button
					>
				{/if}
			{/each}
		</div>
	</section>
{/if}
