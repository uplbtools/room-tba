<script lang="ts">
  import X from "@lucide/svelte/icons/x";
  import Bus from "@lucide/svelte/icons/bus";
  import { JEEPNEY_ROUTES } from "@constants/jeepney-routes";
  import { floatingControlPanelStore, jeepneyStore } from "@lib/store.svelte";

  type Props = {
    embedded?: boolean;
  };

  let { embedded = false }: Props = $props();

  const panelId = "jeepney";
  const menuOpen = $derived(floatingControlPanelStore.openPanel === panelId);
  const showPanel = $derived(embedded || menuOpen);

  function selectRoute(id: string) {
    jeepneyStore.selectRoute(id);
    if (!embedded) {
      floatingControlPanelStore.close(panelId);
    }
  }
</script>

<div class="jeepney-menu" class:embedded>
  {#if showPanel}
    <div class="route-list" class:embedded role="menu">
      {#if !embedded}
        <div class="route-list-header">
          <span>Jeepney Routes</span>
          <button
            type="button"
            class="close-btn"
            onclick={() => floatingControlPanelStore.close(panelId)}
            aria-label="Close jeepney menu"
          >
            <X size="16" />
          </button>
        </div>
      {/if}
      {#each JEEPNEY_ROUTES as route (route.id)}
        {@const isActive = jeepneyStore.selectedRouteId === route.id}
        <button
          type="button"
          class="route-option"
          class:active={isActive}
          onclick={() => selectRoute(route.id)}
        >
          <span class="route-color" style:background-color={route.color}></span>
          <span class="route-text">
            <span class="route-name">{route.name}</span>
            <span class="route-description">{route.description}</span>
          </span>
        </button>
      {/each}
      {#if jeepneyStore.selectedRouteId !== null}
        <button
          type="button"
          class="clear-btn"
          onclick={() => jeepneyStore.clearRoute()}
        >
          Clear active route
        </button>
      {/if}
    </div>
  {/if}

  {#if !embedded}
    <button
      class="jeepney-btn"
      class:active={jeepneyStore.selectedRouteId !== null}
      onclick={() => floatingControlPanelStore.toggle(panelId)}
      title="Jeepney Routes"
      aria-label="Jeepney Routes"
      aria-expanded={menuOpen}
    >
      <Bus />
    </button>
  {/if}
</div>

<style>
  .jeepney-menu.embedded {
    width: 100%;
  }

  .route-list.embedded {
    width: 100%;
    max-width: 100%;
    padding: 0;
    box-shadow: none;
    overflow-x: hidden;
  }

  .jeepney-menu {
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
  }
  .jeepney-btn {
    background-color: white;
    border: 1px solid #ececec;
    border-radius: 50%;
    width: 3rem;
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    color: hsl(5, 53%, 32%);
    transition:
      background-color 0.2s,
      transform 0.2s;
  }
  .jeepney-btn:hover {
    background-color: hsl(5, 53%, 98%);
    transform: scale(1.05);
  }
  .jeepney-btn.active {
    background-color: hsl(5, 53%, 32%);
    color: white;
  }

  .route-list {
    background-color: white;
    border-radius: 0.875rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    width: 17rem;
    max-width: calc(100vw - 1rem);
  }
  .route-list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 600;
    font-size: 0.875rem;
    color: hsl(0, 0%, 20%);
    padding: 0.125rem 0.25rem;
  }
  .close-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    color: hsl(0, 0%, 40%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.125rem;
    border-radius: 0.375rem;
  }
  .close-btn:hover {
    background-color: hsl(0, 0%, 95%);
  }

  .route-option {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 0.625rem;
    width: 100%;
    min-width: 0;
    max-width: 100%;
    padding: 0.5rem 0.625rem;
    border-radius: 0.625rem;
    border: 1px solid transparent;
    background-color: hsl(0, 0%, 98%);
    cursor: pointer;
    text-align: left;
    transition:
      background-color 0.15s,
      border-color 0.15s;
  }
  .route-option:hover {
    background-color: hsl(0, 0%, 94%);
  }
  .route-option.active {
    background-color: hsl(5, 53%, 96%);
    border-color: hsl(5, 53%, 75%);
  }
  .route-color {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    flex: 0 0 auto;
    box-shadow: 0 0 0 2px white;
  }
  .route-text {
    display: flex;
    min-width: 0;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0.125rem;
    line-height: 1.2;
  }
  .route-name {
    font-weight: 600;
    font-size: 0.875rem;
    color: hsl(0, 0%, 15%);
  }
  .route-description {
    font-size: 0.75rem;
    color: hsl(0, 0%, 45%);
  }

  .clear-btn {
    margin-top: 0.25rem;
    padding: 0.5rem;
    border-radius: 0.5rem;
    border: 1px solid hsl(0, 0%, 88%);
    background-color: white;
    cursor: pointer;
    font-size: 0.8125rem;
    color: hsl(5, 53%, 32%);
    font-weight: 500;
  }
  .clear-btn:hover {
    background-color: hsl(5, 53%, 98%);
  }
</style>
