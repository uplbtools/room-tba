<script lang="ts">
  import MapChromeGhostButton from "./MapChromeGhostButton.svelte";
  import "./map-chrome.css";

  type Props = {
    label: string;
    compactLabel?: string;
    title?: string;
    compact?: boolean;
    onSignOut: () => void | Promise<void>;
  };

  let {
    label,
    compactLabel,
    title,
    compact = false,
    onSignOut,
  }: Props = $props();

  const displayLabel = $derived(compact && compactLabel ? compactLabel : label);
</script>

<div class="map-chrome-session">
  <span class="map-chrome-session-label" {title}>{displayLabel}</span>
  <MapChromeGhostButton onclick={() => void onSignOut()}>
    Sign out
  </MapChromeGhostButton>
</div>
