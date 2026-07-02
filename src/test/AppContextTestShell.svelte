<script lang="ts">
  import type { Snippet } from "svelte";
  import {
    setAppActions,
    setAppData,
    type AppContextData,
  } from "@lib/context";

  type Props = {
    data: AppContextData;
    children?: Snippet;
  };

  let { data, children }: Props = $props();

  setAppData(() => data);
  setAppActions({
    replaceEvent: () => {},
    removeEvent: () => {},
    replaceBuilding: () => {},
    replaceDorm: () => {},
    replaceCollege: () => {},
    replaceDivision: () => {},
  });
</script>

{@render children?.()}
