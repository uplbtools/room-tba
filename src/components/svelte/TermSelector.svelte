<script lang="ts">
  import { onMount } from "svelte";
  import GraduationCap from "@lucide/svelte/icons/graduation-cap";
  import { termStore } from "@lib/store.svelte";

  onMount(() => {
    termStore.init();
  });

  const active = $derived(termStore.activeTerm);

  function onChange(event: Event) {
    const value = Number((event.currentTarget as HTMLSelectElement).value);
    if (Number.isFinite(value)) termStore.setTerm(value);
  }
</script>

{#if termStore.terms.length > 0}
  <div class="term-selector" title="Academic term for class schedules">
    <GraduationCap size={16} aria-hidden="true" />
    <span class="term-selector__prefix">Schedules:</span>
    <label class="visually-hidden" for="term-select">Academic term</label>
    <select
      id="term-select"
      value={String(termStore.activeTermId)}
      onchange={onChange}
    >
      {#each termStore.terms as term (term.id)}
        <option value={String(term.id)}>{term.label}</option>
      {/each}
    </select>
    {#if active}
      {#if active.classCount > 0}
        <span class="term-selector__count">{active.classCount} classes</span>
      {:else}
        <a
          class="term-selector__empty"
          href="/contribute"
          target="_blank"
          rel="noopener noreferrer"
        >
          No schedules yet — report
        </a>
      {/if}
    {/if}
  </div>
{/if}

<style>
  .term-selector {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    flex-wrap: wrap;
    color: inherit;
    min-width: 0;
  }

  .term-selector__prefix {
    font-weight: 600;
    white-space: nowrap;
  }

  #term-select {
    font: inherit;
    font-weight: 600;
    color: hsl(5, 53%, 32%);
    background-color: transparent;
    border: 1px solid hsl(0, 0%, 85%);
    border-radius: 0.5rem;
    padding: 0.125rem 0.375rem;
    cursor: pointer;
    max-width: min(14rem, 100%);
    min-width: 0;
  }

  #term-select:hover {
    background-color: hsla(0, 0%, 0%, 0.04);
  }

  .term-selector__count {
    color: hsl(0, 0%, 40%);
    font-weight: 500;
    white-space: nowrap;
  }

  .term-selector__empty {
    color: hsl(5, 53%, 32%);
    font-weight: 500;
    text-decoration: underline;
    white-space: nowrap;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
