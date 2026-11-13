<script lang="ts">
  import BottomSheet from "@ui/BottomSheet.svelte";

  let {
    open = true,
    onDismiss,
    peekFitTo,
    halfRatio,
    fullScreen,
  }: {
    open?: boolean;
    onDismiss?: () => void;
    peekFitTo?: string;
    halfRatio?: number;
    fullScreen?: boolean;
  } = $props();
</script>

<BottomSheet {open} {onDismiss} {peekFitTo} {halfRatio} {fullScreen}>
  <p>Sheet content</p>
  <div class="entity-actions">Actions</div>
</BottomSheet>
