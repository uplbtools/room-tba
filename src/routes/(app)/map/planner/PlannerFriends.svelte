<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { getPlannerStore, getToast } from '#lib/utils/context.js';
	import { formatMinutesRange } from '#lib/utils/planner/format.js';
	import { freeTogether, sharedSections } from '#lib/utils/planner/friends.js';
	import { encodeGroup } from '#lib/utils/planner/share-codec.js';

	const plannerStore = getPlannerStore();
	const toastStore = getToast();
	const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	let name = $state(plannerStore.myName);
	const hidden = new SvelteSet<string>();

	const termId = $derived(plannerStore.activeTermId);
	const friends = $derived(plannerStore.friendsForTerm);
	const shown = $derived(friends.filter((f) => !hidden.has(f.name)));
	const mine = $derived((plannerStore.activePlan?.sections ?? []).filter((s) => !s.stale));
	const people = $derived([
		...(mine.length ? [{ name: plannerStore.myName || 'You', sections: mine }] : []),
		...shown
	]);
	const freeByDay = $derived.by(() => {
		const byDay = new Map<number, string[]>();
		for (const w of freeTogether(people.map((p) => p.sections))) {
			byDay.set(w.dayIndex, [
				...(byDay.get(w.dayIndex) ?? []),
				formatMinutesRange(w.startMin, w.endMin)
			]);
		}
		return [...byDay];
	});
	const shared = $derived(sharedSections(people));

	async function addMe() {
		const me = name.trim();
		if (!me || termId == null || mine.length === 0) return;
		plannerStore.setMyName(me);
		const url = `${location.origin}/map/planner?group=${encodeGroup(termId, [
			{ name: me, sections: mine },
			...friends
		])}`;
		try {
			if (navigator.share && matchMedia('(pointer: coarse)').matches) {
				await navigator.share({ title: 'Our class schedules', url });
			} else {
				await navigator.clipboard.writeText(url);
				toastStore.show('Group link copied. Post it in your group chat.', 'success');
			}
		} catch (error) {
			if ((error as Error).name !== 'AbortError')
				toastStore.show("Couldn't copy the link", 'error');
		}
	}

	function toggle(friendName: string, checked: boolean) {
		if (checked) hidden.delete(friendName);
		else hidden.add(friendName);
	}
</script>

<details class="friends" open={friends.length > 0}>
	<summary class="friends__summary">
		Friends{friends.length ? ` (${friends.length})` : ''}
	</summary>
	<p class="friends__hint">
		Send one link to your group chat. Each friend opens it, adds their classes, and posts the new
		link back.
	</p>
	<div class="friends__row">
		<label>
			Your name
			<input bind:value={name} maxlength="30" autocomplete="nickname" />
		</label>
		<button
			type="button"
			class="friends__go"
			onclick={addMe}
			disabled={!name.trim() || mine.length === 0}
		>
			{friends.length ? 'Add me and copy link' : 'Start a group link'}
		</button>
	</div>
	{#if mine.length === 0}
		<p class="friends__hint" role="note">Add your classes first so they go in the link.</p>
	{/if}

	{#if friends.length > 0}
		<ul class="friends__list">
			{#each friends as friend (friend.name)}
				<li>
					<label class="friends__check">
						<input
							type="checkbox"
							checked={!hidden.has(friend.name)}
							onchange={(e) => toggle(friend.name, e.currentTarget.checked)}
						/>
						{friend.name}
					</label>
					<button
						type="button"
						class="friends__remove"
						onclick={() => plannerStore.removeFriend(friend.termId, friend.name)}
						aria-label="Remove {friend.name}"
					>
						Remove
					</button>
				</li>
			{/each}
		</ul>

		<h3 class="friends__heading">Free together</h3>
		{#if shown.length === 0}
			<p class="friends__hint">Check at least one friend.</p>
		{:else if freeByDay.length === 0}
			<p class="friends__hint">No common free time between 7 AM and 7 PM.</p>
		{:else}
			<ul class="friends__times">
				{#each freeByDay as [day, times] (day)}
					<li><strong>{DAYS[day]}</strong> {times.join(', ')}</li>
				{/each}
			</ul>
		{/if}

		{#if shared.length > 0}
			<h3 class="friends__heading">Same class</h3>
			<ul class="friends__times">
				{#each shared as s (s.courseCode + s.section + s.type)}
					<li><strong>{s.courseCode} {s.type} {s.section}</strong> {s.names.join(', ')}</li>
				{/each}
			</ul>
		{/if}
	{/if}
</details>

<style>
	.friends {
		margin: 0 0 0.75rem;
		padding: 0.5rem 0.625rem;
		border: 1px solid var(--theme-border, hsl(0, 0%, 85%));
		border-radius: 0.5rem;
		font-size: 0.8125rem;
		min-width: 0;
	}

	.friends__summary {
		cursor: pointer;
		font-weight: 700;
		color: var(--theme-accent-text, hsl(5, 53%, 30%));
	}

	.friends__hint {
		margin: 0.375rem 0;
		line-height: 1.45;
		color: var(--theme-text-2, hsl(0, 0%, 38%));
	}

	.friends__row {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.friends__row label {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.friends input:not([type='checkbox']) {
		min-height: 2.75rem;
		padding: 0 0.5rem;
		border: 1px solid var(--theme-border, hsl(0, 0%, 85%));
		border-radius: 0.375rem;
		font: inherit;
		font-size: 1rem;
	}

	.friends__go {
		min-height: 2.75rem;
		padding: 0 0.875rem;
		border: 1px solid hsl(5, 53%, 62%);
		border-radius: 999px;
		background: var(--theme-accent-soft, hsl(5, 53%, 97%));
		color: var(--theme-accent-text, hsl(5, 53%, 30%));
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	.friends__go:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.friends__list,
	.friends__times {
		margin: 0 0 0.5rem;
		padding: 0;
		list-style: none;
	}

	.friends__list li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.friends__check {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 2.75rem;
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.friends__remove {
		min-height: 2.75rem;
		padding: 0 0.5rem;
		border: none;
		background: none;
		color: var(--theme-text-2, hsl(0, 0%, 38%));
		font: inherit;
		cursor: pointer;
	}

	.friends__heading {
		margin: 0.75rem 0 0.25rem;
		font-size: 0.8125rem;
		font-weight: 700;
	}

	.friends__times li {
		padding: 0.125rem 0;
		line-height: 1.45;
	}
</style>
