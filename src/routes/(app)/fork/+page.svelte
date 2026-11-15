<script lang="ts">
	import ForkWizard from './ForkWizard.svelte';
</script>

<main class="mx-auto w-full max-w-[60rem] px-5 pt-8 pb-16 text-[#231c1b]">
	<a href="/map" class="mb-6 inline-block font-semibold text-[#8c231c] hover:underline">
		<span aria-hidden="true">←</span> Back to Room TBA
	</a>
	<h1 class="text-[clamp(1.9rem,5vw,2.8rem)] leading-none font-bold tracking-tight">
		Fork Room TBA for your campus
	</h1>
	<p class="mt-4 mb-10 max-w-[44rem] text-[1.05rem] leading-normal">
		Gawa ka ng Room TBA para sa campus mo. Point the map at your school, type a name, and this page
		hands you the config file and a Vercel deploy link. The map below uses plain OpenStreetMap
		tiles, so it needs no API key and sends nothing anywhere.
	</p>
	<ForkWizard />
</main>
