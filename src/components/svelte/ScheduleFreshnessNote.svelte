<script lang="ts">
  import {
    classesScheduleFreshnessMessage,
    isClassesScheduleStale,
  } from "@lib/amis/term-schedule-freshness";

  type Props = {
    importedAt?: string | null;
  };

  const { importedAt = null }: Props = $props();

  const message = $derived(classesScheduleFreshnessMessage(importedAt));
  const stale = $derived(isClassesScheduleStale(importedAt));
</script>

{#if message}
  <p class="schedule-freshness" class:schedule-freshness--stale={stale}>
    {message}
    {#if stale}
      <a class="schedule-freshness__link" href="/?contribute=1">Report an issue</a>
    {/if}
  </p>
{/if}

<style>
  .schedule-freshness {
    margin: 0.35rem 0 0;
    font-size: 0.75rem;
    line-height: 1.35;
    color: hsl(0 0% 45%);
  }

  .schedule-freshness--stale {
    color: hsl(25 70% 32%);
  }

  .schedule-freshness__link {
    margin-left: 0.35rem;
    color: inherit;
    text-decoration: underline;
  }
</style>
