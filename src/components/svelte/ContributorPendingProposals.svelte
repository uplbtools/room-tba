<script lang="ts">
  import {
    loadOpenPendingProposals,
    withdrawEntityProposal,
  } from "@lib/proposals/client";
  import type { PendingProposalRow } from "@lib/proposals/pending-proposals";
  import { formatProposalStatusLabel } from "@lib/proposals/pending-proposals";
  import { adminAuthStore, toastStore } from "@lib/store.svelte";
  import EntityEditorMessage from "@ui/editor/EntityEditorMessage.svelte";
  import EntityEditorSubmitButton from "@ui/editor/EntityEditorSubmitButton.svelte";
  import { onMount } from "svelte";

  let {
    submitterName = "",
    onChanged,
  }: {
    submitterName?: string;
    onChanged?: () => void;
  } = $props();

  let rows = $state<PendingProposalRow[]>([]);
  let loading = $state(true);
  let withdrawingId = $state<number | null>(null);
  let error = $state<string | null>(null);

  async function refresh() {
    loading = true;
    error = null;
    try {
      rows = await loadOpenPendingProposals({
        preferServer: adminAuthStore.isLoggedIn,
      });
    } catch {
      error = "Could not load your pending suggestions.";
      rows = [];
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    void refresh();
  });

  async function withdraw(row: PendingProposalRow) {
    withdrawingId = row.id;
    error = null;
    try {
      const name =
        adminAuthStore.displayName ||
        adminAuthStore.username ||
        submitterName.trim();
      const result = await withdrawEntityProposal({
        proposalId: row.id,
        submitterName: name || undefined,
      });
      if (!result.ok) {
        error = result.error ?? "Could not withdraw suggestion.";
        return;
      }
      toastStore.show("Suggestion withdrawn.", "success");
      await refresh();
      onChanged?.();
    } finally {
      withdrawingId = null;
    }
  }
</script>

{#if loading}
  <EntityEditorMessage variant="pending" message="Loading your suggestions…" />
{:else if rows.length > 0}
  <section class="pending-proposals" aria-label="Your pending suggestions">
    <h3 class="pending-proposals__title">Your pending suggestions</h3>
    <ul class="pending-proposals__list">
      {#each rows as row (row.id)}
        <li class="pending-proposals__item">
          <div class="pending-proposals__meta">
            <p class="pending-proposals__label">{row.entityLabel}</p>
            <p class="pending-proposals__status">
              {formatProposalStatusLabel(row.status)}
            </p>
            {#if row.status === "needs_changes" && row.adminNote}
              <p class="pending-proposals__note">{row.adminNote}</p>
            {/if}
          </div>
          <EntityEditorSubmitButton
            label="Withdraw"
            savingLabel="Withdrawing…"
            saving={withdrawingId === row.id}
            variant="secondary"
            onclick={() => withdraw(row)}
          />
        </li>
      {/each}
    </ul>
  </section>
{/if}

{#if error}
  <EntityEditorMessage variant="error" message={error} />
{/if}

<style>
  .pending-proposals {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .pending-proposals__title {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-muted, #64748b);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .pending-proposals__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .pending-proposals__item {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
    justify-content: space-between;
    padding: 0.5rem 0.6rem;
    border: 1px solid var(--border-subtle, #e2e8f0);
    border-radius: 0.5rem;
    background: color-mix(in srgb, var(--surface-muted, #f8fafc) 80%, transparent);
  }

  .pending-proposals__meta {
    min-width: 0;
    flex: 1;
  }

  .pending-proposals__label {
    margin: 0;
    font-size: 0.92rem;
    font-weight: 600;
    line-height: 1.3;
  }

  .pending-proposals__status {
    margin: 0.15rem 0 0;
    font-size: 0.8rem;
    color: var(--text-muted, #64748b);
    text-transform: capitalize;
  }

  .pending-proposals__note {
    margin: 0.35rem 0 0;
    font-size: 0.82rem;
    line-height: 1.35;
  }
</style>
