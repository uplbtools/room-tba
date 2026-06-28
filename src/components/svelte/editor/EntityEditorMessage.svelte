<script lang="ts">
  import "./entity-editor.css";

  type Props = {
    variant: "success" | "error" | "pending";
    message: string;
    id?: string;
  };

  let { variant, message, id }: Props = $props();
</script>

<p
  {id}
  class="editor-message {variant}"
  role={variant === "error" ? "alert" : "status"}
>
  {message}
</p>
