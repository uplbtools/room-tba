<script lang="ts">
  import AcademicCalendarScreen from "@ui/calendar/AcademicCalendarScreen.svelte";
  import AppContextTestShell from "@test/AppContextTestShell.svelte";
  import { loadedAppContext } from "@test/fixtures/app-context";
  import type { EventData } from "@lib/types";

  let { events = [] }: { events?: EventData[] } = $props();
</script>

<AppContextTestShell data={loadedAppContext({ events })}>
  <AcademicCalendarScreen />
</AppContextTestShell>
