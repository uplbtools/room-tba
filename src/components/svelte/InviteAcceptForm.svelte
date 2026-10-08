<script lang="ts">
  import { Eye, EyeOff } from "@lucide/svelte";
  import EntityEditorFormField from "@ui/editor/EntityEditorFormField.svelte";
  import EntityEditorSubmitButton from "@ui/editor/EntityEditorSubmitButton.svelte";
  import EntityEditorMessage from "@ui/editor/EntityEditorMessage.svelte";
  import {
    MAX_PASSWORD_BYTES,
    MIN_CONTRIBUTOR_PASSWORD_LENGTH,
    USERNAME_MAX_LENGTH,
    USERNAME_MIN_LENGTH,
    USERNAME_PATTERN_SOURCE,
    newPasswordError,
    usernameError,
  } from "@lib/auth/contributor-signup";
  import "./editor/entity-editor.css";

  type Props = {
    token: string | null;
    invite: { email: string; role: string; displayName: string | null } | null;
  };

  let { token, invite }: Props = $props();

  let username = $state("");
  let displayName = $state(invite?.displayName ?? "");
  let password = $state("");
  let confirmPassword = $state("");
  let showPassword = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let done = $state(false);

  const usernameProblem = $derived(username ? usernameError(username) : null);
  const passwordProblem = $derived(password ? newPasswordError(password) : null);
  const mismatch = $derived(
    confirmPassword.length > 0 && confirmPassword !== password,
  );
  const canSubmit = $derived(
    Boolean(username) &&
      !usernameProblem &&
      Boolean(password) &&
      !passwordProblem &&
      confirmPassword === password,
  );

  async function submit(e: Event) {
    e.preventDefault();
    if (!token || !canSubmit) return;
    saving = true;
    error = null;
    try {
      const res = await fetch("/api/auth/accept-invite", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, username, password, displayName }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        error = data.error ?? "Could not finish the invite.";
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

<div class="invite-card">
  {#if !token || !invite}
    <EntityEditorMessage
      variant="error"
      message="This invite link is invalid, already used, or expired. Ask the admin who invited you for a new one."
    />
    <a class="invite-link" href="/">Back to Room TBA</a>
  {:else if done}
    <EntityEditorMessage
      variant="success"
      message="Your account is ready and you are signed in."
    />
    <a class="invite-link" href="/admin">Open the editor dashboard</a>
  {:else}
    <p class="invite-lead">
      You were invited as <strong>{invite.role}</strong> with
      <strong>{invite.email}</strong>. Choose how you sign in.
    </p>
    <form class="entity-editor-form" onsubmit={submit}>
      <EntityEditorFormField
        label="Username"
        inputId="invite-username"
        hint={usernameProblem ??
          `${USERNAME_MIN_LENGTH} to ${USERNAME_MAX_LENGTH} characters: lowercase letters, numbers, and . _ -`}
      >
        {#snippet control()}
          <input
            id="invite-username"
            autocomplete="username"
            autocapitalize="none"
            spellcheck="false"
            minlength={USERNAME_MIN_LENGTH}
            maxlength={USERNAME_MAX_LENGTH}
            pattern={USERNAME_PATTERN_SOURCE}
            aria-invalid={usernameProblem ? true : undefined}
            aria-describedby="invite-username-hint"
            bind:value={username}
            disabled={saving}
            required
          />
        {/snippet}
      </EntityEditorFormField>
      <EntityEditorFormField label="Display name" inputId="invite-display-name">
        {#snippet control()}
          <input
            id="invite-display-name"
            autocomplete="name"
            maxlength="100"
            bind:value={displayName}
            disabled={saving}
          />
        {/snippet}
      </EntityEditorFormField>
      <EntityEditorFormField
        label="Password"
        inputId="invite-password"
        hint={passwordProblem ??
          `${MIN_CONTRIBUTOR_PASSWORD_LENGTH} characters to ${MAX_PASSWORD_BYTES} bytes.`}
      >
        {#snippet control()}
          <span class="invite-password">
            <input
              id="invite-password"
              type={showPassword ? "text" : "password"}
              autocomplete="new-password"
              minlength={MIN_CONTRIBUTOR_PASSWORD_LENGTH}
              aria-invalid={passwordProblem ? true : undefined}
              aria-describedby="invite-password-hint"
              bind:value={password}
              disabled={saving}
              required
            />
            <button
              type="button"
              class="invite-password-toggle"
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
      <EntityEditorFormField label="Confirm password" inputId="invite-confirm">
        {#snippet control()}
          <input
            id="invite-confirm"
            type={showPassword ? "text" : "password"}
            autocomplete="new-password"
            aria-invalid={mismatch ? true : undefined}
            bind:value={confirmPassword}
            disabled={saving}
            required
          />
        {/snippet}
      </EntityEditorFormField>
      {#if mismatch}
        <p class="invite-mismatch">Passwords do not match.</p>
      {/if}
      {#if error}
        <EntityEditorMessage variant="error" message={error} />
      {/if}
      <EntityEditorSubmitButton
        type="submit"
        label="Create my account"
        savingLabel="Creating…"
        saving={saving}
        disabled={!canSubmit}
      />
    </form>
  {/if}
</div>

<style>
  .invite-card {
    max-width: 24rem;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .invite-lead {
    margin: 0;
    line-height: 1.5;
  }
  .invite-link {
    align-self: flex-start;
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .invite-password {
    position: relative;
    display: block;
  }
  .invite-password input {
    box-sizing: border-box;
    width: 100%;
    padding-right: 2.75rem;
  }
  .invite-password-toggle {
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
  .invite-mismatch {
    margin: -0.25rem 0 0;
    font-size: 0.8125rem;
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
  }
</style>
