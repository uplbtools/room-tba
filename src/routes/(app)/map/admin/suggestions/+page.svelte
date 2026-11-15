<script lang="ts">
	import InfoPanel from '#lib/components/new/InfoPanel.svelte';
	import { getAdminAuthStore } from '#lib/utils/context.js';
	import ProposalReviewPanel from './ProposalReviewPanel.svelte';

	const adminAuthStore = getAdminAuthStore();
</script>

<svelte:head>
	<title>Review suggested edits | Room TBA</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<InfoPanel>
	{#if adminAuthStore.canReview}
		<ProposalReviewPanel />
	{:else}
		<p class="p-4 text-sm">Sign in as an editor to review suggested edits.</p>
	{/if}
</InfoPanel>
