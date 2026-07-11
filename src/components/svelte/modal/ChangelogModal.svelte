<script lang="ts">
  import { RefreshCw } from "@lucide/svelte";
  import { syncToastStore, modalStore } from "@lib/store.svelte";
  import { APP_VERSION_LABEL } from "@constants/version";
  import { parseChangelogEntries } from "@lib/changelog-highlights";
  import { releaseTimestampLabel } from "@lib/release-timestamps";
  import changelogRaw from "../../../../CHANGELOG.md?raw";

  const entries = $derived(parseChangelogEntries(changelogRaw));
  const hasUpdate = $derived(syncToastStore.needRefresh);

  let reloading = $state(false);

  function confirmReload() {
    reloading = true;
    // Applies the waiting service worker and reloads to the new version.
    syncToastStore.reload();
  }
</script>

<div class="changelog-modal">
  <header class="changelog-modal__header">
    <p class="changelog-modal__version">
      Room TBA {APP_VERSION_LABEL}
    </p>
    {#if hasUpdate}
      <p class="changelog-modal__lead">
        A new version is ready. Review what changed, then reload to update.
      </p>
    {/if}
  </header>

  <div class="changelog-modal__scroll">
    {#if entries.length === 0}
      <p class="changelog-modal__lead">
        No changelog entries found. See <a href="/changelog">/changelog</a>.
      </p>
    {/if}
    {#each entries as entry (entry.version)}
      <section class="changelog-modal__entry">
        <h3 class="changelog-modal__entry-version">
          v{entry.version}
          {#if releaseTimestampLabel(entry.version)}
            <span class="changelog-modal__entry-date"
              >{releaseTimestampLabel(entry.version)}</span
            >
          {:else if entry.date}
            <span class="changelog-modal__entry-date">{entry.date}</span>
          {/if}
        </h3>
        {#each entry.sections as section}
          {#if section.title}
            <h4 class="changelog-modal__section-title">{section.title}</h4>
          {/if}
          <ul class="changelog-modal__list">
            {#each section.items as item}
              <li>{item}</li>
            {/each}
          </ul>
        {/each}
      </section>
    {/each}
  </div>

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
    flex: 1 1 auto;
    min-height: 0;
  }

  .changelog-modal__header {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    padding-right: 2.25rem;
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

  .changelog-modal__scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-right: 0.5rem;
  }

  .changelog-modal__entry {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    border-bottom: 1px solid hsl(0, 0%, 92%);
    padding-bottom: 0.875rem;
  }

  .changelog-modal__entry:last-child {
    border-bottom: none;
  }

  .changelog-modal__entry-version {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 700;
    color: hsl(5, 53%, 32%);
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .changelog-modal__entry-date {
    font-size: 0.75rem;
    font-weight: 500;
    color: hsl(0, 0%, 50%);
  }

  .changelog-modal__section-title {
    margin: 0.25rem 0 0;
    font-size: 0.8125rem;
    font-weight: 600;
    color: hsl(0, 0%, 35%);
    text-transform: uppercase;
    letter-spacing: 0.02em;
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

  .changelog-modal__actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding: 0.25rem 0 0.375rem;
    border-top: 1px solid hsl(0, 0%, 92%);
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
