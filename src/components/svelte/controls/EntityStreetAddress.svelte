<script lang="ts">
  type Props = {
    lat: number;
    lon: number;
  };

  let { lat, lon }: Props = $props();
  let address = $state<string | null>(null);

  $effect(() => {
    address = null;
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
</script>

{#if address}
  <p class="entity-street-address">{address}</p>
{/if}

<style>
  .entity-street-address {
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.4;
    color: hsl(0, 0%, 38%);
  }
</style>
