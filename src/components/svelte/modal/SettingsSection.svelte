<script lang="ts">
  import type { Snippet } from "svelte";

  /**
   * One settings card: a titled group of related controls with its own save.
   *
   * This is the shape every settings page the user already knows uses (GitHub,
   * Stripe, Vercel): a heading, a line saying what the group is for, the
   * fields, then the action for those fields in a footer of its own. Sharing
   * one component is what keeps them from drifting, which is how the account
   * modal ended up with the contributions list and the email flow both buried
   * inside the profile form.
   */
  type Props = {
    title: string;
    /** One line on what this group controls. Skip it when the title says it. */
    description?: string;
    /** Read-only facts about the section, e.g. the current email. */
    meta?: Snippet;
    children: Snippet;
    /** The action for these fields. Omitted by read-only sections. */
    footer?: Snippet;
    /** Destructive group: red frame, so it reads as a different kind of place. */
    danger?: boolean;
    labelledBy?: string;
    /**
     * `list`: a plain group of SettingsRows under a section label, the way
     * app settings screens (Material, Google Maps) read. `card` (default)
     * is the framed form group the account screen uses.
     */
    variant?: "card" | "list";
  };

  let {
    title,
    description,
    meta,
    children,
    footer,
    danger = false,
    labelledBy,
    variant = "card",
  }: Props = $props();

  const fallbackId = `settings-section-${crypto.randomUUID()}`;
  const headingId = $derived(labelledBy ?? fallbackId);
</script>

{#if variant === "list"}
  <section class="settings-list" aria-labelledby={headingId}>
    <h3 id={headingId} class="settings-list__label">{title}</h3>
    {#if description}
      <p class="settings-list__description">{description}</p>
    {/if}
    {@render children()}
  </section>
{:else}
<section
  class="settings-section"
  class:settings-section--danger={danger}
  aria-labelledby={headingId}
>
  <div class="settings-section__head">
    <h3 id={headingId} class="settings-section__title">{title}</h3>
    {#if description}
      <p class="settings-section__description">{description}</p>
    {/if}
    {#if meta}
      <div class="settings-section__meta">{@render meta()}</div>
    {/if}
  </div>

  <div class="settings-section__body entity-editor-form">
    {@render children()}
  </div>

  {#if footer}
    <div class="settings-section__footer">{@render footer()}</div>
  {/if}
</section>
{/if}

<style>
  .settings-list {
    display: flex;
    flex-direction: column;
    padding-bottom: 0.5rem;
  }

  .settings-list__label {
    margin: 0;
    padding: 1rem 1rem 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.4;
    color: var(--theme-accent-text, hsl(345, 75%, 31%));
  }

  .settings-list__description {
    margin: -0.25rem 0 0.25rem;
    padding: 0 1rem;
    font-size: 0.875rem;
    line-height: 1.4;
    color: var(--theme-text-2, hsl(0, 0%, 40%));
  }

  .settings-section {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--theme-border, hsl(0, 0%, 90%));
    border-radius: 0.625rem;
    background: var(--theme-surface, #fff);
    overflow: hidden;
  }

  .settings-section__head {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    padding: 0.875rem 1rem 0;
  }

  .settings-section__title {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 700;
    color: var(--theme-text, hsl(0, 0%, 12%));
  }

  .settings-section__description {
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.45;
    color: var(--theme-text-2, hsl(0, 0%, 42%));
  }

  .settings-section__meta {
    margin-top: 0.5rem;
    font-size: 0.8125rem;
    color: var(--theme-text, hsl(0, 0%, 30%));
  }

  .settings-section__body {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
  }

  /* A body with nothing but a meta line above it would carry dead padding. */
  .settings-section__body:empty {
    display: none;
  }

  /* Tinted and separated so the save for this group cannot be mistaken for
     the save of the group below it. */
  .settings-section__footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    border-top: 1px solid var(--theme-border, hsl(0, 0%, 92%));
    background: var(--theme-surface, hsl(0, 0%, 98%));
  }

  /* A footer snippet whose branches render nothing in the current state. */
  .settings-section__footer:empty {
    display: none;
  }

  .settings-section--danger {
    border-color: var(--theme-accent-border, #edc9c9);
  }

  .settings-section--danger .settings-section__title {
    color: var(--theme-accent-text, #8f1d1d);
  }

  .settings-section--danger .settings-section__footer {
    border-top-color: var(--theme-accent-border, #f2d5d5);
    background: var(--theme-accent-soft, #fdf7f7);
  }
</style>
