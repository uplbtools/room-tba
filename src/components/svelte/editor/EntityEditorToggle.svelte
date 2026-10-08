<script lang="ts">
  import { editorToggleLabel } from "@lib/editor/field-action-label";
  import { trackOverlay } from "@lib/track-overlay.svelte";
  import "./entity-editor.css";

  type Props = {
    expanded: boolean;
    canPublish: boolean;
    publishOpenLabel: string;
    closeLabel?: string;
    suggestOpenLabel?: string;
    variant?: "panel" | "toolbar";
    onclick: () => void;
  };

  let {
    expanded,
    canPublish,
    publishOpenLabel,
    closeLabel,
    suggestOpenLabel,
    variant = "panel",
    onclick,
  }: Props = $props();

  // The open editor/suggest form is a layer: Back closes it (via the same
  // toggle) before it leaves the place.
  trackOverlay("suggest-edit", () => expanded, () => {
    if (expanded) onclick();
  });

  const label = $derived(
    editorToggleLabel({
      expanded,
      canPublish,
      publishOpenLabel,
      closeLabel,
      suggestOpenLabel,
    }),
  );
</script>

<button
  type="button"
  class="editor-toggle"
  class:editor-toggle--toolbar={variant === "toolbar"}
  aria-expanded={expanded}
  {onclick}
>
  {label}
</button>
