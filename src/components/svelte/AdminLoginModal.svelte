<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { X, Lock } from "@lucide/svelte";
  import { adminAuthStore, toastStore } from "@lib/store.svelte";
  import {
    modalContentDismiss,
    modalContentReveal,
    overlayFade,
  } from "@lib/motion";
  import { trapFocus } from "@lib/focus-trap";
  import EntityEditorFormField from "@ui/editor/EntityEditorFormField.svelte";
  import EntityEditorSubmitButton from "@ui/editor/EntityEditorSubmitButton.svelte";
  import EntityEditorMessage from "@ui/editor/EntityEditorMessage.svelte";
  import CommunityBrandIcon from "@ui/community/CommunityBrandIcon.svelte";
  import TurnstileWidget from "@ui/TurnstileWidget.svelte";
  import { MESSENGER_MAINTAIN_TARGET } from "@constants/community-links";
  import "./editor/entity-editor.css";
  import { MediaQuery } from "svelte/reactivity";

  import { isSupabaseConfigured } from "@lib/supabase/env";
  import {
    getTurnstileSiteKey,
    isTurnstileWidgetConfigured,
  } from "@lib/turnstile-client";

  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");
  const loginErrorId = "admin-login-error";
  const googleEnabled = isSupabaseConfigured();
  const turnstileEnabled = isTurnstileWidgetConfigured();
  const turnstileSiteKey = turnstileEnabled ? getTurnstileSiteKey() : "";

  const OAUTH_ERROR_MESSAGES: Record<string, string> = {
    missing_code: "Google sign-in was cancelled or incomplete. Try again.",
    oauth_failed: "Google sign-in failed. Try again.",
    account_unavailable:
      "This Google account cannot be used to sign in. Contact the maintainers.",
  };

  let loginFrameEl = $state<HTMLDivElement | null>(null);
  let username = $state("admin");
  let password = $state("");
  let error: string | null = $state(null);
  let googleLoading = $state(false);
  let turnstileToken = $state<string | null>(null);

  let showForgotPassword = $state(false);
  let forgotLoginDraft = $state("");
  let forgotPasswordSending = $state(false);
  let forgotPasswordSent = $state(false);
  let forgotPasswordError = $state<string | null>(null);

  async function sendForgotPassword() {
    forgotPasswordSending = true;
    forgotPasswordError = null;
    try {
      const res = await fetch("/api/account/request-password-reset", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: forgotLoginDraft }),
      });
      if (!res.ok && res.status === 429) {
        const data = await res.json().catch(() => ({}) as { error?: string });
        forgotPasswordError =
          data.error ?? "Too many attempts. Wait a bit and try again.";
        return;
      }
      // Always show success — the endpoint never reveals whether the
      // account exists, so neither should the UI.
      forgotPasswordSent = true;
    } catch {
      forgotPasswordError = "Network error. Try again.";
    } finally {
      forgotPasswordSending = false;
    }
  }

  $effect(() => {
    const code = adminAuthStore.oauthError;
    if (code) {
      error =
        OAUTH_ERROR_MESSAGES[code] ?? "Google sign-in failed. Try again.";
    }
  });

  async function signInWithGoogle() {
    error = null;
    adminAuthStore.oauthError = null;
    googleLoading = true;
    const err = await adminAuthStore.loginWithGoogle();
    if (err) {
      error = err;
      googleLoading = false;
    }
    // On success the browser navigates away to Google.
  }

  async function submit(e: Event) {
    e.preventDefault();
    if (turnstileEnabled && !turnstileToken) {
      error = "Complete the verification check, then try again.";
      return;
    }
    error = null;
    const err = await adminAuthStore.login(username, password, turnstileToken);
    if (err) {
      error = err;
      return;
    }
    password = "";
    const label =
      adminAuthStore.displayName ?? adminAuthStore.username ?? "editor";
    toastStore.show(`Logged in as ${label}.`, "success");
  }

  function close() {
    adminAuthStore.closeLogin();
    error = null;
    password = "";
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") close();
  }

  $effect(() => {
    if (!loginFrameEl) return;
    return trapFocus(loginFrameEl, { onEscape: close });
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="login-overlay" transition:fade={overlayFade(reducedMotion.current)}>
  <div
    bind:this={loginFrameEl}
    class="login-frame"
    role="dialog"
    aria-modal="true"
    aria-labelledby="admin-login-title"
    in:fly={modalContentReveal(reducedMotion.current)}
    out:fly={modalContentDismiss(reducedMotion.current)}
  >
    <header class="login-header">
      <div class="login-title" id="admin-login-title">
        <Lock size={16} aria-hidden="true" />
        <span>Editor login</span>
      </div>
      <button
        type="button"
        class="login-close"
        onclick={close}
        aria-label="Close login"
      >
        <X size={18} aria-hidden="true" />
      </button>
    </header>
    <form class="login-body entity-editor-form" onsubmit={submit}>
      {#if !showForgotPassword}
        <EntityEditorFormField
          label="Username or email"
          inputId="admin-login-username"
        >
          {#snippet control()}
            <input
              id="admin-login-username"
              type="text"
              autocomplete="username"
              bind:value={username}
              required
            />
          {/snippet}
        </EntityEditorFormField>
        <EntityEditorFormField label="Password" inputId="admin-login-password">
          {#snippet control()}
            <input
              id="admin-login-password"
              type="password"
              autocomplete="current-password"
              bind:value={password}
              required
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? loginErrorId : undefined}
            />
          {/snippet}
        </EntityEditorFormField>
        <button
          type="button"
          class="forgot-password-link"
          onclick={() => (showForgotPassword = true)}
        >
          Forgot password?
        </button>
      {/if}
      {#if turnstileEnabled && !showForgotPassword}
        <TurnstileWidget siteKey={turnstileSiteKey} bind:token={turnstileToken} />
      {/if}
      {#if error}
        <EntityEditorMessage
          variant="error"
          message={error}
          id={loginErrorId}
        />
      {/if}
      {#if !showForgotPassword}
        <EntityEditorSubmitButton
          type="submit"
          label="Sign in"
          savingLabel="Signing in…"
          saving={adminAuthStore.loading}
          disabled={turnstileEnabled && !turnstileToken}
        />
      {/if}
      {#if showForgotPassword}
        <div class="forgot-password-panel">
          {#if forgotPasswordSent}
            <EntityEditorMessage
              variant="success"
              message="If that account exists, check its email for a reset link."
            />
            <button
              type="button"
              class="forgot-password-link"
              onclick={() => {
                showForgotPassword = false;
                forgotPasswordSent = false;
                forgotLoginDraft = "";
              }}
            >
              Back to sign in
            </button>
          {:else}
            <EntityEditorFormField
              label="Username or email"
              inputId="forgot-password-login"
            >
              {#snippet control()}
                <input
                  id="forgot-password-login"
                  type="text"
                  autocomplete="username"
                  bind:value={forgotLoginDraft}
                  disabled={forgotPasswordSending}
                />
              {/snippet}
            </EntityEditorFormField>
            {#if forgotPasswordError}
              <EntityEditorMessage variant="error" message={forgotPasswordError} />
            {/if}
            <div class="forgot-password-actions">
              <EntityEditorSubmitButton
                label="Send reset link"
                savingLabel="Sending…"
                saving={forgotPasswordSending}
                disabled={!forgotLoginDraft.trim()}
                onclick={sendForgotPassword}
              />
              <button
                type="button"
                class="forgot-password-link"
                onclick={() => (showForgotPassword = false)}
              >
                Cancel
              </button>
            </div>
          {/if}
        </div>
      {/if}
      {#if googleEnabled && !showForgotPassword}
        <div class="login-divider" aria-hidden="true">or</div>
        <button
          type="button"
          class="google-login-btn"
          onclick={signInWithGoogle}
          disabled={googleLoading || adminAuthStore.loading}
        >
          <svg viewBox="0 0 48 48" width="16" height="16" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>
          {googleLoading ? "Redirecting…" : "Continue with Google"}
        </button>
      {/if}
    </form>
    <p class="login-footer">
      Need editor access?
      <a
        href={MESSENGER_MAINTAIN_TARGET}
        target="_blank"
        rel="noopener noreferrer"
        class="login-footer-link"
      >
        <CommunityBrandIcon brand="messenger" size={14} />
        Message maintainers
      </a>
    </p>
  </div>
</div>

<style>
  .login-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(8, 12, 22, 0.55);
    z-index: var(--z-login-modal, 200);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }
  .login-frame {
    width: min(22rem, 100%);
    background: white;
    border-radius: 0.75rem;
    box-shadow: 0 18px 38px rgba(0, 0, 0, 0.3);
    overflow: hidden;
  }
  .login-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid hsl(0, 0%, 92%);
  }
  .login-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    color: hsl(0, 0%, 15%);
  }
  .login-close {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.375rem;
    color: hsl(0, 0%, 30%);
    display: flex;
  }
  .login-close:hover,
  .login-close:focus-visible {
    background-color: hsl(0, 0%, 95%);
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 1px;
  }
  .login-body {
    padding: 1rem;
  }
  .login-body :global(.entity-editor-submit) {
    width: 100%;
  }
  .login-footer {
    margin: 0;
    padding: 0.75rem 1rem 1rem;
    border-top: 1px solid hsl(0, 0%, 92%);
    font-size: 0.8125rem;
    color: hsl(0, 0%, 38%);
    line-height: 1.5;
    text-align: center;
  }
  .login-footer-link {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    margin-left: 0.25rem;
    color: hsl(5, 53%, 32%);
    font-weight: 600;
    text-decoration: none;
  }
  .login-footer-link:hover,
  .login-footer-link:focus-visible {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .login-divider {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: hsl(0, 0%, 55%);
    font-size: 0.75rem;
    margin: 0.25rem 0;
  }
  .login-divider::before,
  .login-divider::after {
    content: "";
    flex: 1;
    border-top: 1px solid hsl(0, 0%, 90%);
  }
  .google-login-btn {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid hsl(0, 0%, 82%);
    border-radius: 0.5rem;
    background: white;
    font-size: 0.875rem;
    font-weight: 600;
    color: hsl(0, 0%, 25%);
    cursor: pointer;
  }
  .google-login-btn:hover:not(:disabled),
  .google-login-btn:focus-visible {
    background: hsl(0, 0%, 97%);
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 1px;
  }
  .google-login-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .forgot-password-link {
    align-self: flex-start;
    background: none;
    border: none;
    padding: 0;
    color: hsl(5, 53%, 32%);
    font-weight: 600;
    font-size: 0.75rem;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .forgot-password-panel {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .forgot-password-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
</style>
