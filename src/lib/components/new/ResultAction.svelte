<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		icon: Snippet;
		onclick?: (e: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) => void;
		children: Snippet;
	}

	const { icon, onclick, children: text }: Props = $props();
</script>

<button class="flex flex-col items-center gap-2 text-sm text-blue-700" {onclick}>
	<div class="rounded-full bg-blue-600 p-2 text-blue-50">
		{@render icon()}
	</div>
	{@render text()}
</button>
