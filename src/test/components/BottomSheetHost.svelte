<script lang="ts">
  import BottomSheet from "@ui/BottomSheet.svelte";

  let {
    open = true,
    onDismiss,
    peekFitTo,
    fullScreen,
  }: {
    open?: boolean;
    onDismiss?: () => void;
    peekFitTo?: string;
    fullScreen?: boolean;
  } = $props();
</script>

<BottomSheet {open} {onDismiss} {peekFitTo} {fullScreen}>
  <p>Sheet content</p>
  <div class="entity-actions">Actions</div>
</BottomSheet>
