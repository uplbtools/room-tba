<script lang="ts">
  import type { Component, Snippet } from "svelte";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";

  /**
   * One settings list row, Material 3 style: 24px leading icon in a 40px
   * slot, a 16px label with optional 14px supporting line, and a trailing
   * switch or chevron. The whole row is the control, so a tap anywhere on it
   * flips the switch. A disabled row keeps showing its real state, dimmed,
   * with the reason as its supporting text.
   *
   * `children` renders under the row (sub-options such as terrain
   * exaggeration) while `expanded`.
   */
  type Props = {
    label: string;
    supporting?: string;
    icon?: Component<{ size?: number; "aria-hidden"?: boolean | "true" }>;
    /** switch: on/off (role=switch). chevron: opens a sub-screen. action: plain button. */
    kind?: "switch" | "chevron" | "action";
    checked?: boolean;
    disabled?: boolean;
    busy?: boolean;
    onclick: () => void;
    /** Show `children` (sub-options); callers tie it to the row being on. */
    expanded?: boolean;
    children?: Snippet;
  };

  let {
    label,
    supporting,
    icon: Icon,
    kind = "switch",
    checked = false,
    disabled = false,
    busy = false,
    onclick,
    expanded = true,
    children,
  }: Props = $props();

  const uid = $props.id();
  const labelId = `${uid}-label`;
  const supportingId = `${uid}-supporting`;
</script>

<div class="settings-row" class:settings-row--disabled={disabled}>
  <button
    type="button"
    class="settings-row__button"
    class:settings-row__button--tall={Boolean(supporting)}
    role={kind === "switch" ? "switch" : undefined}
    aria-checked={kind === "switch" ? checked : undefined}
    aria-labelledby={labelId}
    aria-describedby={supporting ? supportingId : undefined}
    aria-busy={busy || undefined}
    {disabled}
    {onclick}
  >
    {#if Icon}
      <span class="settings-row__icon" aria-hidden="true">
        <Icon size={24} aria-hidden="true" />
      </span>
    {/if}
    <span class="settings-row__copy">
      <span id={labelId} class="settings-row__label">{label}</span>
      {#if supporting}
        <span id={supportingId} class="settings-row__supporting">
          {supporting}
        </span>
      {/if}
    </span>
    {#if kind === "switch"}
      <span
        class="settings-row__switch"
        class:settings-row__switch--on={checked}
        aria-hidden="true"
      ></span>
    {:else if kind === "chevron"}
      <span class="settings-row__chevron" aria-hidden="true">
        <ChevronRight size={24} aria-hidden="true" />
      </span>
    {/if}
  </button>
  {#if children && expanded}
    <div class="settings-row__sub">{@render children()}</div>
  {/if}
</div>

<style>
  .settings-row {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .settings-row__button {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 1rem;
    width: 100%;
    min-width: 0;
    min-height: 3.5rem;
    padding: 0.5rem 1rem;
    cursor: pointer;
    color: var(--theme-text, hsl(0, 0%, 12%));
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }

  .settings-row__button--tall {
    min-height: 4.5rem;
  }

  .settings-row__button:hover:not(:disabled) {
    background-color: var(--theme-accent-soft, hsl(5, 30%, 96%));
  }

  /* Inset ring: the row spans the sheet edge to edge, so an outset ring
     would be clipped by the scroll container. */
  .settings-row__button:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
    outline-offset: -2px;
  }

  .settings-row__button:disabled {
    cursor: default;
  }

  .settings-row--disabled .settings-row__icon,
  .settings-row--disabled .settings-row__label,
  .settings-row--disabled .settings-row__switch {
    opacity: 0.38;
  }

  .settings-row__icon {
    display: grid;
    place-items: center;
    flex: 0 0 2.5rem;
    width: 2.5rem;
    margin-right: -0.5rem;
    color: var(--theme-text-2, hsl(0, 0%, 32%));
  }

  .settings-row__copy {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }

  .settings-row__label {
    font-size: 1rem;
    font-weight: 400;
    line-height: 1.5rem;
    overflow-wrap: anywhere;
  }

  .settings-row__supporting {
    font-size: 0.875rem;
    line-height: 1.25rem;
    color: var(--theme-text-2, hsl(0, 0%, 32%));
    overflow-wrap: anywhere;
  }

  .settings-row__chevron {
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    color: var(--theme-text-2, hsl(0, 0%, 32%));
  }

  /* Material 3 switch: 52x32 track, 16px thumb that grows to 24px when on. */
  .settings-row__switch {
    position: relative;
    flex: 0 0 auto;
    box-sizing: border-box;
    width: 3.25rem;
    height: 2rem;
    border: 2px solid var(--theme-border-strong, hsl(0, 0%, 46%));
    border-radius: 999px;
    background: var(--theme-surface-3, hsl(0, 0%, 90%));
    transition:
      background-color 0.15s ease,
      border-color 0.15s ease;
  }

  .settings-row__switch::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 0.375rem;
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    background: var(--theme-border-strong, hsl(0, 0%, 46%));
    translate: 0 -50%;
    transition:
      translate 0.15s ease,
      width 0.15s ease,
      height 0.15s ease,
      left 0.15s ease;
  }

  .settings-row__switch--on {
    border-color: var(--theme-accent-fill, hsl(5, 53%, 32%));
    background: var(--theme-accent-fill, hsl(5, 53%, 32%));
  }

  .settings-row__switch--on::after {
    left: 1.375rem;
    width: 1.5rem;
    height: 1.5rem;
    background: #fff;
  }

  .settings-row__sub {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
    padding: 0 1rem 0.75rem 4rem;
  }

  @media (prefers-reduced-motion: reduce) {
    .settings-row__switch,
    .settings-row__switch::after {
      transition: none;
    }
  }
</style>
