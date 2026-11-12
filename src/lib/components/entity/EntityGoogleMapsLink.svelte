<script lang="ts">
	import MapPin from '@lucide/svelte/icons/map-pin';
	import MapChromeActionLink from '#lib/components/map-chrome/MapChromeActionLink.svelte';
	import { getGoogleMapsPinUrl } from '#lib/utils/google-maps-links.js';

	type Props = {
		lat: number;
		lon: number;
		ariaLabel?: string;
		label?: string;
		toolbar?: boolean;
	};

	let {
		lat,
		lon,
		ariaLabel = 'Open in Google Maps',
		label = 'Google Maps',
		toolbar = true
	}: Props = $props();

	const href = $derived(getGoogleMapsPinUrl(lat, lon));
</script>

<MapChromeActionLink {href} {ariaLabel} {toolbar}>
	<MapPin size={14} aria-hidden="true" />
	{label}
</MapChromeActionLink>
