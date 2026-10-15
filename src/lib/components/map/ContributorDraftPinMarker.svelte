<script lang="ts">
	import PinGlyph from './PinGlyph.svelte';
	import { draftPinMapProps, type DraftPinPreview } from '#lib/utils/editor/draft-pin-preview.js';
	import EventMapPin from './EventMapPin.svelte';
	import MapEntityPin from './MapEntityPin.svelte';

	type Props = {
		preview: DraftPinPreview;
	};

	let { preview }: Props = $props();

	const mapProps = $derived(draftPinMapProps(preview));
</script>

<div class="contributor-draft-pin">
	{#if mapProps.component === 'event'}
		<EventMapPin
			active
			ariaLabel={mapProps.label}
			dateLabel={mapProps.dateLabel ?? 'TBD'}
			imageSrc={mapProps.imageSrc}
			labelTitle={mapProps.label}
			labelVisible
			onclick={() => {}}
			status="upcoming"
			title={mapProps.label}
			useCentralHoverPreview={false}
		/>
	{:else}
		<MapEntityPin
			active
			label={mapProps.label}
			labelVisible
			tone={mapProps.tone}
			useCentralHoverPreview={false}
		>
			{#if mapProps.icon === 'university'}
				<PinGlyph name="building" size={20} />
			{:else if mapProps.icon === 'house'}
				<PinGlyph name="dorm" size={18} />
			{:else if mapProps.icon === 'landmark'}
				<PinGlyph name="landmark" size={16} />
			{:else if mapProps.icon === 'store'}
				<PinGlyph name="establishment" size={16} />
			{:else if mapProps.icon === 'users'}
				<PinGlyph name="organization" size={16} />
			{:else}
				<PinGlyph name="office" size={16} />
			{/if}
		</MapEntityPin>
	{/if}
</div>

<style>
	.contributor-draft-pin {
		position: relative;
		z-index: 90;
	}

	.contributor-draft-pin :global(.map-entity-pin) {
		border-width: 3px;
		transform: scale(1.18);
		box-shadow:
			0 0 0 2px rgba(255, 255, 255, 0.95),
			0 4px 12px rgba(0, 0, 0, 0.35);
	}

	.contributor-draft-pin :global(.map-entity-pin.building) {
		box-shadow:
			0 0 0 2px rgba(255, 255, 255, 0.95),
			0 0 0 4px hsl(5 53% 40% / 0.55),
			0 4px 12px rgba(0, 0, 0, 0.35);
	}

	.contributor-draft-pin :global(.map-entity-pin.dorm) {
		box-shadow:
			0 0 0 2px rgba(255, 255, 255, 0.95),
			0 0 0 4px hsl(170 50% 45% / 0.55),
			0 4px 12px rgba(0, 0, 0, 0.35);
	}

	.contributor-draft-pin :global(.map-entity-pin.organization) {
		box-shadow:
			0 0 0 2px rgba(255, 255, 255, 0.95),
			0 0 0 4px hsl(265 45% 58% / 0.55),
			0 4px 12px rgba(0, 0, 0, 0.35);
	}

	.contributor-draft-pin :global(.map-entity-pin.office) {
		box-shadow:
			0 0 0 2px rgba(255, 255, 255, 0.95),
			0 0 0 4px hsl(208 52% 52% / 0.55),
			0 4px 12px rgba(0, 0, 0, 0.35);
	}

	.contributor-draft-pin :global(.map-entity-pin.landmark) {
		box-shadow:
			0 0 0 2px rgba(255, 255, 255, 0.95),
			0 0 0 4px hsl(34 62% 52% / 0.55),
			0 4px 12px rgba(0, 0, 0, 0.35);
	}

	.contributor-draft-pin :global(.map-entity-pin.establishment) {
		box-shadow:
			0 0 0 2px rgba(255, 255, 255, 0.95),
			0 0 0 4px hsl(334 54% 53% / 0.55),
			0 4px 12px rgba(0, 0, 0, 0.35);
	}

	.contributor-draft-pin :global(.map-entity-pin.active::before) {
		outline-width: 0.2rem;
		outline-offset: 0.2rem;
	}

	.contributor-draft-pin :global(.event-map-pin) {
		border-width: 3px;
		transform: scale(1.18);
		box-shadow:
			0 0 0 2px rgba(255, 255, 255, 0.95),
			0 0 0 4px rgba(123, 17, 19, 0.45),
			0 4px 12px rgba(0, 0, 0, 0.35);
	}

	@media (prefers-reduced-motion: reduce) {
		.contributor-draft-pin :global(.map-entity-pin),
		.contributor-draft-pin :global(.event-map-pin) {
			transform: none;
		}
	}
</style>
