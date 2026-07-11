<script lang="ts">
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
        hard: boolean;
      } & HTMLButtonAttributes)
  ) & {
    children: Snippet;
    tooltip: string;
  };

  const props: Props = $props();
</script>

{#if "href" in props}
{@const {href, tooltip, children, ...rest} = props}
  <a class="nav-link" target="_blank" href={href} {...rest}>
    <div class="tooltip">
      {tooltip}
    </div>
    {@render children()}
  </a>
{:else}
    {@const {active, hard, tooltip, children, ...rest} = props}
  <button
    class="nav-link"
    class:nav-link--soft-active={!hard && active}
    class:nav-link--hard-active={hard && active}
    {...rest}
  >
    <div class="tooltip">
      {tooltip}
    </div>
    {@render children()}
  </button>
{/if}

<style>
  .nav-link {
    position: relative;
    padding: 0.75rem;
    display: flex;
    color: hsl(0, 0%, 20%);
    border-radius: 0.5rem;
    transition: 75ms ease-in-out;
    justify-content: center;
    &:hover:not(.nav-link--soft-active, .nav-link--hard-active) {
      background-color: hsl(0, 0%, 90%);
    }
    .tooltip {
      position: absolute;
      top: 50%;
      left: 100%;
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
      transition:opacity .125s;
    }
    &:hover .tooltip {
      opacity: 1;
    }
  }
  .nav-link--soft-active {
    color: hsl(5, 53%, 32%);
    background-color: hsl(5, 53%, 96%);
  }
  .nav-link--hard-active {
    background-color: hsl(5, 53%, 32%);
    color: hsl(5, 53%, 96%);
  }
</style>
