<script lang="ts">
	import LoadingIndicator from '#lib/components/LoadingIndicator.svelte';
	import { getPublicHistory } from '#lib/functions/history.remote.js';
	import { getModalStore } from '#lib/utils/context.js';
	import {
		formatHistoryTime,
		presentHistoryChanges
	} from '#lib/utils/editor/history-presentation.js';

	const ref = getModalStore().getDataRecord() as {
		entityType: string;
		entityId: number;
		name?: string;
	};

	let offsets = $state([0]);

	const ACTION_LABELS: Record<string, string> = {
		create: 'Added',
		revert: 'Restored an earlier version',
		merge: 'Merged',
		merged_into: 'Merged'
	};
</script>

<section class="flex max-h-full min-h-0 flex-col gap-3 p-5" aria-labelledby="entity-history-title">
	<header>
		<h2 id="entity-history-title" class="text-xl font-semibold">Edit history</h2>
		{#if ref.name}<p class="text-sm text-neutral-600">{ref.name}</p>{/if}
	</header>
	<div class="flex min-h-0 flex-col gap-3 overflow-y-auto text-sm">
		<p class="text-neutral-600">
			These are changes to what this card shows, newest first. Contact details aren't listed here.
		</p>
		{#each offsets as offset (offset)}
			<svelte:boundary>
				{#snippet pending()}
					<LoadingIndicator label="Loading edit history" />
				{/snippet}
				{#snippet failed(_, reset)}
					<p role="alert" class="text-red-900">
						Couldn't load the edit history. Check your connection and try again.
					</p>
					<button type="button" class="self-start font-semibold underline" onclick={reset}>
						Try again
					</button>
				{/snippet}
				{@const page = await getPublicHistory({
					entityType: ref.entityType,
					entityId: ref.entityId,
					offset
				})}
				{#if offset === 0 && page.entries.length === 0 && page.nextOffset === null}
					<p class="text-neutral-600">There are no recorded edits yet.</p>
				{/if}
				<ol class="flex flex-col gap-3">
					{#each page.entries as entry (entry.id)}
						<li class="border-t border-neutral-200 pt-2">
							<p class="mb-1 flex flex-wrap gap-x-1.5">
								<strong>{ACTION_LABELS[entry.action] ?? 'Edited'}</strong>
								{#if entry.by}by {entry.by}{/if}
								<time datetime={entry.createdAt} class="text-neutral-600">
									{formatHistoryTime(entry.createdAt)}
								</time>
							</p>
							<dl class="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-3 gap-y-1">
								{#each presentHistoryChanges(entry.changes, entry.action) as change (change.field)}
									<dt class="font-semibold">{change.label}</dt>
									<dd class="[overflow-wrap:anywhere]">
										{#if change.kind === 'note'}
											{change.text}
										{:else if change.kind === 'words'}
											{#each change.parts as part, i (i)}{#if part.op === 'del'}<del
														class="mr-1 text-neutral-600"
														><span class="sr-only">removed: </span>{part.text}</del
													>{:else if part.op === 'ins'}<ins
														class="rounded-xs bg-green-100 no-underline"
														><span class="sr-only">added: </span>{part.text}</ins
													>{:else}{part.text}{/if}{/each}
										{:else}
											{#if entry.action !== 'create'}
												{#if change.before === null}
													<span class="text-neutral-600 italic">(empty)</span>
												{:else}
													<del class="text-neutral-600">{change.before}</del>
												{/if}
												<span class="sr-only">changed to</span>
												<span aria-hidden="true">→</span>
											{/if}
											{#if change.after === null}
												<span class="text-neutral-600 italic">(empty)</span>
											{:else}
												<ins class="no-underline">{change.after}</ins>
											{/if}
										{/if}
									</dd>
								{/each}
							</dl>
						</li>
					{/each}
				</ol>
				{#if page.nextOffset !== null && offset === offsets.at(-1)}
					<button
						type="button"
						class="min-h-11 self-start rounded-lg border border-neutral-300 px-4 text-sm font-semibold"
						onclick={() => offsets.push(page.nextOffset!)}
					>
						Show older edits
					</button>
				{/if}
			</svelte:boundary>
		{/each}
	</div>
</section>
