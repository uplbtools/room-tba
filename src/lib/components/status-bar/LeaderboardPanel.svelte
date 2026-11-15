<script lang="ts">
	import Avatar from '#lib/components/Avatar.svelte';
	import LoadingIndicator from '#lib/components/LoadingIndicator.svelte';
	import { getLeaderboard, getMyStanding } from '#lib/functions/leaderboard.remote.js';
	import {
		CONTRIBUTION_KINDS,
		KIND_LABELS,
		KIND_POINTS,
		endsInLabel,
		pointsLabel,
		type KindBreakdown,
		type LeaderboardWindow
	} from '#lib/utils/contributors/scoring.js';

	const WINDOWS: { value: LeaderboardWindow; label: string; phrase: string }[] = [
		{ value: 'month', label: 'This month', phrase: 'this month' },
		{ value: 'semester', label: 'This semester', phrase: 'this semester' },
		{ value: 'all', label: 'All time', phrase: 'all time' }
	];
	const BOARDS = [
		{ value: 'community', label: 'Community' },
		{ value: 'editors', label: 'Editors' }
	] as const;
	const MEDALS = ['🥇', '🥈', '🥉'];
	const MEDAL_NAMES = ['gold', 'silver', 'bronze'];

	let timeWindow = $state<LeaderboardWindow>('month');
	let board = $state<(typeof BOARDS)[number]['value']>('community');
	let expandedKey = $state<string | null>(null);

	const phrase = $derived(WINDOWS.find((option) => option.value === timeWindow)!.phrase);

	function breakdownLines(breakdown: KindBreakdown) {
		return CONTRIBUTION_KINDS.filter((kind) => breakdown[kind] > 0).map((kind) => ({
			kind,
			count: breakdown[kind],
			points: breakdown[kind] * KIND_POINTS[kind]
		}));
	}

	function rankLabel(row: { rank: number; medal: 1 | 2 | 3 | null }) {
		return row.medal ? `Rank ${row.rank}, ${MEDAL_NAMES[row.medal - 1]}` : `Rank ${row.rank}`;
	}
</script>

