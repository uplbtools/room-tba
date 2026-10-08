<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import Copy from "@lucide/svelte/icons/copy";
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import { toastStore } from "@lib/store.svelte";

  type Props = {
    lat: number;
    lon: number;
  };

  let { lat, lon }: Props = $props();
  let address = $state<string | null>(null);
  let copied = $state(false);

  $effect(() => {
    address = null;
    copied = false;
    const controller = new AbortController();
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
    });
    void fetch(`/api/geocode/reverse?${params}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = (await response.json()) as { address?: string | null };
        return typeof data.address === "string" ? data.address : null;
      })
      .then((value) => {
        if (!controller.signal.aborted) address = value;
      })
      .catch(() => {
        if (!controller.signal.aborted) address = null;
      });
    return () => controller.abort();
  });

  const mapsHref = $derived(
    address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
      : null,
  );

  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      copied = true;
      toastStore.show("Address copied.", "success");
      setTimeout(() => (copied = false), 1800);
    } catch {
      toastStore.show("Could not copy the address.", "error");
    }
  }
</script>

{#if address}
  <div class="entity-street-address">
    <MapPin size={18} aria-hidden="true" class="entity-street-address__icon" />
    <p class="entity-street-address__text">{address}</p>
    <button
      type="button"
      class="entity-street-address__action"
      aria-label={copied ? "Address copied" : "Copy address"}
      title="Copy address"
      onclick={copyAddress}
    >
      {#if copied}
        <Check size={18} aria-hidden="true" />
      {:else}
        <Copy size={18} aria-hidden="true" />
      {/if}
    </button>
    {#if mapsHref}
      <a
        class="entity-street-address__action"
        href={mapsHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open address in Google Maps"
        title="Open address in Google Maps"
      >
        <ExternalLink size={18} aria-hidden="true" />
      </a>
    {/if}
  </div>
{/if}

<style>
  /* GMaps address row: pin, the address, then copy and open as icon buttons
     (40px targets, 8px between). */
  .entity-street-address {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    min-height: 3rem;
    padding: 0 0.125rem 0 0.25rem;
    border-top: 1px solid var(--theme-border, #e4e4e7);
    border-bottom: 1px solid var(--theme-border, #e4e4e7);
  }

  .entity-street-address :global(.entity-street-address__icon) {
    flex-shrink: 0;
    margin-right: 0.5rem;
    color: var(--theme-accent-text, #7b1113);
  }

  .entity-street-address__text {
    flex: 1 1 auto;
    min-width: 0;
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.35;
    color: var(--theme-text, hsl(0, 0%, 15%));
  }

  .entity-street-address__action {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--theme-text-2, hsl(0, 0%, 32%));
    cursor: pointer;
  }

  .entity-street-address__action:hover,
  .entity-street-address__action:focus-visible {
    background: var(--theme-surface-2, hsl(0, 0%, 94%));
    color: var(--theme-accent-text, #7b1113);
  }

  .entity-street-address__action:focus-visible {
    outline: 2px solid var(--theme-accent-text, #7b1113);
    outline-offset: -2px;
  }
</style>
