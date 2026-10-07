<script lang="ts">
  import { onMount } from "svelte";
  import X from "@lucide/svelte/icons/x";
  import IconButton from "@ui/IconButton.svelte";
  import {
    getKeyboardShortcutGroups,
    modifierLabel,
  } from "@lib/keyboard-shortcuts";
  import { trapFocus } from "@lib/focus-trap";
  import { rafThrottle } from "@lib/layout-css-vars";
  import { portal } from "@lib/portal";
  import {
    computeShortcutsPanelLayout,
    formatShortcutsPanelStyle,
    measureOpenSidePanelBounds,
  } from "@lib/shortcuts-panel-position";
  import { mapToolsStore } from "@lib/store.svelte";
  import {
    registerEphemeralOverlayDismisser,
    openEphemeralOverlay,
  } from "@lib/overlay-stack";
  import { trackOverlay } from "@lib/track-overlay.svelte";
  import "./map-chrome.css";

  type Props = {
    compact?: boolean;
  };

  let { compact = false }: Props = $props();

  let open = $state(false);
  let triggerEl = $state<HTMLButtonElement | null>(null);
  let panelEl = $state<HTMLDivElement | null>(null);
  let panelStyle = $state("");

  onMount(() => {
    const onOpenRequest = () => {
      if (!open) toggleOpen();
    };
    window.addEventListener("room-tba:open-shortcuts-help", onOpenRequest);
    const unregisterDismiss = registerEphemeralOverlayDismisser(() => {
      open = false;
    });
    return () => {
      window.removeEventListener("room-tba:open-shortcuts-help", onOpenRequest);
      unregisterDismiss();
    };
  });

  function updatePanelPosition() {
    if (!open || !triggerEl) return;
    const layout = computeShortcutsPanelLayout({
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      triggerRect: triggerEl.getBoundingClientRect(),
      sidePanel: measureOpenSidePanelBounds(),
    });
    panelStyle = formatShortcutsPanelStyle(layout);
  }

  $effect(() => {
    if (!open) return;
    updatePanelPosition();
    const handleLayout = rafThrottle(updatePanelPosition);
    window.addEventListener("resize", handleLayout);
    window.addEventListener("scroll", handleLayout, true);
    return () => {
      window.removeEventListener("resize", handleLayout);
      window.removeEventListener("scroll", handleLayout, true);
    };
  });

  $effect(() => {
    if (!open || !panelEl) return;
    updatePanelPosition();
    const observer = new ResizeObserver(() => updatePanelPosition());
    observer.observe(panelEl);
    return () => observer.disconnect();
  });

  function toggleOpen() {
    if (!open) {
      openEphemeralOverlay(() => {
        mapToolsStore.close();
        open = true;
        queueMicrotask(updatePanelPosition);
      });
      return;
    }
    open = false;
  }

  function closePanel() {
    open = false;
  }

  trackOverlay("shortcuts", () => open, closePanel);

  $effect(() => {
    if (!open || !panelEl) return;
    return trapFocus(panelEl, { onEscape: closePanel });
  });

  function handleDocumentPointerDown(event: PointerEvent) {
    if (!open) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (triggerEl?.contains(target)) return;
    if (panelEl?.contains(target)) return;
    closePanel();
  }

  const shortcutGroups = $derived(getKeyboardShortcutGroups());
  const mod = modifierLabel();
</script>

<svelte:window onpointerdown={handleDocumentPointerDown} />

<div class="shortcuts-chip">
  {#if open}
    <div
      id="keyboard-shortcuts-panel"
      class="shortcuts-panel map-chrome-popover"
      style={panelStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-shortcuts-title"
      use:portal
    >
      <div class="shortcuts-panel__header">
        <h2 id="keyboard-shortcuts-title" class="shortcuts-panel__heading">
          Keyboard shortcuts
        </h2>
        <IconButton label="Close keyboard shortcuts" onclick={closePanel}>
          <X size={20} aria-hidden="true" />
        </IconButton>
      </div>
      <p class="shortcuts-panel__lead">
        Shortcuts are disabled while typing in a search box or form field.
      </p>
      {#each shortcutGroups as group (group.title)}
        <section class="shortcuts-panel__group">
          <h3 class="shortcuts-panel__title">{group.title}</h3>
          <ul class="shortcuts-panel__list">
            {#each group.items as item (item.description)}
              <li>
                <span class="shortcuts-panel__keys">
                  {#each item.keys as key, i (key)}
                    {#if i > 0}<span class="shortcuts-panel__sep">/</span>{/if}
                    <kbd>{key.replace("⌘", mod).replace("Ctrl", mod)}</kbd>
                  {/each}
                </span>
                <span>{item.description}</span>
              </li>
            {/each}
          </ul>
        </section>
      {/each}
    </div>
  {/if}
</div>

<style>
  .shortcuts-chip {
    position: relative;
    display: inline-flex;
    flex-shrink: 0;
  }

  .shortcuts-chip__trigger {
    cursor: pointer;
  }

  .shortcuts-panel {
    position: fixed;
    z-index: var(--z-chrome-popover, 17);
    border-radius: 0.75rem;
    padding: 1.125rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    overflow-y: auto;
    box-sizing: border-box;
    /* Opened from the menu there is no trigger to anchor to, so no inline
       width either; take the phone's width rather than the popover's. */
    width: min(30rem, calc(100vw - 2rem));
    top: 50%;
    left: 50%;
    translate: -50% -50%;
  }

  .shortcuts-panel__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin: -0.5rem -0.75rem -0.375rem 0;
  }

  .shortcuts-panel__heading {
    margin: 0;
    font-size: 1.0625rem;
    font-weight: 700;
    line-height: 1.25;
    color: var(--theme-text, hsl(0, 0%, 12%));
  }

  .shortcuts-panel__lead {
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.4;
    color: var(--theme-text-2, hsl(0, 0%, 38%));
  }

  .shortcuts-panel__group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .shortcuts-panel__title {
    margin: 0;
    font: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: var(--theme-text-2, hsl(0, 0%, 40%));
  }

  .shortcuts-panel__list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .shortcuts-panel__list li {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
    font-size: 0.875rem;
    line-height: 1.4;
    color: var(--theme-text, hsl(0, 0%, 22%));
  }

  .shortcuts-panel__keys {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .shortcuts-panel__sep {
    color: var(--theme-text-muted, hsl(0, 0%, 55%));
    font-size: 0.625rem;
  }

  /* Side by side, a narrow sheet squeezed the description to a word per
     line; stack keys over description instead. */
  @media (max-width: 30rem) {
    .shortcuts-panel {
      padding: 1rem;
    }

    .shortcuts-panel__list {
      gap: 0.625rem;
    }

    .shortcuts-panel__list li {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }
  }

  kbd {
    display: inline-block;
    padding: 0.1875rem 0.4375rem;
    border: 1px solid var(--theme-border, hsl(0, 0%, 78%));
    border-radius: 0.375rem;
    background: var(--theme-surface, hsl(0, 0%, 98%));
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.2;
  }
</style>
