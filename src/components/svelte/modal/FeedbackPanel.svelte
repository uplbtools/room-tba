<script lang="ts">
  /** In-app feedback box (#881).
   *
   * The primary control is a plain free-text box: no category dropdown, no
   * required email. What gets attached is listed in full under the fields, and
   * it is read once on mount so the note describes exactly what is sent. */
  import { onMount } from "svelte";
  import CommunityPlatformLink from "@ui/community/CommunityPlatformLink.svelte";
  import EntityEditorFormField from "@ui/editor/EntityEditorFormField.svelte";
  import EntityEditorMessage from "@ui/editor/EntityEditorMessage.svelte";
  import EntityEditorSubmitButton from "@ui/editor/EntityEditorSubmitButton.svelte";
  import {
    DISCORD_URL,
    MESSENGER_CONTRIBUTE_URL,
  } from "@constants/community-links";
  import {
    FEEDBACK_CONTACT_MAX,
    FEEDBACK_MESSAGE_MAX,
  } from "@constants/feedback";
  import { APP_VERSION_LABEL } from "@constants/version";

  let message = $state("");
  let contact = $state("");
  let sending = $state(false);
  let error = $state<string | null>(null);
  let sent = $state(false);

  let screen = $state<string | null>(null);
  let wasOnline = $state<boolean | null>(null);

  onMount(() => {
    screen = window.location.pathname;
    wasOnline = navigator.onLine;
  });

  const canSend = $derived(message.trim().length > 0);
  const remaining = $derived(FEEDBACK_MESSAGE_MAX - message.length);

  async function submit(event: Event) {
    event.preventDefault();
    if (!canSend || sending) return;
    sending = true;
    error = null;
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          contact,
          screen,
          appVersion: APP_VERSION_LABEL,
          wasOnline,
        }),
      });
      const data = await res.json().catch(() => ({}) as { error?: string });
      if (!res.ok) {
        // Leave `message` alone — retyping lost feedback is how feedback dies.
        error = data.error ?? "Could not send your message. Try again.";
        return;
      }
      sent = true;
      message = "";
      contact = "";
    } catch {
      error = "Network error. Your message is still here — try again.";
    } finally {
      sending = false;
    }
  }
</script>

<div class="feedback-panel">
  {#if sent}
    <EntityEditorMessage
      variant="success"
      message="Sent. Thank you — the team reads every message."
    />
    <button class="feedback-panel__again" type="button" onclick={() => (sent = false)}>
      Send another
    </button>
  {:else}
    <form class="entity-editor-form feedback-panel__form" onsubmit={submit}>
      <EntityEditorFormField
        label="Your message"
        inputId="feedback-message"
        hint="Anything — a wrong room, a bug, an idea."
      >
        {#snippet control()}
          <textarea
            id="feedback-message"
            bind:value={message}
            rows="4"
            maxlength={FEEDBACK_MESSAGE_MAX}
            disabled={sending}
            placeholder="What happened, or what would help?"
          ></textarea>
        {/snippet}
      </EntityEditorFormField>

      <EntityEditorFormField
        label="Contact (optional)"
        inputId="feedback-contact"
        hint="Name or handle, only if you want a reply."
      >
        {#snippet control()}
          <input
            id="feedback-contact"
            type="text"
            bind:value={contact}
            maxlength={FEEDBACK_CONTACT_MAX}
            disabled={sending}
            autocomplete="off"
            placeholder="e.g. @juandelacruz"
          />
        {/snippet}
      </EntityEditorFormField>

      <p class="feedback-panel__attached">
        Sent with your message: the screen you are on ({screen ?? "unknown"}),
        app version {APP_VERSION_LABEL}, and whether you were {wasOnline ===
        false
          ? "offline"
          : "online"}. No email and no IP address are stored.
      </p>

      {#if error}
        <EntityEditorMessage variant="error" message={error} />
      {/if}

      <div class="feedback-panel__actions">
        <EntityEditorSubmitButton
          type="submit"
          label="Send feedback"
          savingLabel="Sending…"
          saving={sending}
          disabled={!canSend}
        />
        {#if remaining <= 200}
          <span class="feedback-panel__count">{remaining} left</span>
        {/if}
      </div>
    </form>
  {/if}

  <p class="feedback-panel__talk">
    Prefer a conversation?
    <CommunityPlatformLink
      brand="messenger"
      href={MESSENGER_CONTRIBUTE_URL}
      label="Messenger"
    />
    <CommunityPlatformLink brand="discord" href={DISCORD_URL} label="Discord" />
  </p>
</div>

<style>
  .feedback-panel {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
  }

  .feedback-panel__form {
    gap: 0.5rem;
  }

  .feedback-panel__attached {
    margin: 0;
    font-size: 0.6875rem;
    line-height: 1.4;
    color: hsl(0, 0%, 40%);
  }

  .feedback-panel__actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .feedback-panel__count {
    font-size: 0.6875rem;
    color: hsl(0, 0%, 40%);
  }

  /* The shared editor submit is deliberately compact; feedback is a one-off
     touch target on a phone, so bring it up to the 2.75rem rule. */
  .feedback-panel :global(.entity-editor-submit) {
    min-height: 2.75rem;
    padding-inline: 0.875rem;
    font-size: 0.8125rem;
  }

  .feedback-panel__again {
    align-self: flex-start;
    min-height: 2.75rem;
    padding: 0 0.875rem;
    border: 1px solid hsl(0, 0%, 85%);
    border-radius: 0.5rem;
    background: white;
    color: hsl(5, 53%, 32%);
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 700;
    cursor: pointer;
  }

  .feedback-panel__again:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 1px;
  }

  .feedback-panel__talk {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-size: 0.75rem;
    color: hsl(0, 0%, 40%);
  }

  .feedback-panel__talk :global(.community-platform-link) {
    min-height: 2.75rem;
    display: inline-flex;
    align-items: center;
  }
</style>
