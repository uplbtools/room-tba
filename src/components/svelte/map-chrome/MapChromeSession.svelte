<script lang="ts">
  import LogOut from "@lucide/svelte/icons/log-out";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import MapChromeGhostButton from "./MapChromeGhostButton.svelte";
  import "./map-chrome.css";

  type Props = {
    roleLabel: string;
    displayName: string;
    title?: string;
    /** Icon + role chip for the collapsed status strip. */
    compact?: boolean;
    /** Full signed-in row with sign out (status drawer expanded). */
    expanded?: boolean;
    onSignOut: () => void | Promise<void>;
  };

  let {
    roleLabel,
    displayName,
    title,
    compact = false,
    expanded = false,
    onSignOut,
  }: Props = $props();

  const signedInTitle = $derived(
    title ?? `Signed in as ${roleLabel.toLowerCase()}`,
  );
  const expandedLabel = $derived.by(() => {
    const name = displayName.trim();
    if (!name || name.toLowerCase() === roleLabel.toLowerCase()) {
      return `Signed in as ${roleLabel.toLowerCase()}`;
    }
    return `Signed in as ${roleLabel.toLowerCase()} (${name})`;
  });
</script>

{#if compact}
  <span class="map-chrome-session-chip" title={signedInTitle}>
    <ShieldCheck size={14} aria-hidden="true" />
    <span>{roleLabel}</span>
  </span>
{:else if expanded}
  <div class="map-chrome-session-expanded">
    <div class="map-chrome-session-expanded-label">
      <ShieldCheck size={16} aria-hidden="true" />
      <span>{expandedLabel}</span>
    </div>
    <MapChromeGhostButton onclick={() => void onSignOut()}>
      <LogOut size={14} aria-hidden="true" />
      Sign out
    </MapChromeGhostButton>
  </div>
{/if}
