<script lang="ts">
  import {
    adminAuthStore,
    proposalsStore,
    toastStore,
  } from "@lib/store.svelte";
  import { buildFieldDiffs } from "@lib/proposals/diff";
  import { afterProposalPublished } from "@lib/proposals/apply-published-entity";
  import { syncOpenEntityQueryAfterPublish } from "@lib/proposals/sync-open-entity-query";
  import { getAppActions, getAppData } from "@lib/context";
  import type { ProposalEntityType } from "@lib/services/proposal-service";
  import { parseBundledRooms } from "@lib/proposals/create-proposal-validation";
  import EntityEditorFormField from "@ui/editor/EntityEditorFormField.svelte";
  import EntityReviewActions from "@ui/editor/EntityReviewActions.svelte";

  const appActions = getAppActions();
  const appData = getAppData();

  function bundledRoomsSummary(
    entityType: ProposalEntityType,
    patch: Record<string, unknown>,
  ): string | null {
    if (entityType !== "create_building") return null;
    const rooms = parseBundledRooms(patch);
    if (rooms.length === 0) return null;
    return `Will create building + ${rooms.length} room${rooms.length === 1 ? "" : "s"}: ${rooms.map((r) => r.roomCode).join(", ")}`;
  }

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
      if (action === "approve") {
        const published = (data as { published?: unknown }).published;
        const entityType = (data as { proposal?: { entityType?: string } })
          .proposal?.entityType;
        if (entityType) {
          afterProposalPublished(
            appActions,
            appData,
            entityType as ProposalEntityType,
            published,
          );
          syncOpenEntityQueryAfterPublish(
            appData,
            entityType as ProposalEntityType,
            published,
          );
        }
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
  <section class="entity-review-panel" aria-label="Edit proposals review queue">
    <div class="entity-review-heading">
      <strong>Suggested edits</strong>
      {#if proposalsStore.pendingCount > 0}
        <span class="entity-review-count"
          >{proposalsStore.pendingCount} pending</span
        >
      {/if}
    </div>

    {#if proposalsStore.loading}
      <p class="entity-review-empty" aria-live="polite">Loading proposals…</p>
    {:else if proposalsStore.proposals.length === 0}
      <p class="entity-review-empty">No pending suggestions.</p>
    {:else}
      <ul class="entity-review-list">
        {#each proposalsStore.proposals as proposal (proposal.id)}
          <li class="entity-review-item">
            <div class="entity-review-meta">
              <span class="entity-review-entity">
                {proposal.entityLabel}
                <small>({proposal.entityType})</small>
              </span>
              <span class="entity-review-submitter"
                >{proposal.submitterName}</span
              >
            </div>
            {#if proposal.currentVersion != null && proposal.currentVersion !== proposal.baseVersion}
              <p class="entity-review-stale" role="alert">
                Published data changed since this was submitted. Compare
                carefully — approving may conflict.
              </p>
            {/if}
            <ul class="entity-review-changes">
              {#each buildFieldDiffs(proposal.currentValues ?? null, proposal.proposedPatch) as diff (diff.field)}
                <li class="entity-review-diff">
                  <span class="entity-review-diff-label">{diff.label}</span>
                  <span class="entity-review-diff-values">
                    <span
                      class="entity-review-diff-old"
                      class:entity-review-diff-before={diff.before != null}
                      >{proposal.currentValues == null &&
                      proposal.entityType.startsWith("create_")
                        ? "New entry"
                        : (diff.before ?? "—")}</span
                    >
                    <span aria-hidden="true">→</span>
                    <span class="entity-review-diff-after"
                      >{diff.after ?? "—"}</span
                    >
                  </span>
                </li>
              {/each}
            </ul>
            {#if bundledRoomsSummary(proposal.entityType as ProposalEntityType, proposal.proposedPatch as Record<string, unknown>)}
              <p class="entity-review-bundled">
                {bundledRoomsSummary(
                  proposal.entityType as ProposalEntityType,
                  proposal.proposedPatch as Record<string, unknown>,
                )}
              </p>
            {/if}
            {#if proposal.status === "needs_changes" && proposal.adminNote}
              <p class="entity-review-note">
                Previous note: {proposal.adminNote}
              </p>
            {/if}
            <EntityEditorFormField
              label="Note to contributor"
              inputId="proposal-note-{proposal.id}"
            >
              {#snippet control()}
                <textarea
                  id="proposal-note-{proposal.id}"
                  rows="2"
                  bind:value={noteById[proposal.id]}
                  placeholder="Optional for reject; required to request changes."
                ></textarea>
              {/snippet}
            </EntityEditorFormField>
            <EntityReviewActions
              disabled={actingId === proposal.id}
              onapprove={() => runAction(proposal.id, "approve")}
              onrequestChanges={() => runAction(proposal.id, "request-changes")}
              onreject={() => runAction(proposal.id, "reject")}
            />
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/if}

<style>
  @import "./editor/review-panel.css";
  @import "./editor/entity-editor.css";

  .entity-review-bundled {
    margin: 0.35rem 0 0;
    font-size: 0.85rem;
    font-weight: 600;
    line-height: 1.35;
  }

  .entity-review-stale {
    margin: 0.35rem 0;
    padding: 0.35rem 0.5rem;
    border-radius: 6px;
    background: hsl(40 90% 92%);
    border: 1px solid hsl(40 70% 70%);
    color: hsl(30 60% 25%);
    font-size: 0.8rem;
    line-height: 1.35;
  }

  .entity-review-diff {
    display: flex;
    flex-wrap: wrap;
    gap: 0.15rem 0.5rem;
    font-size: 0.85rem;
    line-height: 1.4;
  }

  .entity-review-diff-label {
    font-weight: 600;
  }

  .entity-review-diff-values {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    min-width: 0;
  }

  .entity-review-diff-old {
    color: hsl(0 0% 45%);
    overflow-wrap: anywhere;
  }

  .entity-review-diff-before {
    text-decoration: line-through;
  }

  .entity-review-diff-after {
    font-weight: 600;
    overflow-wrap: anywhere;
  }
</style>
