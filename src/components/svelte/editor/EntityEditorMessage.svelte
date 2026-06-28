<script lang="ts">
  import "./entity-editor.css";

  type Props = {
    variant: "success" | "error" | "pending";
    message: string;
  };

  let { variant, message }: Props = $props();
</script>

<p class="editor-message {variant}">{message}</p>
