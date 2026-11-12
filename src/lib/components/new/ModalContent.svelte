<script lang="ts">
	import { cn } from 'cn';
	import type { Snippet } from 'svelte';
	import { circIn, circOut } from 'svelte/easing';
	import { scale } from 'svelte/transition';

	// script code
	interface Props {
		children: Snippet;
		className?: string;
	}

	const { children, className }: Props = $props();
</script>

<div
	class={cn(
		'pointer-events-auto max-h-[90%] min-h-96 shrink grow-0 basis-xl overflow-hidden rounded-xl bg-white',
		className
	)}
	in:scale|global={{
		opacity: 0,
		// y: 24,
		start: 0.95,
		duration: 300,
		easing: circOut
	}}
	out:scale|global={{
		duration: 200,
		// y: 0,
		opacity: 0,
		start: 0.95,
		easing: circIn
	}}
>
	{@render children()}
</div>

<style>
</style>
