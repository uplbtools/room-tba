<script lang="ts">
  import "./entity-editor.css";

  type Props = {
    label: string;
    pickLabel?: string;
    disabled?: boolean;
    onclick: () => void;
  };

  let {
    label,
    pickLabel = "Pick on map",
    disabled = false,
    onclick,
  }: Props = $props();
</script>

<div class="entity-editor-pin-row">
  <span class="entity-editor-pin-label">{label}</span>
  <button type="button" class="field-save-btn" {disabled} {onclick}>
    {pickLabel}
  </button>
</div>
