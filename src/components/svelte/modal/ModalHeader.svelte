<script lang="ts">
  import type { Snippet } from "svelte";

  /**
   * Title row for a registry modal. Dialog already pins the close X to the
   * top-right corner; this reserves its column and centres the title on it,
   * so every tool screen opens with the same bold title, the same side
   * padding, and the X on the title's line instead of floating above it.
   */
  type Props = {
    title: string;
    /** Heading id, for the registry's `labelledBy`. */
    id?: string;
    /** One muted line under the title. */
    description?: string;
    /** Inline actions under the title (e.g. a secondary button). */
    actions?: Snippet;
  };

  let { title, id, description, actions }: Props = $props();
</script>

<header class="modal-header">
  <h2 {id} class="modal-header__title">{title}</h2>
  {#if description}
    <p class="modal-header__description">{description}</p>
  {/if}
  {#if actions}
    <div class="modal-header__actions">{@render actions()}</div>
  {/if}
</header>

<style>
  .modal-header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex-shrink: 0;
    /* Right padding clears Dialog's 2.25rem close button at right: 0.25rem. */
    padding: 0.375rem 2.75rem 0.25rem 0.5rem;
  }

  .modal-header__title {
    margin: 0;
    min-height: 2rem;
    display: flex;
    align-items: center;
    font-size: 1.0625rem;
    font-weight: 700;
    line-height: 1.25;
    color: hsl(0, 0%, 12%);
  }

  .modal-header__description {
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.4;
    color: hsl(0, 0%, 40%);
  }

  .modal-header__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }
</style>
