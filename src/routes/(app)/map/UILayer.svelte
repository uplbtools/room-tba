<script>
	const { children } = $props();
</script>

<div
	class="pointer-events-none fixed top-0 left-0 z-20 flex h-full w-full flex-col items-end justify-between gap-4 p-3"
>
	{@render children()}
</div>
