<script lang="ts">
  import LoadingIndicator from "@ui/LoadingIndicator.svelte";
  import type { PublicHistoryEntry } from "@lib/editor/entity-attribution";
  import { modalStore } from "@lib/store.svelte";

  const ref = $derived(modalStore.historyEntity);

  let entries = $state<PublicHistoryEntry[]>([]);
  let nextOffset = $state<number | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);

  async function load(offset: number) {
    if (!ref) return;
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
      entries = offset === 0 ? data.entries : [...entries, ...data.entries];
      nextOffset = data.nextOffset;
    } catch {
      error = "Could not load the edit history. Check your connection and try again.";
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (!ref) return;
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

  function formatWhen(iso: string) {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }
</script>

<section class="entity-history-public" aria-labelledby="entity-history-title">
  <h2 id="entity-history-title">Edit history</h2>
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
  {:else if entries.length === 0}
    <p class="entity-history-public__note">No recorded edits yet.</p>
  {/if}

  {#if entries.length > 0}
    <ol class="entity-history-public__list">
      {#each entries as entry (entry.id)}
        <li class="entity-history-public__entry">
          <p class="entity-history-public__meta">
            <strong>{actionLabel(entry.action)}</strong>
            {#if entry.by}by {entry.by}{/if}
            <time datetime={entry.createdAt}>{formatWhen(entry.createdAt)}</time>
          </p>
          <dl class="entity-history-public__changes">
            {#each entry.changes as change (change.field)}
              <dt>{change.label}</dt>
              <dd>
                {#if entry.action !== "create"}
                  <del>{change.before ?? "(empty)"}</del>
                  <span class="visually-hidden">changed to</span>
                  <span aria-hidden="true">→</span>
                {/if}
                <ins>{change.after ?? "(empty)"}</ins>
              </dd>
            {/each}
          </dl>
        </li>
      {/each}
    </ol>
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
  {/if}
</section>

<style>
  .entity-history-public {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 0.25rem 0.25rem 0.75rem;
  }

  h2 {
    margin: 0;
    font-size: 1.15rem;
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
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    color: hsl(5, 53%, 32%);
    cursor: pointer;
    text-decoration: underline;
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
