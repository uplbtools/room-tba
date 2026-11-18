<script lang="ts">
	import { Share2 } from '@lucide/svelte';
	import ResultAction from '#lib/components/new/ResultAction.svelte';
	import { copyTextToClipboard } from '#lib/utils/clipboard.js';
	import { getToast } from '#lib/utils/context.js';

	const { label }: { label: string } = $props();
	const toastStore = getToast();

	async function share() {
		try {
			if (navigator.share) {
				await navigator.share({ title: label, url: location.href });
				return;
			}
			await copyTextToClipboard(location.href);
			toastStore.show(`Copied link for ${label}.`, 'success');
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') return;
			toastStore.show(`Couldn't share ${label}.`, 'error');
		}
	}
</script>

<div class="flex w-20">
	<ResultAction onclick={share}>
		{#snippet icon()}
			<Share2 size={18} />
		{/snippet}
		Share
	</ResultAction>
</div>
