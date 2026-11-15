<script lang="ts">
	import { onMount } from 'svelte';
	import { getMyStanding } from '#lib/functions/leaderboard.remote.js';
	import { getAdminAuthStore, getToast } from '#lib/utils/context.js';
	import { newBadges, rewardMessage } from '#lib/utils/contributors/scoring.js';

	const SEEN_KEY = 'room-tba-contribution-reward-seen';
	const auth = getAdminAuthStore();
	const toast = getToast();

	function readSeen(): number | null {
		try {
			const raw = localStorage.getItem(SEEN_KEY);
			return raw === null || !Number.isFinite(Number(raw)) ? null : Number(raw);
		} catch {
			return null;
		}
	}

	async function check() {
		if (!auth.isLoggedIn) return;
		const me = await getMyStanding({ window: 'month', board: 'community' });
		const latest = me?.recent[0]?.id;
		if (!me || latest == null) return;
		const seen = readSeen();
		try {
			localStorage.setItem(SEEN_KEY, String(latest));
		} catch {}
		// First check on this browser: start counting from now.
		if (seen === null) return;
		const fresh = me.recent.filter((item) => item.id > seen);
		if (fresh.length === 0 || toast.message) return;
		const gained = fresh.reduce((sum, item) => sum + item.points, 0);
		const badges = newBadges(me.contributions - fresh.length, me.contributions);
		const note = badges.length
			? `. You earned the ${badges.map((b) => b.label).join(' and ')} ${badges.length === 1 ? 'badge' : 'badges'}`
			: '';
		toast.show(`${rewardMessage(gained, me.rank)}${note}`, 'success');
	}

	onMount(() => {
		const timer = setTimeout(() => void check().catch(() => {}), 4000);
		return () => clearTimeout(timer);
	});
</script>
