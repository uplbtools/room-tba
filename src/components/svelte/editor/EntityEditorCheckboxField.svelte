<script lang="ts">
  import { fieldSaveActionLabel } from "@lib/editor/field-action-label";
  import "./entity-editor.css";

  type Props = {
    label: string;
    inputId: string;
    canPublish: boolean;
    checked?: boolean;
    disabled?: boolean;
    fieldSaving?: boolean;
    unchanged?: boolean;
    onsave: () => void;
  };

  let {
    label,
    inputId,
    canPublish,
    checked = $bindable(false),
    disabled = false,
    fieldSaving = false,
    unchanged = false,
    onsave,
  }: Props = $props();

  const saveLabel = $derived(
    fieldSaveActionLabel({ canPublish, isSaving: fieldSaving }),
  );
</script>

<div class="editor-field checkbox-field">
  <label class="checkbox-label" for={inputId}>
    <input id={inputId} type="checkbox" bind:checked {disabled} />
    {label}
  </label>
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
