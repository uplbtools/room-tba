<script lang="ts">
	import { resolve } from '$app/paths';
	import { getRoomsByBuildingId } from '#lib/functions/rooms.remote.js';

	const { buildingId }: { buildingId: number } = $props();

	const rooms = $derived(await getRoomsByBuildingId(buildingId));
	// Rooms split by institute once a building holds more than one.
	const groups = $derived.by(() => {
		const byName = new Map<string, typeof rooms>();
		for (const room of rooms) {
			const name = room.divisionName ?? '';
			byName.set(name, [...(byName.get(name) ?? []), room]);
		}
		return [...byName]
			.map(([name, list]) => ({ name: name || 'Other rooms', rooms: list }))
			.sort((a, b) =>
				a.name === 'Other rooms' ? 1 : b.name === 'Other rooms' ? -1 : a.name.localeCompare(b.name)
			);
	});
</script>

{#snippet chips(list: typeof rooms)}
	<div class="flex flex-wrap gap-2">
		{#each list as room (room.id)}
			<a
				class="rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-200"
				href={resolve('/map/rooms/[id]', { id: String(room.id) })}
			>
				{room.code}
			</a>
		{/each}
	</div>
{/snippet}

{#if rooms.length > 0}
	<section aria-label="Rooms">
		<h3 class="font-semibold">Rooms</h3>
		{#if groups.length > 1}
			{#each groups as group (group.name)}
				<details class="border-t border-neutral-200 py-1 first-of-type:border-t-0">
					<summary class="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
						{group.name}
						<span class="ml-auto text-xs font-normal text-neutral-500">{group.rooms.length}</span>
					</summary>
					{@render chips(group.rooms)}
				</details>
			{/each}
		{:else}
			{@render chips(rooms)}
		{/if}
	</section>
{/if}
