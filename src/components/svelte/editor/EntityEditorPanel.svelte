<script lang="ts">
  import type { Snippet } from "svelte";
  import SubmitterNameField from "@ui/SubmitterNameField.svelte";
  import { MAX_SUBMITTER_NOTE_LENGTH } from "@constants/proposals";
  import EntityEditorFormField from "./EntityEditorFormField.svelte";
  import EntityEditorMessage from "./EntityEditorMessage.svelte";
  import EntityEditorSubmitButton from "./EntityEditorSubmitButton.svelte";
  import EntityHistoryPanel from "./EntityHistoryPanel.svelte";
  import ProposalLicenseNote from "./ProposalLicenseNote.svelte";
  import {
    canShowWithdrawProposal,
    proposalStatusMessage,
  } from "@lib/editor/field-action-label";
  import { withdrawEntityProposal } from "@lib/proposals/client";
  import { toastStore } from "@lib/store.svelte";
  import "./entity-editor.css";

  type Props = {
    canPublish: boolean;
    showSubmitterName?: boolean;
    submitterNameId: string;
    submitterName?: string;
    /**
     * Opt in to the "Note to reviewer" box (#873). Callers must forward the
     * bound value to persistEntityChange, so it stays off until wired.
     */
    showSubmitterNote?: boolean;
    submitterNote?: string;
    proposalStatus?: string | null;
    activeProposalId?: number | null;
    onWithdrawn?: () => void;
    onsubmit?: () => void;
    submitting?: boolean;
    submitDisabled?: boolean;
    successMessage?: string | null;
    errorMessage?: string | null;
    /** Enables the version-history section for publishers. */
    historyEntity?: {
      entityType: string;
      entityId: number;
      version: number;
    } | null;
    children?: Snippet;
  };

  let {
    canPublish,
    showSubmitterName = false,
    submitterNameId,
    submitterName = $bindable(""),
    showSubmitterNote = false,
    submitterNote = $bindable(""),
    proposalStatus = null,
    activeProposalId = null,
    onWithdrawn,
    onsubmit,
    submitting = false,
    submitDisabled = false,
    successMessage = null,
    errorMessage = null,
    historyEntity = null,
    children,
  }: Props = $props();

  let withdrawing = $state(false);
  let withdrawError = $state<string | null>(null);

  async function withdrawSuggestion() {
    if (!activeProposalId || canPublish) return;
    withdrawError = null;
    withdrawing = true;
    try {
      const result = await withdrawEntityProposal({
        proposalId: activeProposalId,
        submitterName: submitterName.trim() || undefined,
      });
      if (!result.ok) {
        withdrawError = result.error ?? "Could not withdraw suggestion.";
        return;
      }
      toastStore.show("Suggestion withdrawn.", "success");
      onWithdrawn?.();
    } finally {
      withdrawing = false;
    }
  }
</script>

<div class="entity-editor-panel" class:contributor-form={!canPublish}>
  <div class="editor-heading">
    <span>{canPublish ? "Editor" : "Spot something off?"}</span>
  </div>

  {#if showSubmitterName}
    <SubmitterNameField id={submitterNameId} bind:value={submitterName} />
  {/if}

  {#if proposalStatus}
    <EntityEditorMessage
      variant="pending"
      message={proposalStatusMessage(proposalStatus)}
    />
  {/if}

  {#if !canPublish && activeProposalId && canShowWithdrawProposal(proposalStatus)}
    <div class="entity-editor-form-actions">
      <EntityEditorSubmitButton
        label="Withdraw suggestion"
        savingLabel="Withdrawing…"
        saving={withdrawing}
        variant="secondary"
        onclick={withdrawSuggestion}
      />
    </div>
  {/if}

  {@render children?.()}

  {#if !canPublish && showSubmitterNote}
    <EntityEditorFormField
      label="Note to reviewer (optional)"
      inputId="{submitterNameId}-note"
      hint="Goes to the editor who reviews this, and is never shown on the map. Use it for context, sources, or anything that is not part of the entry itself."
    >
      {#snippet control()}
        <textarea
          id="{submitterNameId}-note"
          rows="2"
          maxlength={MAX_SUBMITTER_NOTE_LENGTH}
          bind:value={submitterNote}
          aria-describedby="{submitterNameId}-note-hint"
        ></textarea>
      {/snippet}
    </EntityEditorFormField>
  {/if}

  {#if !canPublish && onsubmit}
    <div class="entity-editor-form-actions">
      <EntityEditorSubmitButton
        label="Submit suggestion"
        savingLabel="Submitting…"
        saving={submitting}
        disabled={submitDisabled}
        onclick={onsubmit}
      />
      <ProposalLicenseNote />
    </div>
  {/if}

  {#if withdrawError}
    <EntityEditorMessage variant="error" message={withdrawError} />
  {/if}

  {#if successMessage}
    <EntityEditorMessage variant="success" message={successMessage} />
  {/if}

  {#if errorMessage}
    <EntityEditorMessage variant="error" message={errorMessage} />
  {/if}

  {#if canPublish && historyEntity}
    <EntityHistoryPanel
      entityType={historyEntity.entityType}
      entityId={historyEntity.entityId}
      version={historyEntity.version}
    />
  {/if}
</div>

<style>
  .entity-editor-panel {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
</style>
