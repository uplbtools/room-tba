<script lang="ts">
  import EditorAdditionModal from "@ui/EditorAdditionModal.svelte";
  import AppContextTestShell from "@test/AppContextTestShell.svelte";
  import { loadedAppContext } from "@test/fixtures/app-context";
</script>

<AppContextTestShell data={loadedAppContext()}>
  <EditorAdditionModal />
</AppContextTestShell>
