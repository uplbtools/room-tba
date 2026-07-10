<script lang="ts">
  import LoadingIndicator from "@ui/LoadingIndicator.svelte";
  import IconButton from "@ui/IconButton.svelte";
  import { fade, fly } from "svelte/transition";
  import { X, User2 } from "@lucide/svelte";
  import { toastStore } from "@lib/store.svelte";
  import { adminAuthStore } from "@lib/stores/admin-auth.svelte";
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

  type Profile = {
    username: string;
    displayName: string;
    email: string | null;
    role: "admin" | "editor" | "contributor";
    hasPassword: boolean;
    linkedGoogle: boolean;
  };

  let frameEl = $state<HTMLDivElement | null>(null);
  let profile = $state<Profile | null>(null);
  let loadError = $state<string | null>(null);

  let displayNameDraft = $state("");
  let savingDisplayName = $state(false);
  let displayNameError = $state<string | null>(null);
  let displayNameSaved = $state(false);

  let newEmailDraft = $state("");
  let showChangeEmail = $state(false);
  let emailRequestPending = $state(false);
  let emailRequestSent = $state(false);
  let emailError = $state<string | null>(null);

  let currentPasswordDraft = $state("");
  let newPasswordDraft = $state("");
  let savingPassword = $state(false);
  let passwordError = $state<string | null>(null);
  let passwordSaved = $state(false);

  let unlinkingGoogle = $state(false);
  let identityError = $state<string | null>(null);

  let showDeleteConfirm = $state(false);
  let deletePasswordDraft = $state("");
  let deleting = $state(false);
  let deleteError = $state<string | null>(null);

  async function loadProfile() {
    loadError = null;
    try {
      const res = await fetch("/api/account/me", {
        credentials: "same-origin",
      });
      if (!res.ok) {
        loadError = "Could not load your account.";
        return;
      }
      profile = (await res.json()) as Profile;
      displayNameDraft = profile.displayName;
    } catch {
      loadError = "Network error loading your account.";
    }
  }

  $effect(() => {
    if (adminAuthStore.accountSettingsOpen) void loadProfile();
  });

  function close() {
    adminAuthStore.closeAccountSettings();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") close();
  }

  $effect(() => {
    if (!frameEl) return;
    return trapFocus(frameEl, { onEscape: close });
  });

  async function saveDisplayName() {
    if (!profile) return;
    savingDisplayName = true;
    displayNameError = null;
    displayNameSaved = false;
    try {
      const res = await fetch("/api/account/me", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayNameDraft }),
      });
      const data = await res.json().catch(() => ({}) as { error?: string });
      if (!res.ok) {
        displayNameError = data.error ?? "Could not save display name.";
        return;
      }
      profile = { ...profile, displayName: displayNameDraft.trim() };
      await adminAuthStore.refresh();
      displayNameSaved = true;
      setTimeout(() => {
        displayNameSaved = false;
      }, 1800);
    } catch {
      displayNameError = "Network error. Try again.";
    } finally {
      savingDisplayName = false;
    }
  }

  async function requestEmailChange() {
    emailRequestPending = true;
    emailError = null;
    emailRequestSent = false;
    try {
      const res = await fetch("/api/account/request-email-change", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: newEmailDraft }),
      });
      const data = await res.json().catch(() => ({}) as { error?: string });
      if (!res.ok) {
        emailError = data.error ?? "Could not send confirmation email.";
        return;
      }
      emailRequestSent = true;
      newEmailDraft = "";
    } catch {
      emailError = "Network error. Try again.";
    } finally {
      emailRequestPending = false;
    }
  }

  async function savePassword() {
    if (!profile) return;
    savingPassword = true;
    passwordError = null;
    passwordSaved = false;
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: profile.hasPassword
            ? currentPasswordDraft
            : undefined,
          newPassword: newPasswordDraft,
        }),
      });
      const data = await res.json().catch(() => ({}) as { error?: string });
      if (!res.ok) {
        passwordError = data.error ?? "Could not change password.";
        return;
      }
      currentPasswordDraft = "";
      newPasswordDraft = "";
      profile = { ...profile, hasPassword: true };
      passwordSaved = true;
      setTimeout(() => {
        passwordSaved = false;
      }, 1800);
    } catch {
      passwordError = "Network error. Try again.";
    } finally {
      savingPassword = false;
    }
  }

  async function connectGoogle() {
    identityError = null;
    const err = await adminAuthStore.linkGoogle();
    if (err) identityError = err;
  }

  async function disconnectGoogle() {
    if (!profile) return;
    unlinkingGoogle = true;
    identityError = null;
    try {
      const res = await fetch("/api/account/unlink-google", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}) as { error?: string });
      if (!res.ok) {
        identityError = data.error ?? "Could not disconnect Google.";
        return;
      }
      profile = { ...profile, linkedGoogle: false };
      toastStore.show("Google account disconnected.", "success");
    } catch {
      identityError = "Network error. Try again.";
    } finally {
      unlinkingGoogle = false;
    }
  }

  function downloadExport() {
    window.open("/api/account/export", "_blank", "noopener,noreferrer");
  }

  async function confirmDelete() {
    if (!profile) return;
    deleting = true;
    deleteError = null;
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: profile.hasPassword
            ? deletePasswordDraft
            : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}) as { error?: string });
      if (!res.ok) {
        deleteError = data.error ?? "Could not delete account.";
        return;
      }
      close();
      await adminAuthStore.logout();
      toastStore.show("Your account has been deleted.", "success");
    } catch {
      deleteError = "Network error. Try again.";
    } finally {
      deleting = false;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  class="settings-overlay"
  transition:fade={overlayFade(reducedMotion.current)}
>
  <div
    bind:this={frameEl}
    class="settings-frame"
    role="dialog"
    aria-modal="true"
    aria-labelledby="account-settings-title"
    in:fly={modalContentReveal(reducedMotion.current)}
    out:fly={modalContentDismiss(reducedMotion.current)}
  >
    <header class="settings-header">
      <div class="settings-title" id="account-settings-title">
        <User2 size={16} aria-hidden="true" />
        <span>Account settings</span>
      </div>
      <IconButton
        size="sm"
        shape="rounded"
        label="Close account settings"
        onclick={close}
      >
        <X size={18} aria-hidden="true" />
      </IconButton>
    </header>

    <div class="settings-body">
      {#if loadError}
        <EntityEditorMessage variant="error" message={loadError} />
      {:else if !profile}
        <p class="settings-loading"><LoadingIndicator /></p>
      {:else}
        <section class="settings-section">
          <h3>Profile</h3>
          <EntityEditorFormField label="Username" inputId="account-username">
            {#snippet control()}
              <input id="account-username" value={profile.username} disabled />
            {/snippet}
          </EntityEditorFormField>
          <EntityEditorFormField label="Role" inputId="account-role">
            {#snippet control()}
              <input id="account-role" value={profile.role} disabled />
            {/snippet}
          </EntityEditorFormField>
          <EntityEditorFormField
            label="Display name"
            inputId="account-display-name"
          >
            {#snippet control()}
              <input
                id="account-display-name"
                bind:value={displayNameDraft}
                disabled={savingDisplayName}
              />
            {/snippet}
          </EntityEditorFormField>
          {#if displayNameError}
            <EntityEditorMessage variant="error" message={displayNameError} />
          {/if}
          {#if displayNameSaved}
            <EntityEditorMessage
              variant="success"
              message="Display name saved."
            />
          {/if}
          <EntityEditorSubmitButton
            label="Save display name"
            savingLabel="Saving…"
            saving={savingDisplayName}
            disabled={displayNameDraft.trim() === profile.displayName}
            onclick={saveDisplayName}
          />

          <EntityEditorFormField label="Email" inputId="account-email">
            {#snippet control()}
              <input
                id="account-email"
                value={profile.email ?? "(none)"}
                disabled
              />
            {/snippet}
          </EntityEditorFormField>
          {#if !showChangeEmail}
            <button
              type="button"
              class="settings-link-btn"
              onclick={() => (showChangeEmail = true)}
            >
              Change email
            </button>
          {:else}
            <EntityEditorFormField
              label="New email"
              inputId="account-new-email"
            >
              {#snippet control()}
                <input
                  id="account-new-email"
                  type="email"
                  bind:value={newEmailDraft}
                  disabled={emailRequestPending}
                />
              {/snippet}
            </EntityEditorFormField>
            {#if emailError}
              <EntityEditorMessage variant="error" message={emailError} />
            {/if}
            {#if emailRequestSent}
              <EntityEditorMessage
                variant="success"
                message="Check your new inbox for a confirmation link."
              />
            {/if}
            <EntityEditorSubmitButton
              label="Send confirmation link"
              savingLabel="Sending…"
              saving={emailRequestPending}
              disabled={!newEmailDraft.trim()}
              onclick={requestEmailChange}
            />
          {/if}
        </section>

        <section class="settings-section">
          <h3>{profile.hasPassword ? "Change password" : "Set a password"}</h3>
          {#if profile.hasPassword}
            <EntityEditorFormField
              label="Current password"
              inputId="account-current-password"
            >
              {#snippet control()}
                <input
                  id="account-current-password"
                  type="password"
                  autocomplete="current-password"
                  bind:value={currentPasswordDraft}
                  disabled={savingPassword}
                />
              {/snippet}
            </EntityEditorFormField>
          {/if}
          <EntityEditorFormField
            label="New password"
            inputId="account-new-password"
            hint="At least 10 characters."
          >
            {#snippet control()}
              <input
                id="account-new-password"
                type="password"
                autocomplete="new-password"
                bind:value={newPasswordDraft}
                disabled={savingPassword}
              />
            {/snippet}
          </EntityEditorFormField>
          {#if passwordError}
            <EntityEditorMessage variant="error" message={passwordError} />
          {/if}
          {#if passwordSaved}
            <EntityEditorMessage variant="success" message="Password saved." />
          {/if}
          <EntityEditorSubmitButton
            label={profile.hasPassword ? "Change password" : "Set password"}
            savingLabel="Saving…"
            saving={savingPassword}
            disabled={newPasswordDraft.length < 10 ||
              (profile.hasPassword && !currentPasswordDraft)}
            onclick={savePassword}
          />
        </section>

        <section class="settings-section">
          <h3>Connected accounts</h3>
          {#if identityError}
            <EntityEditorMessage variant="error" message={identityError} />
          {/if}
          {#if profile.linkedGoogle}
            <p class="settings-status">Google is connected.</p>
            <EntityEditorSubmitButton
              label="Disconnect Google"
              savingLabel="Disconnecting…"
              saving={unlinkingGoogle}
              disabled={!profile.hasPassword}
              variant="secondary"
              onclick={disconnectGoogle}
            />
            {#if !profile.hasPassword}
              <p class="field-hint">
                Set a password first to disconnect Google.
              </p>
            {/if}
          {:else}
            <EntityEditorSubmitButton
              label="Connect Google"
              variant="secondary"
              onclick={connectGoogle}
            />
          {/if}
        </section>

        <section class="settings-section">
          <h3>Data &amp; privacy</h3>
          <EntityEditorSubmitButton
            label="Download my data"
            variant="secondary"
            onclick={downloadExport}
          />

          {#if !showDeleteConfirm}
            <button
              type="button"
              class="settings-link-btn settings-link-btn--danger"
              onclick={() => (showDeleteConfirm = true)}
            >
              Delete my account
            </button>
          {:else}
            <div class="settings-danger-zone">
              <p>
                This deactivates your account and removes your email, display
                name, and password. Your past proposals and edit history stay on
                record, attributed to a deleted user.
              </p>
              {#if profile.hasPassword}
                <EntityEditorFormField
                  label="Confirm password"
                  inputId="account-delete-password"
                >
                  {#snippet control()}
                    <input
                      id="account-delete-password"
                      type="password"
                      bind:value={deletePasswordDraft}
                      disabled={deleting}
                    />
                  {/snippet}
                </EntityEditorFormField>
              {/if}
              {#if deleteError}
                <EntityEditorMessage variant="error" message={deleteError} />
              {/if}
              <div class="settings-danger-actions">
                <EntityEditorSubmitButton
                  label="Permanently delete my account"
                  savingLabel="Deleting…"
                  saving={deleting}
                  disabled={profile.hasPassword && !deletePasswordDraft}
                  variant="danger"
                  onclick={confirmDelete}
                />
                <EntityEditorSubmitButton
                  label="Cancel"
                  variant="secondary"
                  disabled={deleting}
                  onclick={() => (showDeleteConfirm = false)}
                />
              </div>
            </div>
          {/if}
        </section>
      {/if}
    </div>
  </div>
</div>

<style>
  .settings-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(8, 12, 22, 0.55);
    z-index: var(--z-login-modal, 200);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }
  .settings-frame {
    width: min(26rem, 100%);
    max-height: min(38rem, 90vh);
    background: white;
    border-radius: 0.75rem;
    box-shadow: 0 18px 38px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid hsl(0, 0%, 92%);
  }
  .settings-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    color: hsl(0, 0%, 15%);
  }
  .settings-body {
    padding: 1rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .settings-loading {
    margin: 0;
    color: hsl(0, 0%, 45%);
  }
  .settings-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid hsl(0, 0%, 93%);
  }
  .settings-section:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  .settings-section h3 {
    margin: 0 0 0.25rem;
    font-size: 0.875rem;
    font-weight: 700;
    color: hsl(5, 53%, 32%);
  }
  .settings-status {
    margin: 0;
    font-size: 0.8125rem;
    color: hsl(0, 0%, 35%);
  }
  .settings-link-btn {
    align-self: flex-start;
    background: none;
    border: none;
    padding: 0;
    color: hsl(5, 53%, 32%);
    font-weight: 600;
    font-size: 0.8125rem;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .settings-link-btn--danger {
    color: #9a1b1b;
  }
  .settings-danger-zone {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    border: 1px solid #f0c9c9;
    border-radius: 0.5rem;
    background: #fdf6f6;
  }
  .settings-danger-zone p {
    margin: 0;
    font-size: 0.8125rem;
    color: hsl(0, 0%, 30%);
  }
  .settings-danger-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
</style>
