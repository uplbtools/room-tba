<script lang="ts">
  /** In-app feedback box (#881).
   *
   * The primary control is a plain free-text box: no category dropdown, no
   * required email. What gets attached is listed in full under the fields, and
   * it is read once on mount so the note describes exactly what is sent.
   *
   * The draft lives in sessionStorage, so Escape or a stray backdrop tap no
   * longer throws away a half-written message. */
  import { onMount } from "svelte";
  import ModalHeader from "./ModalHeader.svelte";
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

  const DRAFT_KEY = "room-tba:feedback-draft";
  /** The counter shows once the message gets close to the cap. */
  const COUNTER_FROM = FEEDBACK_MESSAGE_MAX - 200;

  type Draft = { message: string; contact: string };

  function readDraft(): Draft {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null");
      return {
        message: typeof parsed?.message === "string" ? parsed.message : "",
        contact: typeof parsed?.contact === "string" ? parsed.contact : "",
      };
    } catch {
      return { message: "", contact: "" };
    }
  }

  function writeDraft(next: Draft) {
    try {
      if (!next.message && !next.contact) sessionStorage.removeItem(DRAFT_KEY);
      else sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    } catch {
      // Storage blocked (private mode): the draft just won't outlive a close.
    }
  }

  const draft = readDraft();
  let message = $state(draft.message);
  let contact = $state(draft.contact);
  let sending = $state(false);
  let error = $state<string | null>(null);
  let sent = $state(false);
  let emptyTried = $state(false);
  let textareaEl = $state<HTMLTextAreaElement | null>(null);

  let screen = $state<string | null>(null);
  let wasOnline = $state<boolean | null>(null);

  onMount(() => {
    screen = window.location.pathname;
    wasOnline = navigator.onLine;
  });

  const canSend = $derived(message.trim().length > 0);
  const remaining = $derived(FEEDBACK_MESSAGE_MAX - message.length);
  const showCount = $derived(message.length >= COUNTER_FROM);
  const messageDescribedBy = $derived(
    [
      "feedback-message-hint",
      emptyTried && "feedback-message-empty",
      showCount && "feedback-message-count",
    ]
      .filter(Boolean)
      .join(" "),
  );

  $effect(() => {
    writeDraft({ message, contact });
  });

  $effect(() => {
    if (canSend) emptyTried = false;
  });

  // Grow with the text instead of scrolling inside a four-row box.
  $effect(() => {
    void message;
    const el = textareaEl;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  });

  async function submit(event: Event) {
    event.preventDefault();
    if (sending) return;
    // Send stays enabled so the reason can be said, not left to a faded button.
    if (!canSend) {
      emptyTried = true;
      textareaEl?.focus();
      return;
    }
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
  <ModalHeader id="feedback-modal-title" title="Send feedback" />
  <div class="feedback-panel__scroll">
    {#if sent}
      <div class="feedback-panel__body">
        <EntityEditorMessage
          variant="success"
          message="Sent. Thank you — the team reads every message."
        />
        <button
          class="feedback-panel__again"
          type="button"
          onclick={() => (sent = false)}
        >
          Send another
        </button>
      </div>
    {:else}
      <form
        class="entity-editor-form feedback-panel__form feedback-panel__body"
        onsubmit={submit}
        novalidate
      >
        <EntityEditorFormField
          label="Your message"
          inputId="feedback-message"
          hint="Anything — a wrong room, a bug, an idea."
        >
          {#snippet control()}
            <textarea
              id="feedback-message"
              bind:this={textareaEl}
              bind:value={message}
              rows="4"
              maxlength={FEEDBACK_MESSAGE_MAX}
              disabled={sending}
              aria-describedby={messageDescribedBy}
              aria-invalid={emptyTried || undefined}
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
              aria-describedby="feedback-contact-hint"
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
        {#if emptyTried}
          <p
            id="feedback-message-empty"
            class="feedback-panel__empty"
            role="alert"
          >
            Write a message first.
          </p>
        {/if}

        <div class="feedback-panel__actions">
          <EntityEditorSubmitButton
            type="submit"
            label="Send feedback"
            savingLabel="Sending…"
            saving={sending}
          />
          {#if showCount}
            <span
              id="feedback-message-count"
              class="feedback-panel__count"
              class:feedback-panel__count--full={remaining <= 0}
              aria-live="polite"
            >
              {remaining <= 0
                ? `Limit reached (${FEEDBACK_MESSAGE_MAX} characters)`
                : `${remaining} characters left`}
            </span>
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
</div>

<style>
  .feedback-panel {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
    min-height: 0;
  }

  /* The title stays put; the form scrolls under it on short screens. */
  .feedback-panel__scroll {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-height: 0;
    overflow-y: auto;
  }

  /* Same inset as ModalHeader's title, so fields line up under it. */
  .feedback-panel__body {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0 0.5rem;
  }

  /* The shared field renders its hint bare; here it is secondary copy under
     the label, not a second, bigger label. */
  .feedback-panel :global(.field-hint) {
    margin: -0.125rem 0 0;
    font-size: 0.75rem;
    line-height: 1.35;
    color: hsl(0, 0%, 40%);
  }

  .feedback-panel textarea {
    max-height: 40dvh;
    overflow-y: auto;
    resize: none;
  }

  .feedback-panel__attached {
    margin: 0;
    font-size: 0.6875rem;
    line-height: 1.4;
    color: hsl(0, 0%, 40%);
  }

  .feedback-panel__empty {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 600;
    color: hsl(0, 60%, 36%);
  }

  .feedback-panel__actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .feedback-panel__count {
    font-size: 0.75rem;
    color: hsl(0, 0%, 40%);
  }

  .feedback-panel__count--full {
    font-weight: 600;
    color: hsl(25, 85%, 28%);
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
    padding: 0 0.5rem 0.25rem;
    font-size: 0.75rem;
    color: hsl(0, 0%, 40%);
  }

  .feedback-panel__talk :global(.community-platform-link) {
    min-height: 2.75rem;
    display: inline-flex;
    align-items: center;
  }
</style>
