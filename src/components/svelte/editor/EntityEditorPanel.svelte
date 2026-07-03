<script lang="ts">
  import type { Snippet } from "svelte";
  import SubmitterNameField from "@ui/SubmitterNameField.svelte";
  import EntityEditorMessage from "./EntityEditorMessage.svelte";
  import EntityEditorSubmitButton from "./EntityEditorSubmitButton.svelte";
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
    proposalStatus?: string | null;
    activeProposalId?: number | null;
    onWithdrawn?: () => void;
    successMessage?: string | null;
    errorMessage?: string | null;
    children?: Snippet;
  };

  let {
    canPublish,
    showSubmitterName = false,
    submitterNameId,
    submitterName = $bindable(""),
    proposalStatus = null,
    activeProposalId = null,
    onWithdrawn,
    successMessage = null,
    errorMessage = null,
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

  {#if withdrawError}
    <EntityEditorMessage variant="error" message={withdrawError} />
  {/if}

  {#if successMessage}
    <EntityEditorMessage variant="success" message={successMessage} />
  {/if}

  {#if errorMessage}
    <EntityEditorMessage variant="error" message={errorMessage} />
  {/if}
</div>

<style>
  .entity-editor-panel {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
</style>
