<script lang="ts">
  import "./entity-editor.css";

  type Props = {
    label: string;
    savingLabel?: string;
    saving?: boolean;
    disabled?: boolean;
    variant?: "primary" | "secondary" | "danger";
    type?: "submit" | "button";
    onclick?: () => void;
  };

  let {
    label,
    savingLabel,
    saving = false,
    disabled = false,
    variant = "primary",
    type = "button",
    onclick,
  }: Props = $props();

  const text = $derived(saving && savingLabel ? savingLabel : label);
</script>

<button
  class="entity-editor-submit"
  class:entity-editor-submit--primary={variant === "primary"}
  class:entity-editor-submit--secondary={variant === "secondary"}
  class:entity-editor-submit--danger={variant === "danger"}
  {type}
  disabled={disabled || saving}
  {onclick}
>
  {text}
</button>