{#snippet score(key: string, points: number, breakdown: KindBreakdown)}
	<button
		type="button"
		class="flex min-h-12 min-w-12 flex-col items-end justify-center rounded-lg px-1 hover:bg-neutral-100"
		aria-expanded={expandedKey === key}
		aria-label="{pointsLabel(points)}, show breakdown"
		onclick={() => (expandedKey = expandedKey === key ? null : key)}
	>
		<span class="text-lg leading-tight font-bold text-red-900 tabular-nums">{points}</span>
		<span class="text-xs text-neutral-600">{points === 1 ? 'point' : 'points'}</span>
	</button>
	{#if expandedKey === key}
		<ul
			class="col-span-2 col-start-2 my-1 flex flex-col gap-1 rounded-lg bg-neutral-100 px-3 py-2 text-[0.8125rem]"
			aria-label="Points breakdown"
		>
			{#each breakdownLines(breakdown) as line (line.kind)}
				<li class="grid grid-cols-[1fr_auto_2rem] gap-2 text-right">
					<span class="text-left">{KIND_LABELS[line.kind]}</span>
					<span class="text-neutral-600">{line.count} × {KIND_POINTS[line.kind]}</span>
					<strong>{line.points}</strong>
				</li>
			{/each}
		</ul>
	{/if}
{/snippet}

<div class="flex flex-col gap-2 pt-1 pb-2">
	<div class="flex gap-1 border-b border-neutral-200" role="tablist" aria-label="Leaderboard">
		{#each BOARDS as option (option.value)}
			<button
				type="button"
				role="tab"
				class="min-h-12 border-b-[3px] border-transparent px-4 text-sm font-medium text-neutral-600 aria-selected:border-red-900 aria-selected:text-red-900"
				aria-selected={board === option.value}
				onclick={() => (board = option.value)}
			>
				{option.label}
			</button>
		{/each}
	</div>

	<div
		role="radiogroup"
		aria-label="Period"
		class="grid grid-cols-3 gap-0.5 rounded-full bg-neutral-100 p-0.75"
	>
		{#each WINDOWS as option (option.value)}
			<label
				class="flex min-h-10 cursor-pointer items-center justify-center rounded-full px-2 text-center text-sm leading-tight text-neutral-600 has-checked:bg-white has-checked:font-semibold has-checked:text-neutral-950 has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-red-900"
			>
				<input
					type="radio"
					class="sr-only"
					name="leaderboard-period"
					value={option.value}
					bind:group={timeWindow}
				/>
				{option.label}
			</label>
		{/each}
	</div>

	<details class="px-1 text-sm text-neutral-600">
		<summary class="flex min-h-9 w-fit cursor-pointer items-center font-semibold text-red-900">
			How points work
		</summary>
		<p class="my-1">
			{board === 'community'
				? 'You get points when an editor approves an edit you suggested.'
				: 'This board counts edits that editors publish themselves.'}
		</p>
		<ul class="my-2 flex flex-col gap-1 rounded-lg bg-neutral-100 px-3 py-2 text-neutral-950">
			{#each CONTRIBUTION_KINDS as kind (kind)}
				<li class="flex justify-between gap-3">
					<span>{KIND_LABELS[kind]}</span>
					<span class="text-neutral-600 tabular-nums">{pointsLabel(KIND_POINTS[kind])}</span>
				</li>
			{/each}
		</ul>
		<p class="my-1">
			The monthly board starts over on the 1st of every month. Each month's top contributor goes to
			the hall of fame.
		</p>
	</details>

	<svelte:boundary>
		{#snippet pending()}
			<p class="px-1 py-2 text-sm text-neutral-600">
				<LoadingIndicator label="Loading leaderboard…" />
			</p>
		{/snippet}
		{#snippet failed()}
			<p class="px-1 py-2 text-sm text-red-900">Couldn't load the leaderboard.</p>
		{/snippet}
		{@const data = await getLeaderboard({ window: timeWindow, board })}
		{@const me = await getMyStanding({ window: timeWindow, board })}

		{#if data.period}
			<p class="flex justify-between gap-3 px-1 text-sm text-neutral-600">
				<span>{data.period.label}</span>
				<span>{endsInLabel(data.period.daysLeft)}</span>
			</p>
		{/if}

		{#if data.rows.length === 0}
			<div class="flex flex-col gap-1 px-1 pt-5 pb-3 text-sm text-neutral-600">
				<p class="text-base font-semibold text-neutral-950">No approved edits yet {phrase}</p>
				{#if !me && board === 'community'}
					<p>Suggest an edit on any place to get on the board.</p>
				{/if}
			</div>
		{:else}
			<ol class="flex flex-col gap-1">
				{#each data.rows as row (row.key)}
					<li
						class="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-2 rounded-xl px-2 py-1 {row.medal
							? 'bg-red-50'
							: ''} {me?.key === row.key ? 'ring-1 ring-red-200 ring-inset' : ''}"
					>
						<span
							class="text-center font-semibold text-neutral-600 tabular-nums {row.medal
								? 'text-xl'
								: ''}"
						>
							{#if row.medal}
								<span role="img" aria-label={rankLabel(row)}>{MEDALS[row.medal - 1]}</span>
							{:else}
								<span aria-label={rankLabel(row)}>{row.rank}</span>
							{/if}
						</span>
						<span class="flex min-h-12 min-w-0 items-center gap-3">
							<Avatar name={row.displayName} size={36} />
							<span class="flex min-w-0 flex-col">
								<span class="line-clamp-2 leading-tight font-medium [overflow-wrap:anywhere]"
									>{row.displayName}</span
								>
								{#if me?.key === row.key}
									<span class="text-[0.8125rem] text-neutral-600">You</span>
								{:else if row.gettingStarted}
									<span class="text-[0.8125rem] text-neutral-600">Getting started</span>
								{/if}
							</span>
						</span>
						{@render score(row.key, row.points, row.breakdown)}
					</li>
				{/each}
			</ol>
		{/if}

		{#if me}
			<div
				class="sticky bottom-0 bg-white pt-1 [@media(max-height:500px)]:static"
				aria-label="Your rank"
				role="group"
			>
				<div
					class="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-2 rounded-xl bg-neutral-100 px-2 py-1 ring-1 ring-red-200 ring-inset"
				>
					<span class="text-center font-semibold text-neutral-600 tabular-nums">
						{me.rank ? `#${me.rank}` : '-'}
					</span>
					<span class="flex min-h-12 min-w-0 items-center gap-3">
						<Avatar name="You" size={36} />
						<span class="flex min-w-0 flex-col">
							<span class="font-medium">You</span>
							<span class="text-[0.8125rem] text-neutral-600">
								{#if me.optedOut}
									You're hidden from credits. Turn on "Show me in credits" in Account settings.
								{:else if !me.rank}
									You have no points yet {phrase}
								{:else if me.toPass}
									{me.toPass.points} more to pass #{me.toPass.rank}
								{:else}
									You're in the lead
								{/if}
							</span>
						</span>
					</span>
					{@render score(`me-${me.key}`, me.points, me.breakdown)}
				</div>
			</div>
		{:else if board === 'community' && data.rows.length > 0}
			<p class="px-1 py-2 text-sm text-neutral-600">
				Suggest an edit on any place to join the board.
			</p>
		{/if}

		{#if data.hallOfFame.length > 0}
			<section class="mt-4 flex flex-col" aria-labelledby="leaderboard-hall-title">
				<h3 id="leaderboard-hall-title" class="px-1 pb-2 text-[0.9375rem] font-semibold">
					Hall of fame
				</h3>
				<ul>
					{#each data.hallOfFame as entry (entry.label)}
						<li
							class="grid grid-cols-[7.5rem_minmax(0,1fr)] items-baseline gap-x-3 border-t border-neutral-200 px-1 py-2.5"
						>
							<span class="text-[0.8125rem] text-neutral-600">{entry.label}</span>
							<span class="text-[0.9375rem]">
								<span class="font-semibold [overflow-wrap:anywhere]">
									{entry.winners.map((winner) => winner.displayName).join(', ')}
								</span>
								<span class="float-right ml-2 text-[0.8125rem] text-neutral-600 tabular-nums">
									{pointsLabel(entry.winners[0]?.points ?? 0)}
								</span>
							</span>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</svelte:boundary>
</div>
