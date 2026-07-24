<script lang="ts">
  import ExternalLink from "@lucide/svelte/icons/external-link";

  type Props = {
    href: string;
    label: string;
    class?: string;
    ariaLabel?: string;
    iconSrc?: string;
  };

  let {
    href,
    label,
    class: className = "",
    ariaLabel = undefined,
    iconSrc = undefined,
  }: Props = $props();
</script>

<a
  href={href}
  target="_blank"
  rel="noopener noreferrer"
  class="entity-footer__link {className}"
  aria-label={ariaLabel}
>
  {#if iconSrc}
    <img
      src={iconSrc}
      alt=""
      width="16"
      height="16"
      class="entity-footer__brand-icon"
      aria-hidden="true"
    />
  {/if}
  {label}
  <ExternalLink size={14} aria-hidden="true" />
</a>

<style>
  @import "./entity-detail.css";

  .entity-footer__brand-icon {
    width: 1rem;
    height: 1rem;
    flex: 0 0 auto;
    object-fit: contain;
  }

  .entity-footer__link--kubo {
    --kubo-primary: oklch(0.35 0.08 55);

    color: var(--kubo-primary);
    border-color: var(--kubo-primary);
  }

  .entity-footer__link--kubo:hover,
  .entity-footer__link--kubo:focus-visible {
    color: var(--kubo-primary);
    border-color: var(--kubo-primary);
    background: oklch(0.96 0.012 55);
  }

  .entity-footer__link--kubo:focus-visible {
    outline-color: var(--kubo-primary);
  }
</style>
