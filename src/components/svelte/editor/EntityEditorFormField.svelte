<script lang="ts">
  import type { Snippet } from "svelte";
  import "./entity-editor.css";

  type Props = {
    label: string;
    inputId: string;
    control: Snippet;
  };

  let { label, inputId, control }: Props = $props();
</script>

<div class="editor-field">
  <label for={inputId}>{label}</label>
  {@render control()}
</div>
