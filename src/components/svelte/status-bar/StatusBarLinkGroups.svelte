<script lang="ts">
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import GitFork from "@lucide/svelte/icons/git-fork";
  import CommunityBrandIcon from "@ui/community/CommunityBrandIcon.svelte";
  import MapChromeGhostButton from "@ui/map-chrome/MapChromeGhostButton.svelte";
  import type { StatusBarNavGroup } from "@constants/status-bar-links";

  type Props = {
    groups: StatusBarNavGroup[];
    onAction: (id: "contributors" | "editor-login") => void;
  };

  const { groups, onAction }: Props = $props();
</script>

{#each groups as group (group.id)}
  <div class="status-bar__nav-group" data-status-nav-group={group.id}>
    {#if group.id === "similar"}
      <details class="status-bar__similar-dropdown">
        <summary class="status-bar__similar-summary">Similar maps</summary>
        <div class="status-bar__similar-links">
          {#each group.items as item (item.id)}
            {#if item.kind === "link"}
              <a
                href={item.href}
                class="map-chrome-ghost-link status-bar__nav-link"
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
              >
                {#if item.icon === "external"}
                  <ExternalLink size={14} aria-hidden="true" />
                {/if}
                {item.label}
              </a>
            {/if}
          {/each}
        </div>
      </details>
    {:else}
      {#each group.items as item (item.id)}
        {#if item.kind === "link"}
          <a
            href={item.href}
            class="map-chrome-ghost-link status-bar__nav-link"
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noopener noreferrer" : undefined}
          >
            {#if item.icon === "external"}
              <ExternalLink size={14} aria-hidden="true" />
            {:else if item.icon === "discord"}
              <CommunityBrandIcon brand="discord" size={14} />
            {:else if item.icon === "messenger"}
              <CommunityBrandIcon brand="messenger" size={14} />
            {:else if item.icon === "version"}
              <GitFork size={14} aria-hidden="true" />
            {/if}
            {item.label}
          </a>
        {:else}
          <MapChromeGhostButton
            variant="muted"
            onclick={() => onAction(item.id)}
          >
            {item.label}
          </MapChromeGhostButton>
        {/if}
      {/each}
    {/if}
  </div>
{/each}

<style>
  .status-bar__similar-dropdown {
    position: relative;
  }

  .status-bar__similar-summary {
    list-style: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.125rem 0.375rem;
    border-radius: 0.375rem;
    font: inherit;
    font-size: 0.75rem;
    font-weight: 600;
    color: hsl(0, 0%, 28%);
  }

  .status-bar__similar-summary::-webkit-details-marker {
    display: none;
  }

  .status-bar__similar-summary::after {
    content: "▾";
    font-size: 0.6875rem;
    color: hsl(0, 0%, 45%);
  }

  .status-bar__similar-dropdown[open] .status-bar__similar-summary::after {
    content: "▴";
  }

  .status-bar__similar-summary:hover,
  .status-bar__similar-summary:focus-visible {
    background: hsl(0, 0%, 94%);
  }

  .status-bar__similar-links {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 0.25rem;
    padding: 0.375rem;
    border: 1px solid hsl(0, 0%, 88%);
    border-radius: 0.5rem;
    background: white;
    box-shadow: var(--map-chrome-panel-shadow);
  }
</style>
