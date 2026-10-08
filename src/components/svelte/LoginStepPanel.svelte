<script lang="ts">
  import { adminAuthStore, toastStore } from "@lib/store.svelte";
  import EntityEditorFormField from "@ui/editor/EntityEditorFormField.svelte";
  import EntityEditorSubmitButton from "@ui/editor/EntityEditorSubmitButton.svelte";
  import EntityEditorMessage from "@ui/editor/EntityEditorMessage.svelte";
  import {
    MAX_PASSWORD_BYTES,
    MIN_CONTRIBUTOR_PASSWORD_LENGTH,
    newPasswordError,
  } from "@lib/auth/contributor-signup";

  /**
   * The second half of a password sign-in (auth audit item 19): a two-step
   * code, required two-step setup, or choosing a new password in place of a
   * temporary one. Also shows recovery codes once after setup.
   */
  let code = $state("");
  let useRecoveryCode = $state(false);
  let newPassword = $state("");
  let confirmPassword = $state("");
  let error = $state<string | null>(null);
  let copied = $state(false);

  const step = $derived(adminAuthStore.loginStep);
  const passwordProblem = $derived(
    newPassword ? newPasswordError(newPassword) : null,
  );

  async function run(
    action: "verify_mfa" | "enroll_start" | "enroll_confirm" | "change_password",
  ) {
    error = null;
    const err = await adminAuthStore.submitLoginStep(action, {
      code: code.trim(),
      newPassword,
    });
    if (err) {
      error = err;
      return;
    }
    code = "";
    if (adminAuthStore.isLoggedIn && !adminAuthStore.loginRecoveryCodes) {
      const label = adminAuthStore.displayName ?? adminAuthStore.username ?? "";
      toastStore.show(`Logged in as ${label}.`, "success");
    }
  }

  function submit(e: Event) {
    e.preventDefault();
    if (!step) return;
    if (step.step === "mfa") void run("verify_mfa");
    else if (step.step === "enroll_mfa") {
      void run(step.secret ? "enroll_confirm" : "enroll_start");
    } else if (step.step === "change_password") {
      if (newPassword !== confirmPassword) {
        error = "Passwords do not match.";
        return;
      }
      void run("change_password");
    }
  }

  async function copyCodes() {
    const codes = adminAuthStore.loginRecoveryCodes ?? [];
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      copied = true;
    } catch {
      copied = false;
    }
  }
</script>

