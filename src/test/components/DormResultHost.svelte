<script lang="ts">
  import DormResult from "@ui/controls/DormResult.svelte";
  import type { DormData } from "@lib/types";
  import AppContextTestShell from "@test/AppContextTestShell.svelte";
  import { loadedAppContext } from "@test/fixtures/app-context";

  type Props = {
    dorm: DormData;
  };

  let { dorm }: Props = $props();
</script>

<AppContextTestShell data={loadedAppContext({ dorms: [dorm] })}>
  <DormResult />
</AppContextTestShell>
