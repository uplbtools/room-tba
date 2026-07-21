<script lang="ts">
  import type { Snippet } from "svelte";

  type Props = {
    title: string;
    description?: string;
    /** Decorative illustration; mark SVG/icons aria-hidden inside the snippet. */
    icon?: Snippet;
    /** Optional next-step control (button/link). */
    action?: Snippet;
  };

  let { title, description, icon, action }: Props = $props();
</script>

<div class="entity-empty-state" role="status">
  {#if icon}
    <div class="entity-empty-state__art">
      {@render icon()}
    </div>
  {/if}
  <h3 class="entity-empty-state__title">{title}</h3>
  {#if description}
    <p class="entity-empty-state__body">{description}</p>
  {/if}
  {#if action}
    <div class="entity-empty-state__action">
      {@render action()}
    </div>
  {/if}
</div>

<style>
  @import "./entity-detail.css";
</style>
