<script lang="ts">
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import GitFork from "@lucide/svelte/icons/git-fork";
  import MessageCircle from "@lucide/svelte/icons/message-circle";
  import MessagesSquare from "@lucide/svelte/icons/messages-square";
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
            <MessagesSquare size={14} aria-hidden="true" />
          {:else if item.icon === "messenger"}
            <MessageCircle size={14} aria-hidden="true" />
          {:else if item.icon === "version"}
            <GitFork size={14} aria-hidden="true" />
          {/if}
          {item.label}
        </a>
      {:else}
        <MapChromeGhostButton variant="muted" onclick={() => onAction(item.id)}>
          {item.label}
        </MapChromeGhostButton>
      {/if}
    {/each}
  </div>
{/each}
