<script lang="ts">
	import { CopyIcon, MapPin } from '@lucide/svelte';
	import ResultAction from './ResultAction.svelte';
	import { copyTextToClipboard } from '#lib/utils/clipboard.js';
	import { page } from '$app/state';
	import { getToast } from '#lib/utils/context.js';
	import { hasLocation } from '#lib/utils/map/marker.js';

	interface Props {
		data: { lon: number | null; lat: number | null } & Record<string, unknown>;
	}
	const toastStore = getToast();
	const props: Props = $props();
</script>

<div class="flex gap-1 py-3">
	{#if hasLocation(props.data)}
		<ResultAction
			onclick={() => {
				alert('It works?');
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
