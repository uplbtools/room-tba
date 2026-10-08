<script lang="ts">
  /**
   * Overview / Rooms / Photos strip under the place sheet header (GMaps
   * place tabs). The tabs jump to a section of the same scrolling sheet;
   * the caller decides how, and raises the sheet when it is only peeking.
   */
  type Tab = { id: string; label: string };
  type Props = {
    tabs: Tab[];
    active: string;
    onselect: (id: string) => void;
  };
  const { tabs, active, onselect }: Props = $props();
</script>

<div class="place-sheet-tabs" role="tablist" aria-label="Place sections">
  {#each tabs as tab (tab.id)}
    <button
      type="button"
      role="tab"
      class="place-sheet-tabs__tab"
      class:place-sheet-tabs__tab--active={active === tab.id}
      aria-selected={active === tab.id}
      onclick={() => onselect(tab.id)}
    >
      {tab.label}
    </button>
  {/each}
</div>

<style>
  .place-sheet-tabs {
    display: flex;
    border-bottom: 1px solid var(--theme-border-strong, hsla(0 0% 50% / 0.25));
    margin: 0 -0.25rem 0.5rem;
  }

  .place-sheet-tabs__tab {
    flex: 1;
    min-height: 48px;
    padding: 0 0.75rem;
    background: transparent;
    border: 0;
    border-bottom: 3px solid transparent;
    color: var(--theme-text-2, #52525b);
    font: inherit;
    font-size: 0.9375rem;
    font-weight: 500;
    cursor: pointer;
  }

  .place-sheet-tabs__tab--active {
    color: var(--theme-accent-text, var(--theme-text, inherit));
    border-bottom-color: var(--theme-accent-fill, currentColor);
  }

  .place-sheet-tabs__tab:focus-visible {
    outline: 2px solid var(--theme-accent-fill, currentColor);
    outline-offset: -2px;
  }
</style>
