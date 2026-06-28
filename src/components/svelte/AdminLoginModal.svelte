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
  import "./editor/entity-editor.css";
  import { MediaQuery } from "svelte/reactivity";

  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");
  const loginErrorId = "admin-login-error";

  let loginFrameEl = $state<HTMLDivElement | null>(null);
  let username = $state("admin");
  let password = $state("");
  let error: string | null = $state(null);

  async function submit(e: Event) {
    e.preventDefault();
    error = null;
    const err = await adminAuthStore.login(username, password);
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

<div
  class="login-overlay"
  transition:fade={overlayFade(reducedMotion.current)}
>
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
      <EntityEditorFormField label="Username" inputId="admin-login-username">
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
      {#if error}
        <EntityEditorMessage
          variant="error"
          message={error}
          id={loginErrorId}
        />
      {/if}
      <EntityEditorSubmitButton
        type="submit"
        label="Sign in"
        savingLabel="Signing in…"
        saving={adminAuthStore.loading}
      />
    </form>
  </div>
</div>

<style>
  .login-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(8, 12, 22, 0.55);
    z-index: 200;
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
</style>
