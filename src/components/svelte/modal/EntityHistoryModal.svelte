<script lang="ts">
  import LoadingIndicator from "@ui/LoadingIndicator.svelte";
  import type { PublicHistoryEntry } from "@lib/editor/entity-attribution";
  import {
    formatHistoryTime,
    presentHistoryChanges,
  } from "@lib/editor/history-presentation";
  import { modalStore } from "@lib/store.svelte";

  const ref = $derived(modalStore.historyEntity);

  let entries = $state<PublicHistoryEntry[]>([]);
  let nextOffset = $state<number | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);
  // Bumped whenever the entity changes, so a slow response for the previous
  // one can't land on top of this one's history.
  let generation = 0;

  async function load(offset: number) {
    if (!ref) return;
    const requested = generation;
    loading = true;
    error = null;
    try {
      const params = new URLSearchParams({
        entityType: ref.entityType,
        entityId: String(ref.entityId),
        offset: String(offset),
      });
      const res = await fetch(`/api/entity-history?${params.toString()}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as {
        entries: PublicHistoryEntry[];
        nextOffset: number | null;
      };
      if (requested !== generation) return;
      entries = offset === 0 ? data.entries : [...entries, ...data.entries];
      nextOffset = data.nextOffset;
    } catch {
      if (requested !== generation) return;
      error = "Could not load the edit history. Check your connection and try again.";
    } finally {
      if (requested === generation) loading = false;
    }
  }

  $effect(() => {
    if (!ref) return;
    generation += 1;
    entries = [];
    nextOffset = null;
    void load(0);
  });

  function actionLabel(action: string) {
    if (action === "create") return "Added";
    if (action === "revert") return "Restored an earlier version";
    if (action === "merge" || action === "merged_into") return "Merged";
    return "Edited";
  }
</script>

<section class="entity-history-public" aria-labelledby="entity-history-title">
  <header class="entity-history-public__header">
    <h2 id="entity-history-title">Edit history</h2>
    {#if ref?.name}
      <p class="entity-history-public__subject">{ref.name}</p>
    {/if}
  </header>
  <p class="entity-history-public__note">
    Changes to what this card shows, newest first. Contact details are not
    listed here.
  </p>

  {#if error}
    <p class="entity-history-public__error" role="alert">{error}</p>
    <button
      type="button"
      class="entity-history-public__more"
      onclick={() => load(0)}
    >
      Try again
    </button>
  {:else if loading && entries.length === 0}
    <LoadingIndicator label="Loading edit history" />
  {:else if entries.length === 0 && nextOffset === null}
    <p class="entity-history-public__note">No recorded edits yet.</p>
  {/if}

  {#if entries.length > 0}
    <ol class="entity-history-public__list">
      {#each entries as entry (entry.id)}
        <li class="entity-history-public__entry">
          <p class="entity-history-public__meta">
            <strong>{actionLabel(entry.action)}</strong>
            {#if entry.by}by {entry.by}{/if}
            <time datetime={entry.createdAt}>{formatHistoryTime(entry.createdAt)}</time>
          </p>
          <dl class="entity-history-public__changes">
            {#each presentHistoryChanges(entry.changes, entry.action) as change (change.field)}
              <dt>{change.label}</dt>
              <dd>
                {#if change.kind === "note"}
                  {change.text}
                {:else if change.kind === "words"}
                  <span class="entity-history-public__passage"
                    >{#each change.parts as part, i (i)}{#if part.op === "del"}<del
                          ><span class="visually-hidden">removed: </span>{part.text}</del
                        >{:else if part.op === "ins"}<ins
                          class="entity-history-public__added"
                          ><span class="visually-hidden">added: </span>{part.text}</ins
                        >{:else}{part.text}{/if}{/each}</span
                  >
                {:else}
                  {#if entry.action !== "create"}
                    {#if change.before === null}
                      <span class="entity-history-public__none">(empty)</span>
                    {:else}
                      <del>{change.before}</del>
                    {/if}
                    <span class="visually-hidden">changed to</span>
                    <span aria-hidden="true">→</span>
                  {/if}
                  {#if change.after === null}
                    <span class="entity-history-public__none">(empty)</span>
                  {:else}
                    <ins>{change.after}</ins>
                  {/if}
                {/if}
              </dd>
            {/each}
          </dl>
        </li>
      {/each}
    </ol>
  {/if}
  {#if nextOffset !== null && !error}
    <button
      type="button"
      class="entity-history-public__more"
      disabled={loading}
      onclick={() => load(nextOffset ?? 0)}
    >
      {loading ? "Loading" : "Show older edits"}
    </button>
  {/if}
</section>

<style>
  .entity-history-public {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 0.25rem 0.25rem 0.75rem;
  }

  /* Stays put while the list scrolls; the right padding keeps the title
     clear of the dialog's close button. The negative top margin covers the
     scroll container's own padding so text never peeks above it. z-index 0
     keeps it over the list but under the close button (z-index 1). */
  .entity-history-public__header {
    position: sticky;
    top: -0.5rem;
    z-index: 0;
    margin: -0.5rem -0.25rem 0;
    padding: 0.5rem 3rem 0.5rem 0.25rem;
    background: #fff;
    border-bottom: 1px solid hsl(0 0% 92%);
  }

  h2 {
    margin: 0;
    font-size: 1.15rem;
  }

  .entity-history-public__subject {
    margin: 0.1rem 0 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: hsl(5, 53%, 32%);
    overflow-wrap: anywhere;
  }

  .entity-history-public__none {
    color: var(--text-muted, #64748b);
    font-style: italic;
  }

  .entity-history-public__added {
    background: hsl(140 60% 92%);
    border-radius: 0.2rem;
  }

  .entity-history-public__passage del {
    margin-right: 0.25em;
  }

  .entity-history-public__note,
  .entity-history-public__error {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-muted, #64748b);
  }

  .entity-history-public__error {
    color: hsl(0, 65%, 40%);
  }

  .entity-history-public__list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .entity-history-public__entry {
    border-top: 1px solid hsl(0 0% 88%);
    padding-top: 0.6rem;
  }

  .entity-history-public__meta {
    margin: 0 0 0.35rem;
    font-size: 0.85rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .entity-history-public__meta time {
    color: var(--text-muted, #64748b);
  }

  .entity-history-public__changes {
    margin: 0;
    font-size: 0.85rem;
    display: grid;
    grid-template-columns: minmax(0, auto) minmax(0, 1fr);
    gap: 0.2rem 0.6rem;
  }

  dt {
    font-weight: 600;
  }

  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }

  del {
    color: var(--text-muted, #64748b);
  }

  ins {
    text-decoration: none;
  }

  .entity-history-public__more {
    align-self: flex-start;
    box-sizing: border-box;
    min-height: 2.75rem;
    padding: 0.5rem 1rem;
    border: 1px solid hsl(5, 28%, 78%);
    border-radius: 0.625rem;
    background: #fff;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    color: hsl(5, 53%, 32%);
    cursor: pointer;
  }

  .entity-history-public__more:disabled {
    cursor: progress;
    opacity: 0.7;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
