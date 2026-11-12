<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	const props: HTMLTextareaAttributes = $props();
</script>

<textarea {...props} class="border border-neutral-300 p-3" rows="12"></textarea>
