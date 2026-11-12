<script lang="ts">
	import type { Snippet } from 'svelte';

	const {
		children
	}: {
		children: Snippet;
	} = $props();
</script>

<div class="flex flex-col gap-1">
	{@render children()}
</div>
