<script lang="ts">
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import type { Snippet } from "svelte";
  import type {
    HTMLAnchorAttributes,
    HTMLButtonAttributes,
  } from "svelte/elements";

  type Props = (
    | ({
        href: string;
      } & HTMLAnchorAttributes)
    | ({
        active: boolean;
      } & HTMLButtonAttributes)
  ) & {
    children: Snippet;
    tooltip: string;
    /** Inline-label mode: tooltip text sits beside the icon, popup disabled. */
    expanded?: boolean;
    sublink?: boolean;
  };

  const props: Props = $props();

  // The aside scrolls (overflow-y: auto), which clips absolutely positioned
  // tooltips. Fixed positioning escapes the clip; anchor it to the hovered
  // element's rect via CSS vars.
  function placeTooltip(event: Event) {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--tooltip-x", `${rect.right + 8}px`);
    el.style.setProperty("--tooltip-y", `${rect.top + rect.height / 2}px`);
  }
</script>

{#if "href" in props}
  {@const { href, tooltip, expanded, children, ...rest } = props}
  {@const isExternal = /^https?:\/\//.test(href)}
  <a
    class="nav-link"
    class:nav-link--expanded={expanded}
    target={isExternal ? "_blank" : undefined}
    rel={isExternal ? "noopener noreferrer" : undefined}
    {href}
    {...rest}
    onmouseenter={placeTooltip}
    onfocus={placeTooltip}
  >
    <div class="tooltip">
      {tooltip}
    </div>
    {@render children()}
    {#if expanded && isExternal}
      <span class="external-hint" aria-hidden="true">
        <ExternalLink size={12} />
      </span>
    {/if}
  </a>
{:else}
  {@const { active, tooltip, expanded, children, sublink, ...rest } = props}
  <button
    class="nav-link"
    class:nav-link--expanded={expanded}
    class:nav-link--hard-active={!sublink && active}
    class:nav-link--sublink-active={sublink && active}
    {...rest}
    onmouseenter={placeTooltip}
    onfocus={placeTooltip}
  >
    <div class="tooltip">
      {tooltip}
    </div>
    <div class="icon">
      {@render children()}
    </div>
  </button>
{/if}

<style>
  .nav-link {
    position: relative;
    padding: 0.5rem 0rem;
    display: flex;
    align-items: center;
    color: hsl(0, 0%, 40%);
    border-radius: 0.5rem;
    transition: 75ms ease-in-out;
    justify-content: center;
    font-weight: 600;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    &:hover:not(.nav-link--sublink-active, .nav-link--hard-active) {
      background-color: hsl(0, 0%, 90%);
    }
    .tooltip {
      position: fixed;
      top: var(--tooltip-y, 50%);
      left: var(--tooltip-x, 100%);
      translate: 0% -50%;
      background-color: black;
      color: white;
      border-radius: 1rem;
      padding: 0.25rem 0.5rem;
      pointer-events: none;
      opacity: 0;
      z-index: 999;
      width: max-content;
      font-size: 0.75rem;
      transition: opacity 0.125s;
    }
    .icon {
      color: hsl(0, 0%, 50%);
    }
    &:hover .tooltip {
      opacity: 1;
    }
  }
  .nav-link--expanded {
    width: 100%;
    box-sizing: border-box;
    justify-content: flex-start;
    gap: 0.5rem;
    padding: 0.5rem;
    &:hover:not(.nav-link--sublink-active, .nav-link--hard-active) {
        color: hsl(0, 0%, 20%);
    }
    .tooltip,
    &:hover .tooltip {
      /* Tooltip doubles as the inline label; no popup in this mode. */
      position: static;
      translate: none;
      opacity: 1;
      background: none;
      color: inherit;
      border-radius: 0;
      padding: 0;
      width: auto;
      font-size: 0.8125rem;
      text-align: left;
      order: 1;
      transition: none;
    }
  }
  .external-hint {
    display: inline-flex;
    order: 2;
    margin-left: auto;
    color: hsl(0, 0%, 55%);
  }

  .nav-link--sublink-active {
    color: hsl(5, 53%, 32%);
    background-color: hsl(5, 53%, 96%);

    &.nav-link--expanded {
      border-left: 8px solid hsl(5, 53%, 32%);
    }
    .icon {
      color: hsl(5, 53%, 32%);
    }
  }
  .nav-link--hard-active {
    background-color: hsl(5, 53%, 32%);
    color: hsl(5, 53%, 96%);
    .icon {
      color: hsl(5, 53%, 96%);
    }
  }
</style>
