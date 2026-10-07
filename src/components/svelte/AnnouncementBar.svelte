<script lang="ts">
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import X from "@lucide/svelte/icons/x";
  import { announcementsStore, modalStore } from "@lib/store.svelte";

  // Critical only (#777): an outage notice must not depend on opening a panel,
  // but info/warning notices stay inside the panel so chrome does not nag.
  const notice = $derived(announcementsStore.criticalNotice);
</script>

{#if notice}
  <div class="announcement-bar" role="alert">
    <TriangleAlert size={16} aria-hidden="true" />
    <div class="announcement-bar__text">
      <span class="announcement-bar__title">{notice.title}</span>
      <span class="announcement-bar__body">{notice.body}</span>
    </div>
    <button
      type="button"
      class="announcement-bar__more"
      onclick={() => modalStore.openModal("announcements")}
    >
      Details
    </button>
    <button
      type="button"
      class="announcement-bar__dismiss"
      aria-label="Dismiss announcement"
      onclick={() => announcementsStore.dismissCritical(notice.id)}
    >
      <X size={16} aria-hidden="true" />
    </button>
  </div>
{/if}

<style>
  .announcement-bar {
    position: fixed;
    top: var(--staging-banner-height, 0px);
    left: 0;
    right: 0;
    z-index: var(--z-staging-banner, 20);
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    padding-top: calc(0.5rem + env(safe-area-inset-top, 0px));
    background: var(--theme-accent-soft, hsl(0, 70%, 95%));
    color: var(--theme-accent-text, hsl(0, 55%, 22%));
    border-bottom: 2px solid var(--theme-accent-text, hsl(0, 60%, 45%));
  }

  .announcement-bar__text {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.375rem;
    min-width: 0;
    flex: 1 1 auto;
  }

  .announcement-bar__title {
    font-size: 0.8125rem;
    font-weight: 700;
    line-height: 1.3;
  }

  .announcement-bar__body {
    font-size: 0.75rem;
    line-height: 1.35;
    color: var(--theme-accent-text, hsl(0, 40%, 30%));
    /* One line on small screens; the panel has the full text. */
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }

  .announcement-bar__more {
    flex: 0 0 auto;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    border: 1px solid var(--theme-accent-text, hsl(0, 60%, 45%));
    background: transparent;
    color: inherit;
    cursor: pointer;
  }

  .announcement-bar__dismiss {
    flex: 0 0 auto;
    display: inline-flex;
    padding: 0.25rem;
    border: none;
    border-radius: 0.375rem;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }

  .announcement-bar__more:focus-visible,
  .announcement-bar__dismiss:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(0, 60%, 30%));
    outline-offset: 1px;
  }
</style>
