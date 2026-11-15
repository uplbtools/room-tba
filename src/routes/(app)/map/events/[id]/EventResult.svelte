<script lang="ts">
	import EntityLastUpdated from '#lib/components/new/EntityLastUpdated.svelte';
	import EntityExternalLink from '#lib/components/entity/EntityExternalLink.svelte';
	import ResultActions from '#lib/components/new/ResultActions.svelte';
	import SuggestEditButton from '#lib/components/new/SuggestEditButton.svelte';
	import type { getEventById } from '#lib/functions/events.remote.js';
	import { formatCampusRange } from '#lib/utils/event/event-time.js';

	interface Props {
		event: Awaited<ReturnType<typeof getEventById>>;
	}
	const { event }: Props = $props();

	const location = $derived(event.locations.find((l) => l.isPrimary) ?? event.locations[0] ?? null);
</script>

<div class="flex flex-col gap-3 p-6">
	<header class="flex flex-col">
		<h2 class="text-2xl font-semibold">{event.title}</h2>
		<span class="text-sm text-neutral-700">
			{formatCampusRange(event.occurrenceStartsAt, event.occurrenceEndsAt)}
		</span>
	</header>
	<ResultActions
		data={{ lat: location?.resolvedLat ?? null, lon: location?.resolvedLon ?? null }}
		name={location?.resolvedLabel}
		label={event.title}
	/>
	<SuggestEditButton
		data={{
			id: event.id,
			version: event.version,
			title: event.title,
			description: event.description ?? ''
		}}
	/>

	<EntityLastUpdated entityType="event" entityId={event.id} entityName={event.title} />

	{#if location}
		<p class="text-sm text-neutral-800">{location.resolvedLabel}</p>
	{/if}
	{#if event.description}
		<p class="text-sm text-neutral-800">{event.description}</p>
	{/if}
	{#if event.sourceUrl}
		<EntityExternalLink href={event.sourceUrl} label="Event page" />
	{/if}
</div>
