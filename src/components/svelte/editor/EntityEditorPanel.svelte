<script lang="ts">
  import type { Snippet } from "svelte";
  import SubmitterNameField from "@ui/SubmitterNameField.svelte";
  import EntityEditorMessage from "./EntityEditorMessage.svelte";
  import { proposalStatusMessage } from "@lib/editor/field-action-label";
  import "./entity-editor.css";

  type Props = {
    canPublish: boolean;
    showSubmitterName?: boolean;
    submitterNameId: string;
    submitterName?: string;
    proposalStatus?: string | null;
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
    successMessage = null,
    errorMessage = null,
    children,
  }: Props = $props();
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

  {@render children?.()}

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
