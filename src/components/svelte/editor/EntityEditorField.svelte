<script lang="ts">
  import type { Snippet } from "svelte";
  import { fieldSaveActionLabel } from "@lib/editor/field-action-label";
  import "./entity-editor.css";

  type Props = {
    label: string;
    inputId: string;
    canPublish: boolean;
    disabled?: boolean;
    fieldSaving?: boolean;
    unchanged?: boolean;
    stacked?: boolean;
    onsave: () => void;
    control: Snippet;
  };

  let {
    label,
    inputId,
    canPublish,
    disabled = false,
    fieldSaving = false,
    unchanged = false,
    stacked = false,
    onsave,
    control,
  }: Props = $props();

  const saveLabel = $derived(
    fieldSaveActionLabel({ canPublish, isSaving: fieldSaving }),
  );
</script>

<div class="editor-field">
  <label for={inputId}>{label}</label>
  <div class="editor-control-row" class:stacked>
    {@render control()}
    {#if canPublish}
      <button
        type="button"
        class="field-save-btn"
        disabled={disabled || unchanged}
        onclick={onsave}
      >
        {saveLabel}
      </button>
    {/if}
  </div>
</div>
