<script lang="ts">
  import type { Snippet } from "svelte";
  import "./entity-editor.css";

  type Props = {
    label: string;
    inputId: string;
    hint?: string;
    control: Snippet;
  };

  let { label, inputId, hint, control }: Props = $props();
</script>

<div class="editor-field">
  <label for={inputId}>{label}</label>
  {#if hint}
    <p class="field-hint" id="{inputId}-hint">{hint}</p>
  {/if}
  {@render control()}
</div>