{#if adminAuthStore.loginRecoveryCodes}
  <div class="login-step">
    <p class="login-step-lead">
      Two-step verification is on. Save these recovery codes somewhere safe.
      Each one signs you in once if you lose your phone. They will not be shown
      again.
    </p>
    <ul class="login-recovery-codes" aria-label="Recovery codes">
      {#each adminAuthStore.loginRecoveryCodes as recovery (recovery)}
        <li><code>{recovery}</code></li>
      {/each}
    </ul>
    <div class="login-step-actions">
      <EntityEditorSubmitButton
        label={copied ? "Copied" : "Copy codes"}
        variant="secondary"
        onclick={copyCodes}
      />
      <EntityEditorSubmitButton
        label="I saved them"
        onclick={() => adminAuthStore.dismissLoginRecoveryCodes()}
      />
    </div>
  </div>
{:else if step}
  <form class="login-step entity-editor-form" onsubmit={submit}>
    {#if step.step === "mfa"}
      <p class="login-step-lead">
        {useRecoveryCode
          ? "Enter one of the recovery codes you saved when you set up two-step verification."
          : "Enter the 6-digit code from your authenticator app."}
      </p>
      <EntityEditorFormField
        label={useRecoveryCode ? "Recovery code" : "Verification code"}
        inputId="login-step-code"
      >
        {#snippet control()}
          <input
            id="login-step-code"
            autocomplete="one-time-code"
            inputmode={useRecoveryCode ? "text" : "numeric"}
            pattern={useRecoveryCode ? undefined : "[0-9 ]{6,7}"}
            maxlength={useRecoveryCode ? 12 : 7}
            bind:value={code}
            required
          />
        {/snippet}
      </EntityEditorFormField>
      <button
        type="button"
        class="login-step-link"
        onclick={() => {
          useRecoveryCode = !useRecoveryCode;
          code = "";
        }}
      >
        {useRecoveryCode ? "Use the app code instead" : "Use a recovery code"}
      </button>
    {:else if step.step === "enroll_mfa"}
      {#if !step.secret}
        <p class="login-step-lead">
          Admin accounts need two-step verification. You will need an
          authenticator app such as Google Authenticator, Microsoft
          Authenticator, or 1Password. Signing in with Google also counts.
        </p>
      {:else}
        <p class="login-step-lead">
          Add Room TBA to your authenticator app, then enter the 6-digit code it
          shows.
        </p>
        <a class="login-step-link" href={step.otpauthUri}>Open in authenticator app</a>
        <p class="login-step-secret">
          Or enter this key by hand:
          <code>{step.secret.replace(/(.{4})/g, "$1 ").trim()}</code>
        </p>
        <EntityEditorFormField label="Verification code" inputId="login-step-code">
          {#snippet control()}
            <input
              id="login-step-code"
              autocomplete="one-time-code"
              inputmode="numeric"
              pattern={"[0-9 ]{6,7}"}
              maxlength="7"
              bind:value={code}
              required
            />
          {/snippet}
        </EntityEditorFormField>
      {/if}
    {:else if step.step === "change_password"}
      <p class="login-step-lead">
        This account was set up with a temporary password. Choose your own to
        finish signing in.
      </p>
      <EntityEditorFormField
        label="New password"
        inputId="login-step-new-password"
        hint={passwordProblem ??
          `${MIN_CONTRIBUTOR_PASSWORD_LENGTH} characters to ${MAX_PASSWORD_BYTES} bytes.`}
      >
        {#snippet control()}
          <input
            id="login-step-new-password"
            type="password"
            autocomplete="new-password"
            minlength={MIN_CONTRIBUTOR_PASSWORD_LENGTH}
            aria-describedby="login-step-new-password-hint"
            aria-invalid={passwordProblem ? true : undefined}
            bind:value={newPassword}
            required
          />
        {/snippet}
      </EntityEditorFormField>
      <EntityEditorFormField
        label="Confirm new password"
        inputId="login-step-confirm-password"
      >
        {#snippet control()}
          <input
            id="login-step-confirm-password"
            type="password"
            autocomplete="new-password"
            bind:value={confirmPassword}
            required
          />
        {/snippet}
      </EntityEditorFormField>
    {/if}

    {#if error}
      <EntityEditorMessage variant="error" message={error} id="login-step-error" />
    {/if}

    <div class="login-step-actions">
      <EntityEditorSubmitButton
        label="Back"
        variant="secondary"
        disabled={adminAuthStore.loading}
        onclick={() => adminAuthStore.cancelLoginStep()}
      />
      <EntityEditorSubmitButton
        type="submit"
        label={step.step === "enroll_mfa" && !step.secret
          ? "Set up now"
          : step.step === "change_password"
            ? "Save and sign in"
            : "Verify"}
        savingLabel="Checking…"
        saving={adminAuthStore.loading}
        disabled={step.step === "change_password"
          ? Boolean(passwordProblem) || !newPassword || !confirmPassword
          : step.step === "enroll_mfa" && !step.secret
            ? false
            : !code.trim()}
      />
    </div>
  </form>
{/if}

<style>
  .login-step {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
  }
  .login-step-lead {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.5;
  }
  .login-step-secret {
    margin: 0;
    font-size: 0.8125rem;
    overflow-wrap: anywhere;
  }
  .login-step-secret code,
  .login-recovery-codes code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.875rem;
  }
  .login-step-link {
    align-self: flex-start;
    padding: 0;
    border: none;
    background: none;
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
    font-weight: 600;
    font-size: 0.8125rem;
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }
  .login-recovery-codes {
    list-style: none;
    margin: 0;
    padding: 0.75rem;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.375rem;
    border: 1px solid var(--theme-border, hsl(0, 0%, 90%));
    border-radius: 0.5rem;
  }
  .login-step-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.5rem;
  }
</style>
