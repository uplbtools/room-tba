<script lang="ts">
  import BottomSheet from "@ui/BottomSheet.svelte";

  let {
    open = true,
    onDismiss,
    peekFitTo,
  }: {
    open?: boolean;
    onDismiss?: () => void;
    peekFitTo?: string;
  } = $props();
</script>

<BottomSheet {open} {onDismiss} {peekFitTo}>
  <p>Sheet content</p>
  <div class="entity-actions">Actions</div>
</BottomSheet>
