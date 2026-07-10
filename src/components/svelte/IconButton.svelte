<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";

  // Shared icon-only button: the close-X-with-hover-circle / hover-rounded-
  // rect pattern that was hand-rolled across modals, panels, and toasts.
  let {
    label,
    shape = "circle",
    size = "md",
    class: klass = "",
    children,
    ...rest
  }: {
    label: string;
    /** circle = hover disc (close X); rounded = hover rounded rect (tools). */
    shape?: "circle" | "rounded";
    size?: "sm" | "md";
    class?: string;
    children: Snippet;
  } & HTMLButtonAttributes = $props();
</script>

<button
  type="button"
  class="icon-btn icon-btn--{shape} icon-btn--{size} {klass}"
  aria-label={label}
  title={label}
  {...rest}
>
  {@render children()}
</button>

<style>
  .icon-btn {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: hsl(0, 0%, 30%);
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .icon-btn--sm {
    width: 1.75rem;
    height: 1.75rem;
  }

  .icon-btn--md {
    width: 2.25rem;
    height: 2.25rem;
  }

  .icon-btn--circle {
    border-radius: 999px;
  }

  .icon-btn--rounded {
    border-radius: 0.5rem;
  }

  .icon-btn:hover,
  .icon-btn:focus-visible {
    background-color: hsla(0, 0%, 0%, 0.08);
    color: hsl(0, 0%, 12%);
  }

  .icon-btn:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 1px;
  }

  .icon-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>
