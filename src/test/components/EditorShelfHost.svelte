<script lang="ts">
  import EditorShelf from "@ui/EditorShelf.svelte";
  import AppContextTestShell from "@test/AppContextTestShell.svelte";
  import { loadedAppContext } from "@test/fixtures/app-context";
</script>

<AppContextTestShell data={loadedAppContext()}>
  <EditorShelf />
</AppContextTestShell>
