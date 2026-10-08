<script lang="ts">
  import type { Snippet } from "svelte";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import X from "@lucide/svelte/icons/x";
  import IconButton from "@ui/IconButton.svelte";
  import { getSheetContext } from "./sheet-context";

  /**
   * The one top app bar for every modal surface: a 56px row with the close X
   * (or a back arrow on a nested screen) at the top-left, the title next to
   * it on one line, and an optional trailing text action. The host surface
   * (Dialog, the You sheet) supplies close/back through context, so a screen
   * renders the same bar wherever it opens. A divider appears once the
   * content under it scrolls (the host sets `data-scrolled`).
   */
  type Props = {
    title: string;
    /** Heading id, for the registry's `labelledBy`. */
    id?: string;
    /** One muted line under the bar. */
    description?: string;
    /** Inline actions under the bar (e.g. a secondary button). */
    actions?: Snippet;
    /** Trailing text action on the bar itself. */
    trailing?: Snippet;
    /** Overrides the surface's close. */
    onclose?: () => void;
    closeLabel?: string;
    /** Overrides the surface's back. */
    onback?: () => void;
    backLabel?: string;
  };

  let {
    title,
    id,
    description,
    actions,
    trailing,
    onclose,
    closeLabel,
    onback,
    backLabel = "Back",
  }: Props = $props();

  const sheet = getSheetContext();

  const back = $derived(onback ?? (onclose ? null : (sheet?.back ?? null)));
  const close = $derived(onclose ?? sheet?.close ?? null);
  const closeName = $derived(closeLabel ?? sheet?.closeLabel ?? "Close");

  $effect(() => sheet?.claimHeader?.());
</script>

<header class="modal-header">
  <div class="modal-header__bar">
    {#if back}
      <IconButton class="modal-header__nav" label={backLabel} onclick={back}>
        <ArrowLeft size={24} aria-hidden="true" />
      </IconButton>
    {:else if close}
      <IconButton class="modal-header__nav" label={closeName} onclick={close}>
        <X size={24} aria-hidden="true" />
      </IconButton>
    {/if}
    <h2
      {id}
      class="modal-header__title"
      class:modal-header__title--inset={!back && !close}
    >
      {title}
    </h2>
    {#if trailing}
      <div class="modal-header__trailing">{@render trailing()}</div>
    {/if}
  </div>
  {#if description || actions}
    <div class="modal-header__sub">
      {#if description}
        <p class="modal-header__description">{description}</p>
      {/if}
      {#if actions}
        <div class="modal-header__actions">{@render actions()}</div>
      {/if}
    </div>
  {/if}
</header>

<style>
  .modal-header {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    background: var(--theme-surface, #fff);
    border-bottom: 1px solid transparent;
    transition: border-color 0.15s ease;
  }

  :global([data-scrolled]) .modal-header {
    border-bottom-color: var(--theme-border, hsl(0, 0%, 88%));
  }

  .modal-header__bar {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    min-height: 3.5rem;
    padding: 0 0.5rem 0 0.25rem;
    box-sizing: border-box;
  }

  .modal-header :global(.modal-header__nav) {
    width: 3rem;
    height: 3rem;
  }

  .modal-header__title {
    flex: 1 1 auto;
    min-width: 0;
    margin: 0;
    padding-left: 0.25rem;
    overflow: hidden;
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.3;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--theme-text, hsl(0, 0%, 12%));
  }

  /* Without a leading button the title keeps the 16px row inset. */
  .modal-header__title--inset {
    padding-left: 0.75rem;
  }

  .modal-header__trailing {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0.25rem;
  }

  .modal-header__sub {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0 1rem 0.75rem;
  }

  .modal-header__description {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.4;
    color: var(--theme-text-2, hsl(0, 0%, 40%));
  }

  .modal-header__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }
</style>
