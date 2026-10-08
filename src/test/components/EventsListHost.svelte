<script lang="ts">
  import EventsList from "@ui/controls/EventsList.svelte";
  import type { EventData } from "@lib/types";
  import AppContextTestShell from "@test/AppContextTestShell.svelte";
  import { loadedAppContext } from "@test/fixtures/app-context";

  type Props = {
    events: EventData[];
  };

  let { events }: Props = $props();
</script>

<AppContextTestShell data={loadedAppContext({ events })}>
  <EventsList />
</AppContextTestShell>
