<script lang="ts">
	import CopyLinkButton from '$lib/components/CopyLinkButton.svelte';
	// import { toastStore } from '$lib/stores.svelte';

	type Props = {
		url: string;
		entityLabel: string;
		label?: string;
		toolbar?: boolean;
	};

	let { url, entityLabel, label = 'Copy link', toolbar = true }: Props = $props();
</script>

<CopyLinkButton
	{url}
	{label}
	{toolbar}
	ariaLabel={`Copy link to ${entityLabel}`}
	successMessage={`Copied link for ${entityLabel}.`}
	errorMessage={`Could not copy link for ${entityLabel}.`}
	feedback="none"
/>
