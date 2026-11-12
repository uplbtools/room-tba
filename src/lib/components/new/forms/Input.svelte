<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	const props: HTMLInputAttributes = $props();
</script>

<input {...props} class="border border-neutral-300 px-3 py-2" />
