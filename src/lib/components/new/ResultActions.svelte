<script lang="ts">
	import { CopyIcon, CornerRightUp, MapPin } from '@lucide/svelte';
	import ResultAction from './ResultAction.svelte';
	import { copyTextToClipboard } from '#lib/utils/clipboard.js';
	import { page } from '$app/state';
	import { getToast, getUserLocation } from '#lib/utils/context.js';
	import { getGoogleMapsPinUrl } from '#lib/utils/google-maps-links.js';
	import { hasLocation } from '#lib/utils/map/marker.js';

	interface Props {
		data: { lon: number | null; lat: number | null } & Record<string, unknown>;
		name?: string;
	}
	const toastStore = getToast();
	const userLocation = getUserLocation();
	const props: Props = $props();
</script>

<div class="flex gap-1 py-3">
	{#if hasLocation(props.data)}
		{@const { lat, lon } = props.data}
		<ResultAction
			onclick={() => {
				userLocation.requestLocation();
				userLocation.setDestination([lon, lat]);
			}}
		>
			{#snippet icon()}
				<CornerRightUp size={18} />
			{/snippet}
			Directions
		</ResultAction>
		<ResultAction
			onclick={() => {
				window.open(getGoogleMapsPinUrl(lat, lon, props.name), '_blank', 'noopener');
			}}
		>
			{#snippet icon()}
				<MapPin size={18} />
			{/snippet}
			Google Maps
		</ResultAction>
	{/if}

	<ResultAction
		onclick={async () => {
			try {
				await copyTextToClipboard(page.url.href);
				toastStore.show('Copied link successfully', 'success');
			} catch {
				toastStore.show('An error occurred', 'error');
			}
		}}
	>
		{#snippet icon()}
			<CopyIcon size={18} />
		{/snippet}
		Copy Link
	</ResultAction>
</div>
