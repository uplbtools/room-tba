<script lang="ts">
  import { portal } from "@lib/portal";
  import { entityHoverPreviewStore } from "@lib/entity-hover-preview.svelte";

  const preview = $derived(entityHoverPreviewStore.entity);
  const anchor = $derived(entityHoverPreviewStore.anchor);

  const style = $derived.by(() => {
    if (!anchor) return "display: none;";
    const left = Math.min(anchor.x + 12, window.innerWidth - 240);
    const top = Math.max(8, anchor.y - 8);
    return `left: ${left}px; top: ${top}px;`;
  });

  const buildingBadge = $derived(
    preview?.kind === "building"
      ? preview.buildingType === "admin"
        ? "Administrative building"
        : preview.buildingType === "non-admin"
          ? "Class building"
          : null
      : null,
  );
</script>

{#if preview && anchor}
  <div class="entity-hover-preview" {style} role="tooltip" use:portal>
    {#if preview.kind === "event" && preview.imageUrl}
      <img
        class="entity-hover-preview__image"
        src={preview.imageUrl}
        alt=""
        loading="lazy"
      />
    {/if}
    <div class="entity-hover-preview__body">
      <p class="entity-hover-preview__title">
        {preview.kind === "building" ? preview.name : preview.title}
      </p>
      {#if preview.kind === "building" && buildingBadge}
        <p class="entity-hover-preview__meta">{buildingBadge}</p>
      {:else if preview.kind === "event" && preview.category}
        <p class="entity-hover-preview__meta">{preview.category}</p>
      {/if}
      {#if preview.kind === "building" && preview.directions}
        <p class="entity-hover-preview__hint">
          {preview.directions.slice(0, 120)}{preview.directions.length > 120
            ? "…"
            : ""}
        </p>
      {:else if preview.kind === "event"}
        <p class="entity-hover-preview__hint">Tap to open event details</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .entity-hover-preview {
    position: fixed;
    z-index: var(--z-chrome-popover, 17);
    width: min(14rem, calc(100vw - 16px));
    border: 1px solid var(--map-chrome-border, hsl(5 10% 68%));
    border-radius: 0.625rem;
    background: var(--map-chrome-panel-bg, hsl(5 18% 96%));
    box-shadow: var(--map-chrome-panel-shadow);
    pointer-events: none;
    overflow: hidden;
  }

  .entity-hover-preview__image {
    display: block;
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    background: hsl(0, 0%, 92%);
  }

  .entity-hover-preview__body {
    padding: 0.5rem 0.625rem;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .entity-hover-preview__title {
    margin: 0;
    font-size: 0.8125rem;
    font-weight: 700;
    line-height: 1.25;
    color: hsl(0, 0%, 12%);
  }

  .entity-hover-preview__meta {
    margin: 0;
    font-size: 0.6875rem;
    font-weight: 600;
    color: hsl(5, 53%, 32%);
  }

  .entity-hover-preview__hint {
    margin: 0;
    font-size: 0.6875rem;
    line-height: 1.35;
    color: hsl(0, 0%, 35%);
  }
</style>
