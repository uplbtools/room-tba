<script lang="ts">
  import ExternalLink from "@lucide/svelte/icons/external-link";

  type Props = {
    href: string;
    label: string;
    class?: string;
    ariaLabel?: string;
  };

  let { href, label, class: className = "", ariaLabel = undefined }: Props =
    $props();
</script>

<a
  href={href}
  target="_blank"
  rel="noopener noreferrer"
  class="entity-footer__link {className}"
  aria-label={ariaLabel}
>
  {label}
  <ExternalLink size={14} aria-hidden="true" />
</a>

<style>
  @import "./entity-detail.css";
</style>
