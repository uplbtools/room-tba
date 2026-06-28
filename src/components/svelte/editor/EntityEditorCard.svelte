<script lang="ts">
  import type { Snippet } from "svelte";
  import "./entity-editor.css";

  type Props = {
    title?: string;
    children?: Snippet;
  };

  let { title, children }: Props = $props();
</script>

<div class="entity-editor-card">
  {#if title}
    <strong>{title}</strong>
  {/if}
  {@render children?.()}
</div>
