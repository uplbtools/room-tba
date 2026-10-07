<script lang="ts">
  import Suggestions from "@ui/search/Suggestions.svelte";
  import type { AppContextData } from "@lib/context";
  import AppContextTestShell from "@test/AppContextTestShell.svelte";

  type Props = { data: AppContextData };

  let { data }: Props = $props();
</script>

<AppContextTestShell {data}>
  <Suggestions />
</AppContextTestShell>
