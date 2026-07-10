<script lang="ts">
  import LogOut from "@lucide/svelte/icons/log-out";
  import Settings from "@lucide/svelte/icons/settings";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import { adminAuthStore } from "@lib/stores/admin-auth.svelte";
  import MapChromeGhostButton from "./MapChromeGhostButton.svelte";
  import "./map-chrome.css";

  type Props = {
    roleLabel: string;
    displayName: string;
    title?: string;
    /** Icon + role chip for the collapsed status strip. */
    compact?: boolean;
    /** Chip + sign out inline in the expanded utilities row. */
    utilities?: boolean;
    /** Full signed-in row with sign out (status drawer expanded). */
    expanded?: boolean;
    onSignOut: () => void | Promise<void>;
  };

  let {
    roleLabel,
    displayName,
    title,
    compact = false,
    utilities = false,
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
{:else if utilities}
  <span class="map-chrome-session map-chrome-session--utilities">
    <span class="map-chrome-session-chip" title={signedInTitle}>
      <ShieldCheck size={14} aria-hidden="true" />
      <span>{roleLabel}</span>
    </span>
    <MapChromeGhostButton onclick={() => adminAuthStore.openAccountSettings()}>
      <Settings size={14} aria-hidden="true" />
      Account
    </MapChromeGhostButton>
    <MapChromeGhostButton onclick={() => void onSignOut()}>
      <LogOut size={14} aria-hidden="true" />
      Sign out
    </MapChromeGhostButton>
  </span>
{:else if expanded}
  <div class="map-chrome-session-expanded">
    <div class="map-chrome-session-expanded-label">
      <ShieldCheck size={16} aria-hidden="true" />
      <span>{expandedLabel}</span>
    </div>
    <MapChromeGhostButton onclick={() => adminAuthStore.openAccountSettings()}>
      <Settings size={14} aria-hidden="true" />
      Account
    </MapChromeGhostButton>
    <MapChromeGhostButton onclick={() => void onSignOut()}>
      <LogOut size={14} aria-hidden="true" />
      Sign out
    </MapChromeGhostButton>
  </div>
{/if}

<style>
  .map-chrome-session--utilities {
    gap: 0.25rem;
  }

  .map-chrome-session--utilities :global(.map-chrome-ghost-btn) {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: hsl(0, 70%, 38%);
    font-size: 0.75rem;
    padding: 0.0625rem 0.25rem;
  }
</style>
