<script lang="ts">
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import Globe from "@lucide/svelte/icons/globe";
  import Trophy from "@lucide/svelte/icons/trophy";
  import Users from "@lucide/svelte/icons/users";
  import CommunityBrandIcon from "@ui/community/CommunityBrandIcon.svelte";
  import type {
    StatusBarNavGroup,
    StatusBarActionItem,
  } from "@constants/status-bar-links";

  type Props = {
    groups: StatusBarNavGroup[];
    onAction: (id: StatusBarActionItem["id"]) => void;
  };

  const { groups, onAction }: Props = $props();
</script>

<!-- One row style for every entry (actions and links alike), shared with the
     App menu's own rows. External links carry the same trailing icon so they
     read as "leaves the app" without per-brand guesswork. -->
{#each groups as group (group.id)}
  <div class="status-bar__nav-group" data-status-nav-group={group.id}>
    {#if group.label}
      <p class="status-bar__nav-label">{group.label}</p>
    {/if}
    {#each group.items as item (item.id)}
      {#if item.kind === "link"}
        <a
          href={item.href}
          class="app-menu__nav-action status-bar__nav-link"
          target={item.external ? "_blank" : undefined}
          rel={item.external ? "noopener noreferrer" : undefined}
          aria-label={item.external
            ? `${item.label} (opens in new tab)`
            : undefined}
        >
          {#if item.icon === "discord" || item.icon === "messenger"}
            <CommunityBrandIcon brand={item.icon} size={18} />
          {:else}
            <Globe size={18} aria-hidden="true" />
          {/if}
          <span>{item.label}</span>
          {#if item.external}
            <ExternalLink
              class="status-bar__nav-external"
              size={14}
              aria-hidden="true"
            />
          {/if}
        </a>
      {:else}
        <button
          type="button"
          class="app-menu__nav-action"
          onclick={() => onAction(item.id)}
        >
          {#if item.id === "leaderboard"}
            <Trophy size={18} aria-hidden="true" />
          {:else}
            <Users size={18} aria-hidden="true" />
          {/if}
          <span>{item.label}</span>
        </button>
      {/if}
    {/each}
  </div>
{/each}

<style>
  .status-bar__nav-group {
    display: flex;
    flex-direction: column;
  }

  .status-bar__nav-label {
    margin: 0.375rem 0.75rem 0.125rem;
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--theme-text-2, hsl(0, 0%, 40%));
  }

  .status-bar__nav-link :global(.status-bar__nav-external) {
    flex-shrink: 0;
    margin-left: auto;
    color: var(--theme-text-2, hsl(0, 0%, 45%));
  }
</style>
