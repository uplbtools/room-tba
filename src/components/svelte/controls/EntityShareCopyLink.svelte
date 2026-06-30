<script lang="ts">
  import CopyLinkButton from "@ui/CopyLinkButton.svelte";
  import { toastStore } from "@lib/store.svelte";

  type Props = {
    url: string;
    entityLabel: string;
    label?: string;
    toolbar?: boolean;
  };

  let {
    url,
    entityLabel,
    label = "Copy link",
    toolbar = true,
  }: Props = $props();
</script>

<CopyLinkButton
  {url}
  {label}
  {toolbar}
  ariaLabel={`Copy link to ${entityLabel}`}
  successMessage={`Copied link for ${entityLabel}.`}
  errorMessage={`Could not copy link for ${entityLabel}.`}
  feedback="none"
  onsuccess={() =>
    toastStore.show(`Copied link for ${entityLabel}.`, "success")}
  onerror={() =>
    toastStore.show(`Could not copy link for ${entityLabel}.`, "error")}
/>
