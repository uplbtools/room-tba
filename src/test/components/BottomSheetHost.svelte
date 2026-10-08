<script lang="ts">
  import BottomSheet from "@ui/BottomSheet.svelte";

  let {
    open = true,
    onDismiss,
    peekFitTo,
    halfRatio,
  }: {
    open?: boolean;
    onDismiss?: () => void;
    peekFitTo?: string;
    halfRatio?: number;
  } = $props();
</script>

<BottomSheet {open} {onDismiss} {peekFitTo} {halfRatio}>
  <p>Sheet content</p>
  <div class="entity-actions">Actions</div>
</BottomSheet>
