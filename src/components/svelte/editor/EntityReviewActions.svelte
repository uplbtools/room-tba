<script lang="ts">
  import "./review-panel.css";

  type Props = {
    disabled?: boolean;
    onapprove: () => void;
    onrequestChanges: () => void;
    onreject: () => void;
  };

  let { disabled = false, onapprove, onrequestChanges, onreject }: Props =
    $props();
</script>

<div class="entity-review-actions">
  <button type="button" class="approve" {disabled} onclick={onapprove}>
    Approve
  </button>
  <button type="button" {disabled} onclick={onrequestChanges}>
    Request changes
  </button>
  <button type="button" class="reject" {disabled} onclick={onreject}>
    Reject
  </button>
</div>
