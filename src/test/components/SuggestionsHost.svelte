<script lang="ts">
  import Suggestions from "@ui/search/Suggestions.svelte";
  import type { AppContextData } from "@lib/context";
  import AppContextTestShell from "@test/AppContextTestShell.svelte";

  type Props = { data: AppContextData };

  let { data }: Props = $props();
  let suggestions = $state<ReturnType<typeof Suggestions>>();

  /** Enter in the search box (Search.svelte forwards it the same way). */
  export function pressEnter() {
    suggestions?.handleEnter();
  }
</script>

<AppContextTestShell {data}>
  <Suggestions bind:this={suggestions} />
</AppContextTestShell>
