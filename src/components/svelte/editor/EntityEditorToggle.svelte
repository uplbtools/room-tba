<script lang="ts">
  import { editorToggleLabel } from "../../../lib/editor/field-action-label";
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
