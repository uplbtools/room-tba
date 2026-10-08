<script lang="ts">
  import { untrack, type Snippet } from "svelte";
  import { fade, fly } from "svelte/transition";
  import { MediaQuery } from "svelte/reactivity";
  import X from "@lucide/svelte/icons/x";
  import IconButton from "@ui/IconButton.svelte";
  import { trapFocus } from "@lib/focus-trap";
  import {
    modalContentDismiss,
    modalContentReveal,
    overlayFade,
  } from "@lib/motion";
  import { setSheetContext } from "./sheet-context";

  /**
   * The one dialog shell. Every modal surface in the app renders through
   * this: overlay, focus trap, escape, motion and sizing live here and
   * nowhere else. The top app bar is ModalHeader, rendered by the content:
   * it reads close from this shell's context, so the X sits top-left on the
   * title row in every modal. Content without a ModalHeader keeps a fallback
   * X in the corner.
   *
   * Phones (under 600px) get a full-height sheet sliding up with a 28px top
   * radius; wider screens a centred dialog, min(560px, 100vw - 48px) wide
   * and at most 85dvh tall.
   *
   * Sizes are intents, not pixel values:
   *   compact   a short list or form
   *   reading   prose and forms (the standard width)
   *   default   general content (the standard width)
   *   wide      long text that wants a longer line (What's new), ~680px
   *   large     task surfaces (review queue, layers)
   *   showcase  kept as an alias of the standard width
   */
  export type DialogSize =
    | "compact"
    | "reading"
    | "default"
    | "wide"
    | "large"
    | "showcase";

  type Props = {
    open: boolean;
    onclose: () => void;
    /** Escape handler when it should pop a nested screen; defaults to onclose. */
    onescape?: () => void;
    size?: DialogSize;
    /** Accessible name. Omit when the content supplies `labelledBy`. */
    ariaLabel?: string;
    /** Id of a heading the content renders itself. */
    labelledBy?: string;
    /** Close button label, e.g. "Close settings". */
    closeLabel?: string;
    showClose?: boolean;
    /** Focus the dialog container on open rather than its first control. */
    focusDialog?: boolean;
    children: Snippet;
  };

  let {
    open,
    onclose,
    onescape,
    size = "default",
    ariaLabel,
    labelledBy,
    closeLabel = "Close dialog",
    showClose = true,
    focusDialog = false,
    children,
  }: Props = $props();

  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");
  const phone = new MediaQuery("(max-width: 599.98px)");

  let contentEl = $state<HTMLDivElement | null>(null);
  let overlayCloseReady = $state(false);
  let headers = $state(0);
  let scrolled = $state(false);

  setSheetContext({
    get close() {
      return onclose;
    },
    get closeLabel() {
      return closeLabel;
    },
    back: null,
    // Untracked: the caller is a header's effect, which must not re-run
    // (and re-claim) every time the count changes.
    claimHeader() {
      untrack(() => (headers += 1));
      return () => untrack(() => (headers -= 1));
    },
  });

  // A click that opened the dialog must not also close it on the same
  // gesture, so the overlay only arms after the first frame.
  $effect(() => {
    if (!open) {
      overlayCloseReady = false;
      scrolled = false;
      return;
    }
    overlayCloseReady = false;
    const frame = requestAnimationFrame(() => {
      overlayCloseReady = true;
    });
    return () => cancelAnimationFrame(frame);
  });

  $effect(() => {
    if (!open || !contentEl) return;
    return trapFocus(contentEl, {
      onEscape: () => (onescape ?? onclose)(),
      ...(focusDialog ? { initialFocus: contentEl } : {}),
    });
  });

  function handleOverlayClick() {
    if (!overlayCloseReady) return;
    onclose();
  }

  /** Divider under the top app bar once anything inside has scrolled. */
  function handleScroll(event: Event) {
    const target = event.target;
    if (target instanceof HTMLElement) scrolled = target.scrollTop > 0;
  }

  /** Phones: the sheet slides up from the bottom edge. */
  function reveal(node: Element) {
    return phone.current && !reducedMotion.current
      ? fly(node, { y: "100%", duration: 260, opacity: 1 })
      : fly(node, modalContentReveal(reducedMotion.current));
  }

  function dismiss(node: Element) {
    return phone.current && !reducedMotion.current
      ? fly(node, { y: "100%", duration: 200, opacity: 1 })
      : fly(node, modalContentDismiss(reducedMotion.current));
  }
