<script lang="ts">
  import { onMount } from "svelte";
  import Keyboard from "@lucide/svelte/icons/keyboard";
  import {
    getKeyboardShortcutGroups,
    modifierLabel,
  } from "@lib/keyboard-shortcuts";
  import { trapFocus } from "@lib/focus-trap";
  import { portal } from "@lib/portal";
  import { mapToolsStore } from "@lib/store.svelte";
  import { registerEphemeralOverlayDismisser } from "@lib/overlay-stack";
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
    const rect = triggerEl.getBoundingClientRect();
    const width = Math.min(18 * 16, window.innerWidth - 16);
    const left = Math.min(
      Math.max(8, rect.right - width),
      window.innerWidth - width - 8,
    );
    const bottom = Math.max(8, window.innerHeight - rect.top + 8);
    panelStyle = `left: ${left}px; bottom: ${bottom}px; width: ${width}px;`;
  }

  $effect(() => {
    if (!open) return;
    updatePanelPosition();
    const handleLayout = () => updatePanelPosition();
    window.addEventListener("resize", handleLayout);
    return () => window.removeEventListener("resize", handleLayout);
  });

  function toggleOpen() {
    if (!open) mapToolsStore.close();
    open = !open;
    if (open) queueMicrotask(updatePanelPosition);
  }

  function closePanel() {
    open = false;
  }

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
  <button
    bind:this={triggerEl}
    type="button"
    class="map-chrome-chip shortcuts-chip__trigger"
    aria-expanded={open}
    aria-haspopup="dialog"
    aria-controls="keyboard-shortcuts-panel"
    aria-label="Keyboard shortcuts"
    aria-keyshortcuts="?"
    title="Keyboard shortcuts (?)"
    onclick={toggleOpen}
  >
    <Keyboard size={14} aria-hidden="true" />
    {#if !compact}
      <span>Shortcuts</span>
    {/if}
  </button>

  {#if open}
    <div
      bind:this={panelEl}
      id="keyboard-shortcuts-panel"
      class="shortcuts-panel map-chrome-popover"
      style={panelStyle}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      use:portal
    >
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
    padding: 0.625rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    max-height: min(60vh, 20rem);
    overflow-y: auto;
  }

  .shortcuts-panel__lead {
    margin: 0;
    font-size: 0.6875rem;
    line-height: 1.35;
    color: hsl(0, 0%, 40%);
  }

  .shortcuts-panel__group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .shortcuts-panel__title {
    margin: 0;
    font: inherit;
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: hsl(0, 0%, 40%);
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
    font-size: 0.75rem;
    line-height: 1.35;
    color: hsl(0, 0%, 22%);
  }

  .shortcuts-panel__keys {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .shortcuts-panel__sep {
    color: hsl(0, 0%, 55%);
    font-size: 0.625rem;
  }

  kbd {
    display: inline-block;
    padding: 0.125rem 0.375rem;
    border: 1px solid hsl(0, 0%, 82%);
    border-radius: 0.375rem;
    background: hsl(0, 0%, 98%);
    font: inherit;
    font-size: 0.6875rem;
    font-weight: 600;
    line-height: 1.2;
  }
</style>
