<script lang="ts">
  import { RefreshCw, FileText } from "@lucide/svelte";
  import { syncToastStore, modalStore } from "@lib/store.svelte";
  import { APP_VERSION_LABEL } from "@constants/version";
  import { parseChangelogHighlights } from "@lib/changelog-highlights";
  import changelogRaw from "../../../CHANGELOG.md?raw";

  const highlights = $derived(parseChangelogHighlights(changelogRaw));
  const hasUpdate = $derived(syncToastStore.needRefresh);

  let reloading = $state(false);

  function confirmReload() {
    reloading = true;
    // Applies the waiting service worker and reloads to the new version.
    syncToastStore.reload();
  }
</script>

<div class="changelog-modal">
  <p class="changelog-modal__version">
    {#if highlights}
      What's new in v{highlights.version}
    {:else}
      Room TBA {APP_VERSION_LABEL}
    {/if}
  </p>

  {#if hasUpdate}
    <p class="changelog-modal__lead">
      A new version is ready. Review what changed, then reload to update.
    </p>
  {/if}

  {#if highlights && highlights.items.length > 0}
    <ul class="changelog-modal__list">
      {#each highlights.items as item (item)}
        <li>{item}</li>
      {/each}
    </ul>
    {#if highlights.totalCount > highlights.items.length}
      <p class="changelog-modal__more">
        + {highlights.totalCount - highlights.items.length} more in the full changelog
      </p>
    {/if}
  {:else}
    <p class="changelog-modal__lead">See the full changelog for details.</p>
  {/if}

  <a
    class="changelog-modal__full-link"
    href="/changelog"
    target="_blank"
    rel="noopener noreferrer"
  >
    <FileText size={14} aria-hidden="true" />
    Full changelog
  </a>

  <div class="changelog-modal__actions">
    {#if hasUpdate}
      <button
        type="button"
        class="changelog-modal__btn changelog-modal__btn--secondary"
        onclick={() => modalStore.closeModal()}
      >
        Later
      </button>
      <button
        type="button"
        class="changelog-modal__btn changelog-modal__btn--primary"
        onclick={confirmReload}
        disabled={reloading}
      >
        <RefreshCw
          size={14}
          class={reloading ? "loading-icon" : ""}
          aria-hidden="true"
        />
        {reloading ? "Reloading…" : "Reload to update"}
      </button>
    {:else}
      <button
        type="button"
        class="changelog-modal__btn changelog-modal__btn--primary"
        onclick={() => modalStore.closeModal()}
      >
        Close
      </button>
    {/if}
  </div>
</div>

<style>
  .changelog-modal {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    padding: 0.25rem 0.25rem 0;
    max-width: 26rem;
  }

  .changelog-modal__version {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: hsl(0, 0%, 15%);
  }

  .changelog-modal__lead {
    margin: 0;
    font-size: 0.875rem;
    color: hsl(0, 0%, 30%);
    line-height: 1.4;
  }

  .changelog-modal__list {
    margin: 0;
    padding-left: 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.875rem;
    color: hsl(0, 0%, 22%);
    line-height: 1.4;
    list-style: disc;
  }

  .changelog-modal__more {
    margin: 0;
    font-size: 0.8125rem;
    color: hsl(0, 0%, 45%);
  }

  .changelog-modal__full-link {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.625rem;
    border: 1px solid hsl(5, 34%, 82%);
    border-radius: 0.5rem;
    color: hsl(5, 53%, 32%);
    font-size: 0.8125rem;
    font-weight: 600;
    text-decoration: none;
  }

  .changelog-modal__full-link:hover,
  .changelog-modal__full-link:focus-visible {
    background: hsl(5, 20%, 96%);
  }

  .changelog-modal__actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }

  .changelog-modal__btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 2.25rem;
    padding: 0.4rem 1rem;
    border-radius: 0.625rem;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
  }

  .changelog-modal__btn--primary {
    border: 1px solid hsl(5, 53%, 32%);
    background: hsl(5, 53%, 32%);
    color: white;
  }

  .changelog-modal__btn--primary:hover:not(:disabled) {
    background: hsl(5, 53%, 38%);
  }

  .changelog-modal__btn--primary:disabled {
    cursor: progress;
    opacity: 0.7;
  }

  .changelog-modal__btn--secondary {
    border: 1px solid hsl(0, 0%, 80%);
    background: transparent;
    color: hsl(0, 0%, 30%);
  }

  .changelog-modal__btn--secondary:hover {
    background: hsl(0, 0%, 96%);
  }

  :global(.loading-icon) {
    animation: changelog-spin 0.75s linear infinite;
  }

  @keyframes changelog-spin {
    from {
      rotate: 0deg;
    }
    to {
      rotate: 360deg;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.loading-icon) {
      animation: none;
    }
  }
</style>
