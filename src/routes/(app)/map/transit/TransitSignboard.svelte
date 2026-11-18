<script lang="ts">
	import type { TransitRouteKind } from '#lib/utils/transit/transit-route-kind.js';

	const {
		lines,
		kind = 'campus',
		lineColor,
		small = false
	}: {
		lines: readonly string[];
		kind?: TransitRouteKind;
		lineColor?: string;
		small?: boolean;
	} = $props();

	const tone: Record<TransitRouteKind, string> = {
		campus: 'text-[#70e500] [text-shadow:1px_1px_0_#2a5400]',
		bus: 'text-[#e5e500] [text-shadow:1px_1px_0_#5a5a00]',
		town: 'text-[#ff5a3c] [text-shadow:1px_1px_0_#5a1400]'
	};
</script>

<span
	class={[
		'inline-flex flex-col items-center rounded border border-[#c9c3b6] bg-[#12110f] font-extrabold tracking-wide whitespace-nowrap uppercase shadow-[inset_0_0_0_2px_#12110f,inset_0_0_0_3px_#3a3631]',
		small
			? 'px-[0.4375rem] py-[0.1875rem] text-[0.6875rem] leading-[1.1]'
			: 'px-3 pt-1.5 pb-[0.3125rem] text-base leading-[1.15]',
		lineColor && 'border-b-4',
		tone[kind]
	]}
	style:border-bottom-color={lineColor}
>
	{#each lines as line (line)}
		<span>{line}</span>
	{/each}
</span>
