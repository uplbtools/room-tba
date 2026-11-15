<script lang="ts">
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import X from '@lucide/svelte/icons/x';
	import { getAnnouncements } from '#lib/functions/announcements.remote.js';
	import { getAnnouncementsStore, getModalStore } from '#lib/utils/context.js';

	const announcementsStore = getAnnouncementsStore();
	const modalStore = getModalStore();
</script>

<svelte:boundary>
	{#snippet failed()}{/snippet}
	{@const notice = announcementsStore.critical(await getAnnouncements())}
	{#if notice}
		<div class="announcement-bar" role="alert">
			<TriangleAlert size={16} aria-hidden="true" />
			<div class="announcement-bar__text">
				<span class="announcement-bar__title">{notice.title}</span>
				<span class="announcement-bar__body">{notice.body}</span>
			</div>
			<button
				type="button"
				class="announcement-bar__more"
				onclick={() => modalStore.openModal('announcements')}
			>
				Details
			</button>
			<button
				type="button"
				class="announcement-bar__dismiss"
				aria-label="Dismiss announcement"
				onclick={() => announcementsStore.dismissCritical(notice.id)}
			>
				<X size={16} aria-hidden="true" />
			</button>
		</div>
	{/if}
</svelte:boundary>

<style>
	.announcement-bar {
		pointer-events: auto;
		align-self: stretch;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: hsl(0, 70%, 95%);
		color: hsl(0, 55%, 22%);
		border: 2px solid hsl(0, 60%, 45%);
		border-radius: 0.75rem;
	}

	.announcement-bar__text {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.375rem;
		min-width: 0;
		flex: 1 1 auto;
	}

	.announcement-bar__title {
		font-size: 0.8125rem;
		font-weight: 700;
		line-height: 1.3;
	}

	.announcement-bar__body {
		font-size: 0.75rem;
		line-height: 1.35;
		color: hsl(0, 40%, 30%);
		/* One line on small screens; the panel has the full text. */
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		overflow: hidden;
	}

	.announcement-bar__more {
		flex: 0 0 auto;
		font-size: 0.75rem;
		font-weight: 700;
		padding: 0.25rem 0.5rem;
		border-radius: 0.375rem;
		border: 1px solid hsl(0, 60%, 45%);
		background: transparent;
		color: inherit;
		cursor: pointer;
	}

	.announcement-bar__dismiss {
		flex: 0 0 auto;
		display: inline-flex;
		padding: 0.25rem;
		border: none;
		border-radius: 0.375rem;
		background: transparent;
		color: inherit;
		cursor: pointer;
	}

	.announcement-bar__more:focus-visible,
	.announcement-bar__dismiss:focus-visible {
		outline: 2px solid hsl(0, 60%, 30%);
		outline-offset: 1px;
	}
</style>
