<script lang="ts">
	import { Copy } from '@lucide/svelte';
	import MapChromeActionChip from '#lib/components/map-chrome/MapChromeActionChip.svelte';
	import { copyTextToClipboard } from '#lib/utils/clipboard.js';
	import { getToast } from '#lib/utils/context.js';

	type Props = {
		url: string;
		entityLabel: string;
		label?: string;
		toolbar?: boolean;
	};

	let { url, entityLabel, label = 'Copy link', toolbar = true }: Props = $props();

	const toastStore = getToast();

	async function copy() {
		try {
			await copyTextToClipboard(url);
			toastStore.show(`Copied link for ${entityLabel}.`, 'success');
		} catch {
			toastStore.show(`Could not copy link for ${entityLabel}.`, 'error');
		}
	}
</script>

<MapChromeActionChip onclick={copy} {toolbar} ariaLabel={`Copy link to ${entityLabel}`}>
	<Copy size={14} aria-hidden="true" />
	{label}
</MapChromeActionChip>
