<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";

  type Props = {
    rangeStart: number;
    rangeEnd: number;
    total: number;
    prevDisabled?: boolean;
    nextDisabled?: boolean;
    onPrevious: () => void;
    onNext: () => void;
    ariaLabel?: string;
  };

  let {
    rangeStart,
    rangeEnd,
    total,
    prevDisabled = false,
    nextDisabled = false,
    onPrevious,
    onNext,
    ariaLabel = "Pagination",
  }: Props = $props();
</script>

<footer class="entity-pagination" aria-label={ariaLabel}>
  <button
    type="button"
    class="entity-pagination__btn"
    disabled={prevDisabled}
    aria-label="Previous page"
    onclick={onPrevious}
  >
    <ChevronLeft size={16} aria-hidden="true" />
  </button>
  <span class="entity-pagination__label">
    {rangeStart}–{rangeEnd} of {total}
  </span>
  <button
    type="button"
    class="entity-pagination__btn"
    disabled={nextDisabled}
    aria-label="Next page"
    onclick={onNext}
  >
    <ChevronRight size={16} aria-hidden="true" />
  </button>
</footer>

<style>
  @import "./entity-detail.css";
</style>