</script>

{#if open}
  <div class="modal-set">
    <button
      type="button"
      class="overlay"
      aria-label="Close dialog"
      onclick={handleOverlayClick}
      transition:fade={overlayFade(reducedMotion.current)}
    ></button>
    <div
      bind:this={contentEl}
      id="modal-content"
      class="modal-content modal-content--{size}"
      class:modal-content--bare={headers === 0}
      role="dialog"
      aria-modal="true"
      tabindex={focusDialog ? -1 : undefined}
      aria-label={ariaLabel}
      aria-labelledby={labelledBy}
      data-scrolled={scrolled ? "" : undefined}
      onscrollcapture={handleScroll}
      in:reveal
      out:dismiss
    >
      {#if showClose && headers === 0}
        <IconButton
          class="modal-content__close-icon"
          label={closeLabel}
          onclick={onclose}
        >
          <X size={20} aria-hidden="true" />
        </IconButton>
      {/if}
      {@render children()}
    </div>
  </div>
{/if}

<style>
  .modal-set {
    position: fixed;
    inset: 0;
    padding: 1.5rem;
    width: 100%;
    height: 100dvh;
    z-index: var(--z-modal, 100);
    display: flex;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
    pointer-events: auto;
  }

  /* Focused as a whole only for focusDialog; the container needs no ring. */
  .modal-content:focus {
    outline: none;
  }

  .modal-content {
    position: relative;
    box-sizing: border-box;
    width: min(35rem, calc(100vw - 3rem));
    max-height: 85dvh;
    min-height: 0;
    background-color: var(--theme-surface, #fff);
    color: var(--theme-text, hsl(0, 0%, 12%));
    z-index: inherit;
    border-radius: 1.75rem;
    padding: 0 0 0.5rem;
    display: flex;
    flex-flow: column nowrap;
    overflow: hidden;
    box-shadow: 0 12px 40px rgb(0 0 0 / 0.24);

    :global(.modal-content__close-icon) {
      position: absolute;
      right: 0.5rem;
      top: 0.5rem;
      z-index: 2;
      width: 3rem;
      height: 3rem;
      background-color: var(--theme-surface, #fff);
    }
  }

  /* Content without the shared top app bar (layers, review queue) keeps the
     inset it was laid out against. */
  .modal-content--bare {
    padding: 0.5rem;
  }

  /* Long text reads better on a slightly longer line, still capped. */
  .modal-content--wide {
    width: min(42.5rem, calc(100vw - 3rem));
  }

  /* Task surfaces take most of the screen. */
  .modal-content--large {
    width: min(72rem, calc(100vw - 3rem));
    height: min(85dvh, 56rem);
  }

  /* Phones: a full-height sheet from the bottom edge. */
  @media (max-width: 599.98px) {
    .modal-set {
      align-items: flex-end;
      padding: 0;
    }

    .modal-content {
      width: 100%;
      height: calc(100dvh - max(0.5rem, env(safe-area-inset-top, 0px)));
      max-height: none;
      border-radius: 1.75rem 1.75rem 0 0;
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }
  }

  .overlay {
    all: unset;
    width: 100%;
    height: 100%;
    inset: 0;
    position: absolute;
    /* No backdrop-filter: blurring the full-viewport WebGL map stalls the
       compositor for seconds (30s+ seen in prod), so the dialog mounts,
       blocks input, and never paints. Dim only. */
    background-color: hsla(0, 0%, 0%, 0.32);
    cursor: pointer;
  }

  .overlay:focus-visible {
    outline: 2px solid #fff;
    outline-offset: -4px;
  }
</style>
