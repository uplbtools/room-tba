<script lang="ts">
	import type { RemoteFormIssue } from '$app/server';

	const {
		issues
	}: {
		issues: RemoteFormIssue[] | undefined;
	} = $props();
</script>

<div class="text-red-600">
	{#if issues}
		{#each issues as issue (issue.path)}
			<p>
				{issue.message}
			</p>
		{/each}
	{/if}
</div>
