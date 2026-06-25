<script lang="ts">
  import {
    adminAuthStore,
    proposalsStore,
    toastStore,
  } from "../../lib/store.svelte";
  import { summarizeProposalPatch } from "../../lib/proposals/client";
  import type { ProposalEntityType } from "../../lib/services/proposal-service";

  let noteById = $state<Record<number, string>>({});
  let actingId = $state<number | null>(null);

  async function runAction(
    id: number,
    action: "approve" | "reject" | "request-changes",
  ) {
    actingId = id;
    try {
      const suffix = action === "request-changes" ? "request-changes" : action;
      const res = await fetch(`/api/admin/proposals/${id}/${suffix}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note: noteById[id] ?? "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastStore.show(
          (data as { error?: string }).error ??
            `Could not ${action} proposal #${id}.`,
          "error",
        );
        return;
      }
      toastStore.show(
        action === "approve"
          ? "Proposal approved and published."
          : action === "reject"
            ? "Proposal rejected."
            : "Sent back to contributor with notes.",
        "success",
      );
      noteById[id] = "";
      await proposalsStore.refresh();
    } finally {
      actingId = null;
    }
  }
</script>

{#if adminAuthStore.canReview}
  <section class="review-panel" aria-label="Edit proposals review queue">
    <div class="review-heading">
      <strong>Suggested edits</strong>
      {#if proposalsStore.pendingCount > 0}
        <span class="count">{proposalsStore.pendingCount} pending</span>
      {/if}
    </div>

    {#if proposalsStore.loading}
      <p class="review-empty">Loading proposals…</p>
    {:else if proposalsStore.proposals.length === 0}
      <p class="review-empty">No pending suggestions.</p>
    {:else}
      <ul class="review-list">
        {#each proposalsStore.proposals as proposal (proposal.id)}
          <li class="review-item">
            <div class="review-meta">
              <span class="review-entity">
                {proposal.entityLabel}
                <small>({proposal.entityType})</small>
              </span>
              <span class="review-submitter">{proposal.submitterName}</span>
            </div>
            <ul class="review-changes">
              {#each summarizeProposalPatch(proposal.proposedPatch, proposal.entityType as ProposalEntityType) as line}
                <li>{line}</li>
              {/each}
            </ul>
            {#if proposal.status === "needs_changes" && proposal.adminNote}
              <p class="review-note">Previous note: {proposal.adminNote}</p>
            {/if}
            <label class="review-note-field">
              <span>Note to contributor</span>
              <textarea
                rows="2"
                bind:value={noteById[proposal.id]}
                placeholder="Optional for reject; required to request changes."
              ></textarea>
            </label>
            <div class="review-actions">
              <button
                type="button"
                class="approve"
                disabled={actingId === proposal.id}
                onclick={() => runAction(proposal.id, "approve")}
              >
                Approve
              </button>
              <button
                type="button"
                disabled={actingId === proposal.id}
                onclick={() => runAction(proposal.id, "request-changes")}
              >
                Request changes
              </button>
              <button
                type="button"
                class="reject"
                disabled={actingId === proposal.id}
                onclick={() => runAction(proposal.id, "reject")}
              >
                Reject
              </button>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/if}

<style>
  .review-panel {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    border-top: 1px solid hsl(0, 0%, 92%);
    padding-top: 0.625rem;
  }

  .review-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.8125rem;
    color: hsl(5, 53%, 32%);
  }

  .count {
    color: hsl(0, 0%, 42%);
    font-size: 0.75rem;
    font-weight: 600;
  }

  .review-empty {
    margin: 0;
    color: hsl(0, 0%, 45%);
    font-size: 0.75rem;
  }

  .review-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    max-height: 16rem;
    overflow-y: auto;
  }

  .review-item {
    border: 1px solid hsl(0, 0%, 90%);
    border-radius: 0.625rem;
    padding: 0.5rem;
    background: hsl(0, 0%, 99%);
  }

  .review-meta {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }

  .review-entity {
    font-size: 0.8125rem;
    font-weight: 700;
    color: hsl(0, 0%, 18%);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .review-entity small {
    font-weight: 600;
    color: hsl(0, 0%, 45%);
  }

  .review-submitter {
    font-size: 0.75rem;
    color: hsl(0, 0%, 42%);
  }

  .review-changes {
    margin: 0.375rem 0 0;
    padding-left: 1rem;
    color: hsl(0, 0%, 28%);
    font-size: 0.75rem;
  }

  .review-note {
    margin: 0.375rem 0 0;
    font-size: 0.75rem;
    color: hsl(35, 80%, 28%);
  }

  .review-note-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 0.375rem;
    font-size: 0.6875rem;
    color: hsl(0, 0%, 40%);
  }

  .review-note-field textarea {
    font: inherit;
    font-size: 0.75rem;
    border: 1px solid hsl(0, 0%, 85%);
    border-radius: 0.5rem;
    padding: 0.375rem 0.5rem;
    resize: vertical;
  }

  .review-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    margin-top: 0.5rem;
  }

  .review-actions button {
    border: 1px solid hsl(0, 0%, 85%);
    border-radius: 0.5rem;
    background: white;
    color: hsl(0, 0%, 22%);
    cursor: pointer;
    font: inherit;
    font-size: 0.6875rem;
    font-weight: 700;
    padding: 0.35rem 0.5rem;
  }

  .review-actions button.approve {
    border-color: hsl(160, 84%, 34%);
    color: hsl(160, 84%, 22%);
  }

  .review-actions button.reject {
    border-color: hsl(0, 70%, 82%);
    color: hsl(0, 70%, 38%);
  }

  .review-actions button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
</style>
