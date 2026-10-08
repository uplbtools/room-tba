<script lang="ts">
  import type { Snippet } from "svelte";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import ExternalLink from "@lucide/svelte/icons/external-link";

  /**
   * One list row, the same everywhere a settings or menu screen lists
   * things: 56px tall (72 with supporting text), a 24px leading icon in a
   * 40px slot, a 16px label with an optional 14px muted line under it, and
   * one trailing affordance (value + chevron, a switch, or a custom
   * control). The whole row is the target.
   *
   * It renders as a link with `href`, a switch with `checked`, a button with
   * `onclick`, and a plain row otherwise (a row that only holds a control).
   */
  type Props = {
    label: string;
    supporting?: string;
    /** Id for the supporting line, so a control can point at it. */
    supportingId?: string;
    /** A lucide icon component. */
    icon?: typeof ChevronRight;
    /** Custom leading content (an avatar) in place of `icon`. */
    leading?: Snippet;
    href?: string;
    /** Opens in a new tab with a trailing external-link icon. */
    external?: boolean;
    /** Same-tab link that downloads or leaves the app (no chevron). */
    download?: boolean;
    onclick?: () => void;
    /** Trailing value text, e.g. the current choice or the version. */
    value?: string;
    /** Trailing chevron: the row opens a screen. */
    chevron?: boolean;
    /** Renders the row as a switch. */
    checked?: boolean;
    disabled?: boolean;
    /** Destructive action: red label. */
    danger?: boolean;
    badge?: number;
    current?: boolean;
    keyshortcuts?: string;
    describedby?: string;
    class?: string;
    /** Custom trailing control (a text button) for a plain row. */
    trailing?: Snippet;
  };

  let {
    label,
    supporting,
    supportingId,
    icon: Icon,
    leading,
    href,
    external = false,
    download = false,
    onclick,
    value,
    chevron = false,
    checked,
    disabled = false,
    danger = false,
    badge,
    current = false,
    keyshortcuts,
    describedby,
    class: klass = "",
    trailing,
  }: Props = $props();

  const isSwitch = $derived(checked !== undefined);
  // The accessible name is the label alone; the supporting line describes.
  const uid = $props.id();
  const labelId = `${uid}-label`;
  const supportId = $derived(supportingId ?? `${uid}-supporting`);
  const labelledby = $derived(supporting && !external ? labelId : undefined);
  const description = $derived(
    describedby ?? (supporting ? supportId : undefined),
  );
</script>

