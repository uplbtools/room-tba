<script lang="ts">
  import { Eye, EyeOff } from "@lucide/svelte";
  import EntityEditorFormField from "@ui/editor/EntityEditorFormField.svelte";
  import EntityEditorSubmitButton from "@ui/editor/EntityEditorSubmitButton.svelte";
  import EntityEditorMessage from "@ui/editor/EntityEditorMessage.svelte";
  import "./editor/entity-editor.css";

  const MIN_LENGTH = 10;

  type Props = {
    /** Read from Astro.url on the server; null when missing or invalid. */
    token: string | null;
    tokenState: "ok" | "missing" | "invalid";
  };

  let { token, tokenState }: Props = $props();

  let newPassword = $state("");
  let confirmPassword = $state("");
  let showPassword = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);
  /** Set once the server rejects the token on submit (used or expired). */
  let tokenRejected = $state(false);
  let done = $state(false);

  const mismatch = $derived(
    confirmPassword.length > 0 && confirmPassword !== newPassword,
  );
  const canSubmit = $derived(
    newPassword.length >= MIN_LENGTH && confirmPassword === newPassword,
  );

  async function submit(e: Event) {
    e.preventDefault();
    if (!token || !canSubmit) return;
    saving = true;
    error = null;
    try {
      const res = await fetch("/api/account/confirm-password-reset", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        error = data.error ?? "Could not reset password.";
        if (res.status === 400 && /invalid or has expired/i.test(error)) {
          tokenRejected = true;
        }
        return;
      }
      done = true;
    } catch {
      error = "Network error. Try again.";
    } finally {
      saving = false;
    }
  }
</script>

<div class="reset-password-card">
  {#if tokenState === "missing"}
    <EntityEditorMessage
      variant="error"
      message="This link is missing its token. Request a new password reset from the sign-in screen."
    />
    <a class="reset-password-link" href="/?editor=login">Go to sign in</a>
  {:else if tokenState === "invalid" || !token || tokenRejected}
    <EntityEditorMessage
      variant="error"
      message="This link is invalid or has expired. Request a new password reset from the sign-in screen."
    />
    <a class="reset-password-link" href="/?editor=login">Go to sign in</a>
  {:else if done}
    <EntityEditorMessage
      variant="success"
      message="Password updated. You can sign in with it now."
    />
    <a class="reset-password-link" href="/?editor=login">Go to sign in</a>
  {:else}
    <form class="entity-editor-form" onsubmit={submit}>
      <EntityEditorFormField
        label="New password"
        inputId="reset-password-new"
        hint="At least {MIN_LENGTH} characters."
      >
        {#snippet control()}
          <span class="reset-password-input">
            <input
              id="reset-password-new"
              type={showPassword ? "text" : "password"}
              autocomplete="new-password"
              minlength={MIN_LENGTH}
              aria-describedby="reset-password-new-hint"
              bind:value={newPassword}
              disabled={saving}
              required
            />
            <button
              type="button"
              class="reset-password-toggle"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onclick={() => (showPassword = !showPassword)}
            >
              {#if showPassword}
                <EyeOff size={18} aria-hidden="true" />
              {:else}
                <Eye size={18} aria-hidden="true" />
              {/if}
            </button>
          </span>
        {/snippet}
      </EntityEditorFormField>
      <EntityEditorFormField
        label="Confirm new password"
        inputId="reset-password-confirm"
      >
        {#snippet control()}
          <input
            id="reset-password-confirm"
            type={showPassword ? "text" : "password"}
            autocomplete="new-password"
            bind:value={confirmPassword}
            disabled={saving}
            required
            aria-invalid={mismatch ? true : undefined}
            aria-describedby={mismatch ? "reset-password-mismatch" : undefined}
          />
        {/snippet}
      </EntityEditorFormField>
      {#if mismatch}
        <p class="reset-password-mismatch" id="reset-password-mismatch">
          Passwords do not match.
        </p>
      {/if}
      {#if error}
        <EntityEditorMessage variant="error" message={error} />
      {/if}
      <EntityEditorSubmitButton
        type="submit"
        label="Set new password"
        savingLabel="Saving…"
        saving={saving}
        disabled={!canSubmit}
      />
    </form>
  {/if}
</div>

<style>
  .reset-password-card {
    max-width: 24rem;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .reset-password-link {
    align-self: flex-start;
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .reset-password-input {
    position: relative;
    display: block;
  }
  .reset-password-input input {
    box-sizing: border-box;
    width: 100%;
    padding-right: 2.75rem;
  }
  .reset-password-toggle {
    position: absolute;
    top: 50%;
    right: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    padding: 0;
    border: none;
    background: none;
    color: var(--theme-text-2, hsl(0, 0%, 38%));
    cursor: pointer;
    transform: translateY(-50%);
  }
  .reset-password-toggle:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
    outline-offset: -4px;
    border-radius: 0.5rem;
  }
  .reset-password-mismatch {
    margin: -0.25rem 0 0;
    font-size: 0.8125rem;
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
  }
</style>
