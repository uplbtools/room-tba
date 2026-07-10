<script lang="ts">
  import ImageUpload from "@ui/editor/ImageUpload.svelte";
  import { eventPlacementStore } from "@lib/store.svelte";
  import { adminAuthStore } from "@lib/stores/admin-auth.svelte";

  const draft = $derived(eventPlacementStore.draft);
  const uploadPrefix = $derived(draft ? `events/${draft.slug}` : "events");
</script>

{#if draft && adminAuthStore.isLoggedIn}
  <div class="event-placement-image">
    <ImageUpload
      inputId="event-placement-image"
      label="Event image (optional)"
      prefix={uploadPrefix}
      bind:value={draft.imageUrl}
      disabled={eventPlacementStore.creating}
    />
  </div>
{/if}

<style>
  .event-placement-image {
    position: fixed;
    right: calc(
      var(--map-ui-padding, 0.5rem) + var(--bottom-fab-inset, 3.75rem)
    );
    bottom: calc(
      var(--status-bar-block-height, 2.75rem) +
        var(--bottom-fab-gap, var(--map-ui-padding, 0.5rem)) +
        env(safe-area-inset-bottom, 0px) + 3.25rem
    );
    left: calc(
      var(--map-search-chrome-width, min(31rem, calc(100vw - 15rem))) +
        var(--map-ui-padding, 0.5rem) + var(--bottom-fab-gap, 0.5rem)
    );
    z-index: 18;
    max-width: calc(
      100% - var(--map-search-chrome-width, min(31rem, calc(100vw - 15rem))) -
        var(--map-ui-padding, 0.5rem) * 2 - var(--bottom-fab-inset, 3.75rem) -
        var(--bottom-fab-gap, 0.5rem) * 2
    );
    max-height: min(12rem, 30dvh);
    overflow: auto;
    padding: 0.625rem;
    border: 1px solid hsla(5, 53%, 32%, 0.35);
    border-radius: 0.75rem;
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(12px);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
    pointer-events: auto;
  }

  @media (max-width: 768px) {
    .event-placement-image {
      right: max(0.5rem, env(safe-area-inset-right, 0px));
      left: max(0.5rem, env(safe-area-inset-left, 0px));
      max-width: none;
      bottom: calc(
        var(--status-bar-block-height, 2.75rem) +
          var(--bottom-fab-gap, var(--map-ui-padding, 0.5rem)) +
          env(safe-area-inset-bottom, 0px) + 2.75rem
      );
    }
  }
</style>
