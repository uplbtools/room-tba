<script lang="ts">
	import { page } from '$app/state';
	import EntityDirectionsChip from '#lib/components/entity/EntityDirectionsChip.svelte';
	import EntityExternalLink from '#lib/components/entity/EntityExternalLink.svelte';
	import EntityShareCopyLink from '#lib/components/entity/EntityShareCopyLink.svelte';
	import type { getEventById } from '#lib/functions/events.remote.js';
	import { formatCampusRange } from '#lib/utils/event/event-time.js';

	interface Props {
		event: Awaited<ReturnType<typeof getEventById>>;
	}
	const { event }: Props = $props();

	const location = $derived(event.locations.find((l) => l.isPrimary) ?? event.locations[0] ?? null);
</script>

<div class="entity-detail">
	<header class="entity-header">
		<h2 class="entity-header__title">{event.title}</h2>
		<p>{formatCampusRange(event.occurrenceStartsAt, event.occurrenceEndsAt)}</p>
		<div class="entity-actions">
			{#if location?.resolvedLat != null && location.resolvedLon != null}
				<EntityDirectionsChip
					lat={location.resolvedLat}
					lon={location.resolvedLon}
					destinationLabel={location.resolvedLabel}
				/>
			{/if}
			<EntityShareCopyLink url={page.url.href} entityLabel={event.title} />
		</div>
	</header>

	{#if location}
		<p>{location.resolvedLabel}</p>
	{/if}
	{#if event.description}
		<p class="entity-directions__text">{event.description}</p>
	{/if}
	{#if event.sourceUrl}
		<EntityExternalLink href={event.sourceUrl} label="Event page" />
	{/if}
</div>
