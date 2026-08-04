<script lang="ts">
  import X from "@lucide/svelte/icons/x";
  import IconButton from "@ui/IconButton.svelte";
  import {
    countFollowPromptView,
    retireFollowPrompt,
  } from "@lib/social-follow";
  import FollowUpdates from "./FollowUpdates.svelte";

  type Props = {
    /** Why this moment earned the ask. Keep it about the reader's data. */
    note: string;
  };

  const { note }: Props = $props();

  // Read once at init, not in an effect: re-reading would let the prompt come
  // back inside a session, and coming back is the thing this must never do.
  // Counting the view here also retires it after the third unanswered showing,
  // so ignoring it is an answer rather than an invitation to ask again.
  let retired = $state(!countFollowPromptView());

  function retire(outcome: "dismissed" | "followed") {
    retired = true;
    retireFollowPrompt(outcome);
  }
</script>

{#if !retired}
  <aside class="follow-prompt" aria-label="Follow UPLB Tools">
    <div class="follow-prompt__body">
      <FollowUpdates {note} onfollow={() => retire("followed")} />
    </div>
    <IconButton
      label="Dismiss follow suggestion"
      class="follow-prompt__dismiss"
      onclick={() => retire("dismissed")}
    >
      <X size={16} aria-hidden="true" />
    </IconButton>
  </aside>
{/if}

<style>
  .follow-prompt {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    margin-top: 1rem;
    padding: 0.75rem;
    border: 1px solid hsl(0, 0%, 88%);
    border-radius: 0.5rem;
    background: hsl(0, 0%, 98%);
  }

  .follow-prompt__body {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
    flex: 1 1 auto;
  }

  /* IconButton tops out at 2.25rem; the dismiss needs a full touch target. */
  .follow-prompt :global(.follow-prompt__dismiss) {
    width: 2.75rem;
    height: 2.75rem;
  }

  @media (prefers-color-scheme: dark) {
    .follow-prompt {
      border-color: hsl(0, 0%, 28%);
      background: hsl(0, 0%, 15%);
    }

    .follow-prompt :global(.follow-prompt__dismiss) {
      color: hsl(0, 0%, 78%);
    }
  }
</style>
