<script lang="ts" generics="T extends string | number">
  /**
   * Material 3 segmented button for 2 or 3 exclusive choices: a 44px
   * radiogroup with a check on the selected segment. Arrow keys move the
   * selection (roving tabindex), the way a native radio group behaves.
   */
  type Props = {
    options: readonly { value: T; label: string }[];
    value: T | null;
    onchange: (value: T) => void;
    ariaLabel?: string;
    labelledBy?: string;
    disabled?: boolean;
  };

  let {
    options,
    value,
    onchange,
    ariaLabel,
    labelledBy,
    disabled = false,
  }: Props = $props();

  let groupEl = $state<HTMLDivElement | null>(null);

  const focusIndex = $derived(
    Math.max(
      0,
      options.findIndex((option) => option.value === value),
    ),
  );

  function handleKeydown(event: KeyboardEvent) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (step === 0 || options.length === 0) return;
    event.preventDefault();
    const next = options[(focusIndex + step + options.length) % options.length];
    if (!next) return;
    onchange(next.value);
    queueMicrotask(() => {
      groupEl
        ?.querySelector<HTMLButtonElement>('[aria-checked="true"]')
        ?.focus();
    });
  }
</script>

<div
  bind:this={groupEl}
  class="segmented"
  role="radiogroup"
  aria-label={ariaLabel}
  aria-labelledby={labelledBy}
  aria-disabled={disabled || undefined}
  tabindex="-1"
  onkeydown={handleKeydown}
>
  {#each options as option, i (option.value)}
    {@const selected = option.value === value}
    <button
      type="button"
      role="radio"
      class="segmented__option"
      aria-checked={selected}
      tabindex={i === focusIndex ? 0 : -1}
      {disabled}
      onclick={() => onchange(option.value)}
    >
      {#if selected}
        <svg
          class="segmented__check"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          aria-hidden="true"
        >
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            fill="none"
            stroke="currentColor"
            stroke-width="2.25"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      {/if}
      <span class="segmented__label">{option.label}</span>
    </button>
  {/each}
</div>

<style>
  .segmented {
    display: flex;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    border: 1px solid var(--theme-border-strong, hsl(0, 0%, 46%));
    border-radius: 999px;
    overflow: hidden;
  }

  .segmented:focus {
    outline: none;
  }

  .segmented__option {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    flex: 1 1 0;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    min-width: 0;
    min-height: 2.75rem;
    padding: 0 0.75rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--theme-text, hsl(0, 0%, 12%));
    cursor: pointer;
    text-align: center;
    -webkit-tap-highlight-color: transparent;
  }

  .segmented__option + .segmented__option {
    border-left: 1px solid var(--theme-border-strong, hsl(0, 0%, 46%));
  }

  @media (hover: hover) {
    .segmented__option:hover:not(:disabled) {
      background-color: var(--theme-accent-soft, hsl(5, 30%, 96%));
    }
  }

  .segmented__option[aria-checked="true"] {
    background-color: var(--theme-accent-soft, hsl(5, 45%, 92%));
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
  }

  .segmented__option:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
    outline-offset: -3px;
  }

  .segmented__option:disabled {
    cursor: default;
    opacity: 0.38;
  }

  .segmented__check {
    flex: 0 0 auto;
  }

  .segmented__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
