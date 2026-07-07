<script lang="ts">
  import ProposalReviewPanel from "@ui/ProposalReviewPanel.svelte";
  import AppContextTestShell from "@test/AppContextTestShell.svelte";
  import { loadedAppContext } from "@test/fixtures/app-context";
</script>

<AppContextTestShell data={loadedAppContext()}>
  <ProposalReviewPanel />
</AppContextTestShell>