{#snippet body()}
  {#if leading}
    <span class="settings-row__leading" aria-hidden="true">{@render leading()}</span>
  {:else if Icon}
    <span class="settings-row__leading" aria-hidden="true">
      <Icon size={24} aria-hidden="true" />
    </span>
  {/if}
  <span class="settings-row__text">
    <span id={labelId} class="settings-row__label">
      {label}
      {#if badge && badge > 0}
        <span class="settings-row__badge">{badge}</span>
      {/if}
    </span>
    {#if supporting}
      <span id={supportId} class="settings-row__supporting">{supporting}</span>
    {/if}
  </span>
  {#if value}
    <span class="settings-row__value">{value}</span>
  {/if}
  {#if isSwitch}
    <span class="settings-row__switch" aria-hidden="true"></span>
  {:else if external}
    <ExternalLink class="settings-row__trailing-icon" size={18} aria-hidden="true" />
  {:else if chevron}
    <ChevronRight class="settings-row__trailing-icon" size={20} aria-hidden="true" />
  {/if}
{/snippet}

{#if href}
  <a
    class="settings-row {klass}"
    class:settings-row--two-line={!!supporting}
    class:settings-row--danger={danger}
    {href}
    target={external ? "_blank" : undefined}
    rel={external ? "noopener noreferrer" : undefined}
    download={download ? "" : undefined}
    aria-label={external ? `${label} (opens in new tab)` : undefined}
    aria-current={current ? "page" : undefined}
    aria-labelledby={labelledby}
    aria-describedby={description}
    {onclick}
  >
    {@render body()}
  </a>
{:else if isSwitch || onclick}
  <button
    type="button"
    class="settings-row {klass}"
    class:settings-row--two-line={!!supporting}
    class:settings-row--danger={danger}
    role={isSwitch ? "switch" : undefined}
    aria-checked={isSwitch ? checked : undefined}
    aria-current={current ? "page" : undefined}
    aria-keyshortcuts={keyshortcuts}
    aria-labelledby={labelledby}
    aria-describedby={description}
    {disabled}
    {onclick}
  >
    {@render body()}
  </button>
{:else}
  <div
    class="settings-row settings-row--static {klass}"
    class:settings-row--two-line={!!supporting}
    class:settings-row--danger={danger}
  >
    {@render body()}
    {#if trailing}
      <span class="settings-row__control">{@render trailing()}</span>
    {/if}
  </div>
{/if}

<style>
  .settings-row {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 1rem;
    width: 100%;
    min-height: 3.5rem;
    margin: 0;
    padding: 0.5rem 1rem;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--theme-text, hsl(0, 0%, 12%));
    font: inherit;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
  }

  .settings-row--two-line {
    min-height: 4.5rem;
  }

  .settings-row--static {
    cursor: default;
  }

  @media (hover: hover) {
    a.settings-row:hover,
    button.settings-row:hover:not(:disabled) {
      background: var(--theme-accent-soft, hsl(5, 25%, 96%));
    }
  }

  a.settings-row:active,
  button.settings-row:active:not(:disabled) {
    background: var(--theme-accent-soft, hsl(5, 25%, 94%));
  }

  .settings-row[aria-current="page"] {
    background: var(--theme-accent-soft, #feeaea);
    color: var(--theme-accent-text, #8d1437);
  }

  .settings-row:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(345, 75%, 31%));
    outline-offset: -2px;
  }

  /* Real state at 38% so a disabled switch still says on or off. */
  .settings-row:disabled {
    cursor: default;
  }

  .settings-row:disabled > :not(.settings-row__text),
  .settings-row:disabled .settings-row__label {
    opacity: 0.38;
  }

  .settings-row__leading {
    display: inline-flex;
    flex: 0 0 1.5rem;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    margin-right: 0.5rem;
    color: var(--theme-text-2, hsl(0, 0%, 35%));
  }

  .settings-row__text {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }

  .settings-row__label {
    font-size: 1rem;
    font-weight: 400;
    line-height: 1.5;
  }

  .settings-row__supporting {
    font-size: 0.875rem;
    line-height: 1.4;
    color: var(--theme-text-2, hsl(0, 0%, 40%));
  }

  .settings-row--danger .settings-row__label,
  .settings-row--danger .settings-row__leading {
    color: var(--theme-danger-text, #b3261e);
  }

  .settings-row__value {
    flex-shrink: 0;
    font-size: 0.875rem;
    color: var(--theme-text-2, hsl(0, 0%, 40%));
  }

  .settings-row :global(.settings-row__trailing-icon) {
    flex-shrink: 0;
    color: var(--theme-text-2, hsl(0, 0%, 45%));
  }

  .settings-row__control {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0.5rem;
  }

  .settings-row__badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.25rem;
    margin-left: 0.375rem;
    padding: 0 0.375rem;
    border-radius: 999px;
    background: var(--theme-accent-fill, hsl(5, 53%, 32%));
    color: white;
    font-size: 0.75rem;
    font-weight: 700;
    line-height: 1.25rem;
    vertical-align: 1px;
  }

  /* Material switch: 52x32 track, thumb grows when on. */
  .settings-row__switch {
    position: relative;
    flex: 0 0 3.25rem;
    width: 3.25rem;
    height: 2rem;
    box-sizing: border-box;
    border: 2px solid var(--theme-border-strong, hsl(0, 0%, 47%));
    border-radius: 999px;
    background: var(--theme-surface-3, hsl(0, 0%, 92%));
    transition: background-color 0.15s ease;
  }

  .settings-row__switch::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 0.375rem;
    width: 1rem;
    height: 1rem;
    border-radius: 999px;
    background: var(--theme-border-strong, hsl(0, 0%, 47%));
    translate: 0 -50%;
    transition:
      left 0.15s ease,
      width 0.15s ease,
      height 0.15s ease;
  }

  .settings-row[aria-checked="true"] .settings-row__switch {
    border-color: var(--theme-accent-fill, hsl(345, 75%, 31%));
    background: var(--theme-accent-fill, hsl(345, 75%, 31%));
  }

  .settings-row[aria-checked="true"] .settings-row__switch::after {
    left: 1.375rem;
    width: 1.5rem;
    height: 1.5rem;
    background: #fff;
  }
</style>
