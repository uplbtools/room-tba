<script lang="ts">
	import InfoPanel from '#lib/components/new/InfoPanel.svelte';
	import LoadingIndicator from '#lib/components/LoadingIndicator.svelte';
	import { getStaffDashboard } from '#lib/functions/dashboard.remote.js';
	import { getAdminAuthStore } from '#lib/utils/context.js';

	const adminAuthStore = getAdminAuthStore();

	const when = new Intl.DateTimeFormat('en-PH', {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		timeZone: 'Asia/Manila'
	});
	const at = (value: string) => when.format(new Date(`${value.replace(' ', 'T')}Z`));
	const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

	const section = 'flex flex-col gap-2 rounded-lg border border-neutral-200 p-3';
	const button =
		'inline-flex min-h-10 w-fit items-center rounded-full border border-neutral-400 px-4 text-sm font-semibold';
</script>

<svelte:head>
	<title>Staff home | Room TBA</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<InfoPanel>
	{#if !adminAuthStore.canReview}
		<p class="p-4 text-sm">Sign in as an editor to see the staff home.</p>
	{:else}
		<div class="flex flex-col gap-3 p-4">
			<h2 class="text-xl font-semibold">Staff home</h2>
			<p class="text-sm">
				Signed in as <strong>{adminAuthStore.displayName ?? adminAuthStore.username}</strong>
				({adminAuthStore.role}).
			</p>
			<svelte:boundary>
				{#snippet pending()}
					<LoadingIndicator label="Loading staff home…" />
				{/snippet}
				{#snippet failed()}
					<p class="text-sm text-red-900">Couldn't load the staff home.</p>
				{/snippet}
				{@const dashboard = await getStaffDashboard()}
				<div class="flex flex-col gap-3">
					<section class={section} aria-labelledby="review-title">
						<h3 id="review-title" class="font-semibold">Review queue</h3>
						<p class="text-sm" data-testid="pending-reviews">
							<span class="mr-1 text-3xl font-bold">{dashboard.pendingReviews}</span>
							suggestion{dashboard.pendingReviews === 1 ? '' : 's'} waiting
						</p>
						<a class={button} href="/map/admin/suggestions">Open review queue</a>
					</section>

					<section class={section} aria-labelledby="digest-title">
						<h3 id="digest-title" class="font-semibold">Daily digest</h3>
						<p class="text-sm">
							This email lists suggestions waiting for review. It goes to {plural(
								dashboard.digest.recipientCount,
								'editor'
							)}. You {dashboard.digest.youReceiveIt ? 'receive it' : "don't receive it"}.
						</p>
						<button type="button" class={button} onclick={adminAuthStore.openAccountSettings}>
							Email preferences
						</button>
					</section>

					<section class={section} aria-labelledby="queue-title">
						<h3 id="queue-title" class="font-semibold">Discord queue</h3>
						<p class="text-sm">
							{dashboard.outbox.pending} waiting to retry, {dashboard.outbox.dead} gave up.
						</p>
					</section>

					<section class={section} aria-labelledby="activity-title">
						<h3 id="activity-title" class="font-semibold">Recent activity</h3>
						{#if dashboard.recentActivity.length === 0}
							<p class="text-sm">There's nothing yet.</p>
						{:else}
							<ul class="flex flex-col gap-2 text-sm">
								{#each dashboard.recentActivity as entry (entry.id)}
									<li class="flex flex-col gap-0.5 [overflow-wrap:anywhere]">
										<span>
											<strong>{entry.editedBy}</strong>
											{entry.summary ?? `${entry.action} ${entry.entityType.replace('_', ' ')}`}
										</span>
										<small class="text-neutral-600">{at(entry.createdAt)}</small>
									</li>
								{/each}
							</ul>
						{/if}
					</section>

					{#if dashboard.accessRequests}
						<section class={section} aria-labelledby="accounts-title">
							<h3 id="accounts-title" class="font-semibold">Accounts</h3>
							{#if dashboard.accessRequests.length === 0}
								<p class="text-sm">There are no pending editor access requests.</p>
							{:else}
								<h4 class="text-sm font-semibold">Editor access requests</h4>
								<ul class="flex flex-col gap-2 text-sm">
									{#each dashboard.accessRequests as request (request.id)}
										<li class="flex flex-col gap-0.5 [overflow-wrap:anywhere]">
											<span>
												<strong>{request.displayName}</strong> ({request.username})
												<small class="text-neutral-600">{at(request.createdAt)}</small>
											</span>
											<span class="whitespace-pre-wrap">{request.message}</span>
										</li>
									{/each}
								</ul>
							{/if}
							<div class="flex flex-wrap gap-2">
								<button type="button" class={button} onclick={adminAuthStore.openManageUsers}>
									Manage users
								</button>
								<a class={button} href="/map/admin/audit-log">Audit log</a>
							</div>
						</section>
					{/if}
				</div>
			</svelte:boundary>
		</div>
	{/if}
</InfoPanel>
