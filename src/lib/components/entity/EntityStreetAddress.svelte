<script lang="ts">
	type Props = {
		lat: number;
		lon: number;
	};

	let { lat, lon }: Props = $props();

	async function reverseGeocode(lat: number, lon: number) {
		try {
			const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
			const response = await fetch(`/api/geocode/reverse?${params}`);
			if (!response.ok) return null;
			const data = (await response.json()) as { address?: string | null };
			return typeof data.address === 'string' ? data.address : null;
		} catch {
			return null;
		}
	}

	const address = $derived(reverseGeocode(lat, lon));
</script>

{#await address then value}
	{#if value}
		<p class="entity-street-address">{value}</p>
	{/if}
{/await}

<style>
	.entity-street-address {
		margin: 0;
		font-size: 0.8125rem;
		line-height: 1.4;
		color: hsl(0, 0%, 38%);
	}
</style>
