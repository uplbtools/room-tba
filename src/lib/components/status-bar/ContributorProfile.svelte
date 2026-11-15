<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Avatar from '#lib/components/Avatar.svelte';
	import LoadingIndicator from '#lib/components/LoadingIndicator.svelte';
	import { getContributorProfile } from '#lib/functions/leaderboard.remote.js';
	import { getAdminAuthStore } from '#lib/utils/context.js';
	import {
		CONTRIBUTION_KINDS,
		KIND_LABELS,
		KIND_POINTS,
		pointsLabel
	} from '#lib/utils/contributors/scoring.js';

	type Props = {
		profileKey: string;
		board: 'community' | 'editors';
		isMe: boolean;
		onback: () => void;
	};

	let { profileKey, board, isMe, onback }: Props = $props();

	const adminAuthStore = getAdminAuthStore();

	const joined = new Intl.DateTimeFormat('en-PH', {
		month: 'long',
		year: 'numeric',
		timeZone: 'Asia/Manila'
	});
	const shortDate = new Intl.DateTimeFormat('en-PH', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		timeZone: 'Asia/Manila'
	});

	function httpsUrl(value: string | null) {
		try {
			const url = new URL(value ?? '');
			return url.protocol === 'https:' ? url.href : null;
		} catch {
			return null;
		}
	}

	let failedAvatar = $state<string | null>(null);
</script>

<section class="flex flex-col gap-3 pb-2" aria-label="Contributor profile">
	<div class="flex min-h-12 items-center gap-1">
		<button
			type="button"
			class="inline-flex size-12 items-center justify-center rounded-full hover:bg-neutral-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-red-900"
			aria-label="Back to leaderboard"
			onclick={onback}
		>
			<ArrowLeft size={24} aria-hidden="true" />
		</button>
		<span class="font-semibold text-neutral-600">Contributor</span>
	</div>

	<svelte:boundary>
		{#snippet pending()}
			<p class="px-1 text-sm text-neutral-600">
				<LoadingIndicator label="Loading profile…" />
			</p>
		{/snippet}
		{#snippet failed()}
			<p class="px-1 text-sm text-red-900">Couldn't load this profile.</p>
		{/snippet}
		{@const profile = await getContributorProfile({ key: profileKey, board })}

		{#if !profile}
			<p class="px-1 text-sm text-neutral-600">This contributor's profile isn't public.</p>
		{:else}
			{@const avatar = httpsUrl(profile.avatarUrl)}
			{@const website = httpsUrl(profile.profileUrl)}
			<header class="flex items-center gap-4 px-1">
				{#if avatar && failedAvatar !== avatar}
					<img
						class="size-16 shrink-0 rounded-full object-cover"
						src={avatar}
						alt=""
						width="64"
						height="64"
						referrerpolicy="no-referrer"
						onerror={() => (failedAvatar = avatar)}
					/>
				{:else}
					<Avatar name={profile.displayName} size={64} />
				{/if}
				<div class="flex min-w-0 flex-col gap-0.5">
					<h3 class="text-xl leading-tight font-semibold [overflow-wrap:anywhere]">
						{profile.displayName}
					</h3>
					<p class="text-sm text-neutral-600">Joined {joined.format(new Date(profile.joinedAt))}</p>
					{#if website}
						<a
							class="w-fit text-sm font-semibold text-red-900 underline"
							href={website}
							target="_blank"
							rel="noopener noreferrer nofollow">Website</a
						>
					{/if}
					{#if isMe}
						<button
							type="button"
							class="min-h-9 w-fit text-sm font-semibold text-red-900 underline"
							onclick={adminAuthStore.openAccountSettings}
						>
							Edit profile
						</button>
					{/if}
				</div>
			</header>

			<dl class="grid grid-cols-2 gap-2 px-1">
				<div class="rounded-xl bg-neutral-100 p-3">
					<dt class="text-[0.8125rem] text-neutral-600">Points</dt>
					<dd class="text-2xl font-bold">{profile.points}</dd>
				</div>
				<div class="rounded-xl bg-neutral-100 p-3">
					<dt class="text-[0.8125rem] text-neutral-600">Approved edits</dt>
					<dd class="text-2xl font-bold">{profile.contributionCount}</dd>
				</div>
			</dl>

			<ul class="flex flex-wrap gap-2 px-1" aria-label="Badges">
				{#each profile.badges as badge (badge.id)}
					<li
						class="rounded-full border px-3 py-1.5 text-[0.8125rem] font-medium {badge.earned
							? 'border-transparent bg-red-50 text-red-900'
							: 'border-dashed border-neutral-400 text-neutral-600'}"
					>
						{badge.label}
						<span class="sr-only">{badge.earned ? 'earned' : 'not earned yet'}</span>
					</li>
				{/each}
			</ul>

			<h4 class="px-1 pt-2 text-sm font-semibold text-red-900">Points by type</h4>
			<ul>
				{#each CONTRIBUTION_KINDS.filter((kind) => profile.breakdown[kind] > 0) as kind (kind)}
					<li class="grid min-h-12 grid-cols-[1fr_auto_auto] items-center gap-3 px-1">
						<span>{KIND_LABELS[kind]}</span>
						<span class="text-[0.8125rem] text-neutral-600">
							{profile.breakdown[kind]} × {KIND_POINTS[kind]}
						</span>
						<span class="font-semibold">
							{pointsLabel(profile.breakdown[kind] * KIND_POINTS[kind])}
						</span>
					</li>
				{/each}
			</ul>

			<h4 class="px-1 pt-2 text-sm font-semibold text-red-900">Recent edits</h4>
			<ul>
				{#each profile.recent as item (item.id)}
					<li>
						<svelte:element
							this={item.href ? 'a' : 'div'}
							href={item.href}
							class="flex min-h-14 flex-col justify-center rounded-lg px-1 {item.href
								? 'hover:bg-neutral-100'
								: ''}"
						>
							<span class="[overflow-wrap:anywhere]">{item.entityLabel}</span>
							<span class="text-sm text-neutral-600">
								{KIND_LABELS[item.kind]}, {shortDate.format(new Date(item.createdAt))}
							</span>
						</svelte:element>
					</li>
				{/each}
			</ul>
		{/if}
	</svelte:boundary>
</section>
