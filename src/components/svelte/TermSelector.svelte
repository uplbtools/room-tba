<script lang="ts">
  import { onMount } from "svelte";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import GraduationCap from "@lucide/svelte/icons/graduation-cap";
  import { termFullLabel } from "@lib/term-label";
  import { formatTermDateRange } from "@lib/term-calendar";
  import { trapFocus } from "@lib/focus-trap";
  import { portal } from "@lib/portal";
  import { mapToolsStore, termStore } from "@lib/store.svelte";
  import {
    registerEphemeralOverlayDismisser,
    openEphemeralOverlay,
  } from "@lib/overlay-stack";
  import type { TermWithCount } from "@lib/types";
  import "./map-chrome/map-chrome.css";

  type Props = {
    variant?: "chip" | "inline";
  };

  const { variant = "chip" }: Props = $props();

  let open = $state(false);
  let triggerEl = $state<HTMLButtonElement | null>(null);
  let panelEl = $state<HTMLDivElement | null>(null);
  let panelStyle = $state("");

  onMount(() => {
    termStore.init();
    const onOpenRequest = () => {
      if (!open) toggleOpen();
    };
    window.addEventListener("room-tba:open-term-picker", onOpenRequest);
    const unregisterDismiss = registerEphemeralOverlayDismisser(() => {
      open = false;
    });
    return () => {
      window.removeEventListener("room-tba:open-term-picker", onOpenRequest);
      unregisterDismiss();
    };
  });

  const active = $derived(termStore.activeTerm);

  const activeChipLabel = $derived(active ? termFullLabel(active) : "Term");

  const activeDateRange = $derived(active ? formatTermDateRange(active) : null);

  function updatePanelPosition() {
    if (!open || !triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    const width = Math.min(24 * 16, window.innerWidth - 16);
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - width - 8,
    );

    const gap = 6;
    const margin = 8;
    const panelHeight = panelEl?.offsetHeight ?? 0;

    const spaceBelow = window.innerHeight - rect.bottom - gap - margin;
    const spaceAbove = rect.top - gap - margin;

    let top: number;
    if (panelHeight > spaceBelow && spaceAbove > spaceBelow) {
      top = Math.max(margin, rect.top - gap - panelHeight);
    } else {
      top = rect.bottom + gap;
      const maxTop = window.innerHeight - margin - panelHeight;
      if (panelHeight > 0 && top > maxTop) {
        top = Math.max(margin, maxTop);
      }
    }

    panelStyle = `left: ${left}px; top: ${top}px; width: ${width}px;`;
  }

  $effect(() => {
    if (!open) return;
    updatePanelPosition();
    const handleLayout = () => updatePanelPosition();
    window.addEventListener("resize", handleLayout);
    window.addEventListener("scroll", handleLayout, true);
    return () => {
      window.removeEventListener("resize", handleLayout);
      window.removeEventListener("scroll", handleLayout, true);
    };
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

  function selectTerm(term: TermWithCount) {
    termStore.setTerm(term.id);
    closePanel();
  }

  $effect(() => {
    if (!open || !panelEl) return;
    return trapFocus(panelEl, { onEscape: closePanel });
  });

  $effect(() => {
    if (mapToolsStore.open) closePanel();
  });

  function handleDocumentPointerDown(event: PointerEvent) {
    if (!open) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (triggerEl?.contains(target)) return;
    if (panelEl?.contains(target)) return;
    closePanel();
  }
</script>

<svelte:window onpointerdown={handleDocumentPointerDown} />

{#if termStore.terms.length > 0}
  {#if variant === "inline"}
    <div
      class="term-inline"
      title={active?.label ?? "Academic term for class schedules"}
    >
      <span class="term-inline__label">
        <GraduationCap size={14} aria-hidden="true" />
        Schedule term
      </span>
      <button
        bind:this={triggerEl}
        type="button"
        class="term-inline__trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls="term-picker-inline"
        aria-label={active?.label ?? "Academic term for class schedules"}
        onclick={toggleOpen}
      >
        <span class="term-inline__trigger-label"
          >{active?.label ?? "Select term"}</span
        >
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {#if active && active.classCount > 0}
        <span class="term-inline__count"
          >{active.classCount} classes campus-wide</span
        >
      {/if}
      {#if activeDateRange}
        <span class="term-inline__dates">{activeDateRange}</span>
      {/if}
      {#if open}
        <div
          bind:this={panelEl}
          id="term-picker-inline"
          class="term-picker-panel map-chrome-popover"
          style={panelStyle}
          use:portal
          role="listbox"
          aria-label="Academic term for class schedules"
        >
          {#each termStore.terms as term (term.id)}
            {@const isActive = termStore.activeTermId === term.id}
            {@const dateRange = formatTermDateRange(term)}
            <button
              type="button"
              class="term-picker-option"
              class:term-picker-option--active={isActive}
              role="option"
              aria-selected={isActive}
              onclick={() => selectTerm(term)}
            >
              <span class="term-picker-option__copy">
                <span class="term-picker-option__label">{term.label}</span>
                {#if dateRange}
                  <span class="term-picker-option__meta">{dateRange}</span>
                {/if}
              </span>
              {#if term.classCount > 0}
                <span class="term-picker-option__count">{term.classCount}</span>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {:else}
    <div class="term-filter-chip">
      <button
        bind:this={triggerEl}
        type="button"
        class="term-filter-chip__button map-chrome-chip"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls="term-picker-chip"
        aria-label={active?.label ?? "Academic term for class schedules"}
        title={active?.label ?? "Academic term for class schedules"}
        onclick={toggleOpen}
      >
        <GraduationCap size={14} aria-hidden="true" />
        <span class="term-filter-chip__label">{activeChipLabel}</span>
        <ChevronDown
          size={14}
          class="term-filter-chip__chevron"
          aria-hidden="true"
        />
      </button>
      {#if open}
        <div
          bind:this={panelEl}
          id="term-picker-chip"
          class="term-picker-panel map-chrome-popover"
          style={panelStyle}
          use:portal
          role="listbox"
          aria-label="Academic term for class schedules"
        >
          {#each termStore.terms as term (term.id)}
            {@const isActive = termStore.activeTermId === term.id}
            {@const dateRange = formatTermDateRange(term)}
            <button
              type="button"
              class="term-picker-option"
              class:term-picker-option--active={isActive}
              role="option"
              aria-selected={isActive}
              onclick={() => selectTerm(term)}
            >
              <span class="term-picker-option__copy">
                <span class="term-picker-option__label">{term.label}</span>
                {#if dateRange}
                  <span class="term-picker-option__meta">{dateRange}</span>
                {/if}
              </span>
              {#if term.classCount > 0}
                <span class="term-picker-option__count">{term.classCount} {term.classCount === 1 ? "class" : "classes"}</span>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
{/if}

<style>
  .term-filter-chip {
    position: relative;
    flex: 0 0 auto;
    min-width: 0;
    max-width: min(100%, 15rem);
    margin-top: 0vh;
  }

  .term-filter-chip__button {
    cursor: pointer;
    max-width: 100%;
  }
  .term-filter-chip__button:focus-visible,
  .term-inline__trigger:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: -2px; /* chips row clips outward rings */
  }

  .term-filter-chip__label {
    max-width: 11rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .term-filter-chip__chevron {
    flex: 0 0 auto;
    opacity: 0.72;
  }

  .term-inline {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.625rem;
    border: 1px solid hsl(5, 53%, 88%);
    border-radius: 0.5rem;
    background: hsl(5, 53%, 98%);
  }

  .term-inline__label {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: hsl(5, 53%, 32%);
    white-space: nowrap;
  }

  .term-inline__trigger {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    flex: 1 1 12rem;
    min-width: 0;
    max-width: 100%;
    padding: 0.3125rem 0.5rem;
    border: 1px solid hsl(0, 0%, 82%);
    border-radius: 0.375rem;
    background: white;
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    color: hsl(0, 0%, 16%);
    cursor: pointer;
    text-align: left;
  }

  .term-inline__trigger-label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .term-inline__count {
    font-size: 0.75rem;
    font-weight: 600;
    color: hsl(0, 0%, 42%);
    white-space: nowrap;
  }

  .term-inline__dates {
    flex-basis: 100%;
    font-size: 0.6875rem;
    font-weight: 600;
    color: hsl(0, 0%, 45%);
  }

  .term-picker-panel {
    position: fixed;
    z-index: var(--z-chrome-popover, 17);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.375rem;
    max-height: min(16rem, calc(100vh - 6rem));
    overflow-x: visible;
    overflow-y: auto;
  }

  .term-picker-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.625rem;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: 0.5rem 0.625rem;
    border: 1px solid transparent;
    border-radius: 0.625rem;
    background: hsl(0, 0%, 98%);
    cursor: pointer;
    text-align: left;
    font: inherit;
    transition:
      background-color 0.15s ease,
      border-color 0.15s ease;
  }

  .term-picker-option:hover,
  .term-picker-option:focus-visible {
    border-color: hsl(5, 40%, 72%);
    background-color: hsl(5, 53%, 98%);
  }

  .term-picker-option--active {
    border-color: hsl(5, 53%, 32%);
    background-color: hsl(5, 53%, 96%);
    color: hsl(5, 53%, 22%);
  }

  .term-picker-option__copy {
    display: flex;
    min-width: 0;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0.125rem;
  }

  .term-picker-option__label {
    font-size: 0.8125rem;
    font-weight: 700;
    line-height: 1.2;
    white-space: normal;
    overflow: visible;
  }

  .term-picker-option__meta {
    font-size: 0.6875rem;
    font-weight: 600;
    color: hsl(0, 0%, 45%);
  }

  .term-picker-option__count {
    flex: 0 0 auto;
    font-size: 0.6875rem;
    font-weight: 700;
    color: hsl(0, 0%, 42%);
    white-space: nowrap;
    text-align: right;
  }

  .term-picker-option--active .term-picker-option__count,
  .term-picker-option--active .term-picker-option__meta {
    color: hsl(5, 53%, 32%);
  }
</style>
