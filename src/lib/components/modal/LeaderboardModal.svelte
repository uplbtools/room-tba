<script lang="ts">
	import LeaderboardPanel from '#lib/components/status-bar/LeaderboardPanel.svelte';
</script>

<div class="leaderboard-modal">
	<div class="leaderboard-modal-header">
		<h2 id="leaderboard-modal-title">Contributor leaderboard</h2>
		<p class="leaderboard-modal-note">
			Suggest edits to rooms, schedules and places. Each approved edit earns points.
		</p>
	</div>
	<div class="leaderboard-modal-body map-chrome-scroll">
		<LeaderboardPanel />
	</div>
</div>

<style>
	.leaderboard-modal {
		display: flex;
		flex-direction: column;
		padding: 1.5rem;
		height: 100%;
		max-height: calc(90dvh - 1rem);
	}

	.leaderboard-modal-header {
		margin-bottom: 1rem;
		flex-shrink: 0;
	}

	.leaderboard-modal-header h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
		font-weight: 700;
	}

	.leaderboard-modal-note {
		margin: 0;
		font-size: 0.875rem;
		color: hsl(0, 0%, 40%);
	}

	.leaderboard-modal-body {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}
</style>
