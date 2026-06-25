<script lang="ts">
  import {
    CircleCheck,
    Info,
    LoaderCircle,
    LoaderPinwheel,
    TriangleAlert,
    X,
  } from "@lucide/svelte";
  import { syncToastStore } from "../../lib/store.svelte";
    import { fly } from "svelte/transition";
  $inspect(
    syncToastStore.currentSyncData !== null && !syncToastStore.allSynced,
  );
  let manualClosed = $state<boolean>(false);

  $effect(() => {
      syncToastStore.recentlySynced;
      syncToastStore.allSynced;
      syncToastStore.currentSync;
      manualClosed = false;
      // if (syncToastStore.recentlySynced)
  })
</script>

{#snippet icon(type: "warning" | "success" | "info" | "loading")}
  {#if type === "info"}
    <Info color="#000" />
  {:else if type === "success"}
    <CircleCheck color="hsla(133, 100%, 13%, 1)" />
  {:else if type === "warning"}
    <TriangleAlert color="hsla(54, 100%, 18%, 1)" />
  {:else}
    <LoaderCircle color="#000" class="loading-icon" />
  {/if}
{/snippet}

{#if (syncToastStore.recentlySynced === null || syncToastStore.recentlySynced) && !manualClosed}
  <div class="sync-toast" class:sync-toast--success={syncToastStore.allSynced} transition:fly={{duration:175, x:20}}>
    {#if syncToastStore.allSynced}
      {@render icon("success")}
    {:else if syncToastStore.currentSync === null}
      {@render icon("loading")}
    {:else}
      {@render icon("info")}
    {/if}
    <div class="sync-toast-content">
      <div class="sync-toast-text">
        <div class="sync-toast-header">
          {#if syncToastStore.allSynced}
            Data successfully synced
          {:else if syncToastStore.currentSync === null}
            Checking if data needs syncing
          {:else}
            Syncing data to device
          {/if}
        </div>
        <div class="sync-toast-subtitle">
          {#if syncToastStore.allSynced}
            Room TBA can now work offline
          {:else if syncToastStore.currentSync !== null}
            Storing {syncToastStore.currentSync}
          {/if}
        </div>
      </div>
      {#key syncToastStore.currentSync}
        {#if !syncToastStore.allSynced && syncToastStore.currentSyncData !== null}
          <div class="progress-bar">
            <!--  -->
            <div
              class="progress-bar-value"
              style:width={`${Math.floor((syncToastStore.currentSyncData.synced / syncToastStore.currentSyncData.total) * 5) * 20}%`}
            ></div>
          </div>
        {/if}
      {/key}
    </div>
    <button onclick={() => manualClosed = true}><X /></button>
  </div>
{/if}

<style>
  div.sync-toast {
    padding: 1rem;
    background-color: white;
    border-radius: var(--radius-lg, 12px);
    position: fixed;
    right: 0.5rem;
    top: 0.5rem;
    z-index: 30;
    display: flex;
    gap: 0.5rem;
    width: min(360px, 100%);
    .sync-toast-content {
      display: flex;
      flex-direction: column;
      flex: 1;
      gap:.5rem;
      .sync-toast-text {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .sync-toast-header {
        font-size: 16px;
        font-weight: bold;
      }
      .sync-toast-subtitle {
        font-size: 14px;
      }
    }
  }
  div.sync-toast--success {
    border: 1px solid var(--Color-success-200, #c6fbd2);
    background: var(--Color-success-100, #e5ffeb);
    .sync-toast-header {
      color: var(--Color-success-900, #00430f);
    }
    .sync-toast-subtitle {
      color: var(--Color-success-700, #07761f);
    }
  }
  div.progress-bar {
    position: relative;
    width: 100%;
    background-color: hsla(358, 84%, 86%, 1);
    border-radius: 8px;
    height: 6px;
  }
  div.progress-bar-value {
    background-color: hsla(359, 47%, 38%, 1);
    border-radius: 8px;
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    transition: width 0.5s ease-in-out;
  }

  :global(.loading-icon) {
      animation: rotate .75s linear infinite;
  }
  @keyframes rotate {
      from {
          rotate: 0deg;
      } to {
          rotate: 360deg;
      }
  }
</style>
