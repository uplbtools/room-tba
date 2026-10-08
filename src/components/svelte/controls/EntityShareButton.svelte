<script lang="ts">
  import Share2 from "@lucide/svelte/icons/share-2";
  import MapChromeActionChip from "@ui/map-chrome/MapChromeActionChip.svelte";
  import { toastStore } from "@lib/store.svelte";
  import { shareLink } from "@lib/share-link";

  type Props = {
    url: string;
    entityLabel: string;
  };

  let { url, entityLabel }: Props = $props();

  let busy = $state(false);

  async function onShare() {
    if (busy) return;
    busy = true;
    try {
      const outcome = await shareLink({ url, title: entityLabel });
      if (outcome === "copied") {
        toastStore.show(`Copied link for ${entityLabel}.`, "success");
      }
    } catch {
      toastStore.show(`Could not copy link for ${entityLabel}.`, "error");
    } finally {
      busy = false;
    }
  }
</script>

<MapChromeActionChip
  toolbar
  ariaLabel={`Share ${entityLabel}`}
  ariaBusy={busy}
  onclick={onShare}
>
  <Share2 size={14} aria-hidden="true" />
  Share
</MapChromeActionChip>
