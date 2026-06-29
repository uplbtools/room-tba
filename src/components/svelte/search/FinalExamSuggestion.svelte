<script lang="ts">
  import { queryStore, termStore } from "@lib/store.svelte";
  import { fetchFinalExams, looksLikeCourseCode } from "@lib/final-exams";
  import { normalizeCourseCode } from "@lib/final-exams/normalize";

  interface Props {
    onSelect: () => void;
  }

  const { onSelect }: Props = $props();

  let matchCount = $state<number | null>(null);
  let checking = $state(false);

  $effect(() => {
    const trimmed = queryStore.inputValue.trim();
    const termId = termStore.activeTermId;
    const code = normalizeCourseCode(trimmed);

    if (!code || termId == null || !looksLikeCourseCode(code)) {
      matchCount = null;
      checking = false;
      return;
    }

    let cancelled = false;
    checking = true;
    void fetchFinalExams({ courseCode: code, termId }).then((rows) => {
      if (cancelled) return;
      matchCount = rows.length;
      checking = false;
    });

    return () => {
      cancelled = true;
    };
  });

  function openFinalExams() {
    queryStore.updateQuery({
      category: "class",
      type: "result",
      value: queryStore.inputValue.trim(),
    });
    onSelect();
  }
</script>

{#if looksLikeCourseCode(queryStore.inputValue) && (checking || (matchCount ?? 0) > 0)}
  <button type="button" class="final-exam-suggestion" onclick={openFinalExams}>
    <div>
      {#if checking}
        Checking final exams for <strong>{queryStore.inputValue}</strong>…
      {:else}
        View final exam for <strong>{queryStore.inputValue}</strong>
        {#if matchCount && matchCount > 1}
          ({matchCount} sections)
        {/if}
      {/if}
    </div>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      ><line x1="7" y1="17" x2="17" y2="7"></line><polyline
        points="7 7 17 7 17 17"
      ></polyline></svg
    >
  </button>
{/if}

<style>
  .final-exam-suggestion {
    all: unset;
    padding: 0.5rem 0.75rem;
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .final-exam-suggestion:hover {
    background-color: hsl(0, 0%, 95%);
    border-radius: 0.75rem;
  }

  .final-exam-suggestion strong {
    color: hsl(5, 53%, 32%);
  }
</style>
