<script lang="ts">
  import { slide } from "svelte/transition";
  import { formatCatalogUpdatedDate } from "@constants/data-catalog";
  import { APP_VERSION_LABEL } from "@constants/version";
  import { statusBarNavGroups } from "@constants/status-bar-links";
  import { slideDismiss, slideReveal } from "@lib/motion";
  import StatusBarDirectionsStat from "./StatusBarDirectionsStat.svelte";
  import StatusBarLinkGroups from "./StatusBarLinkGroups.svelte";
  import ContributorProgressPanel from "./ContributorProgressPanel.svelte";
  import MapChromeGhostButton from "@ui/map-chrome/MapChromeGhostButton.svelte";
  import type { StatusBarNavGroup } from "@constants/status-bar-links";

  type Props = {
    reducedMotion: boolean;
    directionCount: number;
    totalRooms: number;
    progressPercent: number;
    showDirectionsProgress: boolean;
    showEditorLogin: boolean;
    onAction: (id: "contributors" | "editor-login") => void;
  };

  const {
    reducedMotion,
    directionCount,
    totalRooms,
    progressPercent,
    showDirectionsProgress,
    showEditorLogin,
    onAction,
  }: Props = $props();

  let showProgressPanel = $state(false);

  const catalogUpdatedLabel = formatCatalogUpdatedDate();
  const navGroups = $derived<StatusBarNavGroup[]>(
    statusBarNavGroups({
      versionLabel: APP_VERSION_LABEL,
      showEditorLogin,
    }),
  );
</script>

<div
  class="status-bar__details"
  id="status-bar-details"
  in:slide={slideReveal(reducedMotion)}
  out:slide={slideDismiss(reducedMotion)}
>
  {#if showDirectionsProgress}
    <section class="status-bar__section" aria-label="Directions coverage">
      <StatusBarDirectionsStat
        {directionCount}
        {totalRooms}
        {progressPercent}
        variant="expanded"
      />
      <div class="status-bar__progress-actions">
        <MapChromeGhostButton
          variant="muted"
          aria-expanded={showProgressPanel}
          aria-controls="contributor-progress-panel"
          onclick={() => (showProgressPanel = !showProgressPanel)}
        >
          {showProgressPanel ? "Hide progress" : "Progress by building"}
        </MapChromeGhostButton>
      </div>
      {#if showProgressPanel}
        <div id="contributor-progress-panel">
          <ContributorProgressPanel />
        </div>
      {/if}
    </section>
  {/if}

  <section
    class="status-bar__section status-bar__section--catalog"
    aria-label="Data freshness"
  >
    <span class="status-bar__catalog">Updated {catalogUpdatedLabel}</span>
  </section>

  <nav
    class="status-bar__section status-bar__section--nav"
    aria-label="App links"
  >
    <StatusBarLinkGroups groups={navGroups} {onAction} />
  </nav>
</div>
