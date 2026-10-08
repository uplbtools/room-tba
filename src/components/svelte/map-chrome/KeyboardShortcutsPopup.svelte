<script lang="ts">
  import { onMount } from "svelte";
  import Dialog from "@ui/modal/Dialog.svelte";
  import ModalHeader from "@ui/modal/ModalHeader.svelte";
  import {
    getKeyboardShortcutGroups,
    modifierLabel,
  } from "@lib/keyboard-shortcuts";
  import { portal } from "@lib/portal";
  import { mapToolsStore } from "@lib/store.svelte";
  import {
    registerEphemeralOverlayDismisser,
    openEphemeralOverlay,
  } from "@lib/overlay-stack";
  import { trackOverlay } from "@lib/track-overlay.svelte";
  import "./map-chrome.css";

  /**
   * Keyboard shortcuts, opened with "?" or from You. A standard dialog: the
   * shared shell supplies the overlay, focus trap, Escape and top app bar.
   */
  type Props = {
    compact?: boolean;
  };

  let { compact: _compact = false }: Props = $props();

  let open = $state(false);

  onMount(() => {
    const onOpenRequest = () => {
      if (!open) {
        openEphemeralOverlay(() => {
          mapToolsStore.close();
          open = true;
        });
      }
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

  function closePanel() {
    open = false;
  }

  trackOverlay("shortcuts", () => open, closePanel);

  const shortcutGroups = $derived(getKeyboardShortcutGroups());
  const mod = modifierLabel();
</script>

<!-- Portaled: hosts mount this inside chrome that clips or stacks below it. -->
<div class="shortcuts-host" use:portal>
  <Dialog
    {open}
    onclose={closePanel}
    size="reading"
    labelledBy="keyboard-shortcuts-title"
    closeLabel="Close keyboard shortcuts"
  >
    <div class="shortcuts-panel" id="keyboard-shortcuts-panel">
      <ModalHeader
        id="keyboard-shortcuts-title"
        title="Keyboard shortcuts"
        description="Shortcuts are disabled while typing in a search box or form field."
      />
      <div class="shortcuts-panel__scroll map-chrome-scroll">
        {#each shortcutGroups as group (group.title)}
          <section class="shortcuts-panel__group">
            <h3 class="shortcuts-panel__title">{group.title}</h3>
            <ul class="shortcuts-panel__list">
              {#each group.items as item (item.description)}
                <li>
                  <span>{item.description}</span>
                  <span class="shortcuts-panel__keys">
                    {#each item.keys as key, i (key)}
                      {#if i > 0}<span class="shortcuts-panel__sep">/</span>{/if}
                      <kbd>{key.replace("⌘", mod).replace("Ctrl", mod)}</kbd>
                    {/each}
                  </span>
                </li>
              {/each}
            </ul>
          </section>
        {/each}
      </div>
    </div>
  </Dialog>
</div>

<style>
  .shortcuts-panel {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
  }

  .shortcuts-panel__scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-bottom: 0.5rem;
  }

  .shortcuts-panel__group {
    display: flex;
    flex-direction: column;
  }

  .shortcuts-panel__title {
    margin: 0;
    padding: 1rem 1rem 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--theme-accent-text, hsl(345, 75%, 31%));
  }

  .shortcuts-panel__list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .shortcuts-panel__list li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-height: 3.5rem;
    padding: 0.5rem 1rem;
    box-sizing: border-box;
    font-size: 1rem;
    line-height: 1.4;
    color: var(--theme-text, hsl(0, 0%, 15%));
  }

  .shortcuts-panel__keys {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0.25rem;
  }

  .shortcuts-panel__sep {
    color: var(--theme-text-muted, hsl(0, 0%, 55%));
    font-size: 0.75rem;
  }

  kbd {
    display: inline-block;
    min-width: 1.5rem;
    padding: 0.1875rem 0.4375rem;
    border: 1px solid var(--theme-border, hsl(0, 0%, 78%));
    border-radius: 0.375rem;
    background: var(--theme-surface-2, hsl(0, 0%, 97%));
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.2;
    text-align: center;
  }
</style>
