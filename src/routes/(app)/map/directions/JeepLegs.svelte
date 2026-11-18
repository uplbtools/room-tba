<script lang="ts">
	import type { JeepJourney } from '#lib/utils/travel-graph/journey.js';

	const { jeep, from, to }: { jeep: JeepJourney; from: string; to: string } = $props();
	const [walkIn, ride, walkOut] = $derived(jeep.legs);
	const minutes = (seconds: number) => Math.max(1, Math.round(seconds / 60));
</script>

<ol class="flex flex-col gap-2 text-sm">
	<li>Walk {minutes(walkIn.seconds)} min from {from} to {ride.boardStopName}</li>
	<li class="flex flex-col border-l-4 pl-2" style:border-color={ride.color}>
		<span class="font-semibold">
			{ride.code ?? ride.routeName}{ride.directionLabel ? ` (${ride.directionLabel})` : ''}
		</span>
		<span>
			Ride {ride.stopCount - 1} stop{ride.stopCount === 2 ? '' : 's'} to {ride.alightStopName},
			about {minutes(ride.seconds)} min with the wait{ride.fare
				? `, ₱${ride.fare.regular} (₱${ride.fare.discounted} student)`
				: ''}
		</span>
	</li>
	<li>Walk {minutes(walkOut.seconds)} min to {to}</li>
</ol>
