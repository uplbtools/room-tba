<script lang="ts">
  import LoadingIndicator from "@ui/LoadingIndicator.svelte";
  import ModalHeader from "./ModalHeader.svelte";
  import { fade, fly } from "svelte/transition";
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
  import "../editor/entity-editor.css";
  import { MediaQuery } from "svelte/reactivity";

  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");

  type ManagedUser = {
    id: number;
    username: string;
    displayName: string;
    email: string | null;
    role: "admin" | "editor" | "contributor";
    isActive: boolean;
  };

  let frameEl = $state<HTMLDivElement | null>(null);
  let users = $state<ManagedUser[] | null>(null);
  let loadError = $state<string | null>(null);
  let rowError = $state<string | null>(null);
  let savingUserId = $state<number | null>(null);

  type PendingInvite = {
    id: number;
    email: string;
    role: ManagedUser["role"];
    expiresAt: string;
  };
  let invites = $state<PendingInvite[]>([]);

  let showCreateForm = $state(false);
  let newDisplayName = $state("");
  let newEmail = $state("");
  let newRole = $state<"admin" | "editor" | "contributor">("editor");
  let creating = $state(false);
  let createError = $state<string | null>(null);
  /** Shown when the invite email could not be sent, so it can be shared. */
  let manualInviteUrl = $state<string | null>(null);

  /** Role change waiting for confirmation (never applied on select change). */
  let pendingRole = $state<{
    user: ManagedUser;
    role: ManagedUser["role"];
  } | null>(null);
  /** Bumped to reset a select back to the saved role after Cancel. */
  let selectResetKey = $state(0);

  const ROLE_NAMES: Record<ManagedUser["role"], string> = {
    admin: "an admin",
    editor: "an editor",
    contributor: "a contributor",
  };
  const ROLE_CONSEQUENCES: Record<ManagedUser["role"], string> = {
    admin:
      "Admins can publish, review, and manage every account, including other admins.",
    editor: "Editors publish edits directly and review suggestions.",
    contributor:
      "Contributors can only suggest edits; they lose publishing and review.",
  };

  async function loadUsers() {
    loadError = null;
    try {
      const res = await fetch("/api/admin/users", { credentials: "same-origin" });
      if (!res.ok) {
        loadError = "Could not load users.";
        return;
      }
      const data = (await res.json()) as {
        users: ManagedUser[];
        invites?: PendingInvite[];
      };
      users = data.users;
      invites = data.invites ?? [];
    } catch {
      loadError = "Network error loading users.";
    }
  }

  $effect(() => {
    if (adminAuthStore.manageUsersOpen) void loadUsers();
  });

  function close() {
    adminAuthStore.closeManageUsers();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") close();
  }

  $effect(() => {
    if (!frameEl) return;
    return trapFocus(frameEl, { onEscape: close });
  });

  function requestRoleChange(user: ManagedUser, role: ManagedUser["role"]) {
    if (role === user.role) return;
    rowError = null;
    pendingRole = { user, role };
  }

  function cancelRoleChange() {
    pendingRole = null;
    selectResetKey += 1;
  }

  async function confirmRoleChange() {
    if (!pendingRole) return;
    const { user, role } = pendingRole;
    pendingRole = null;
    await changeRole(user, role);
    selectResetKey += 1;
  }

  async function changeRole(user: ManagedUser, role: ManagedUser["role"]) {
    if (role === user.role) return;
    savingUserId = user.id;
    rowError = null;
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json().catch(() => ({}) as { error?: string });
      if (!res.ok) {
        rowError = data.error ?? "Could not update role.";
        return;
      }
      users = (users ?? []).map((u) => (u.id === user.id ? { ...u, role } : u));
    } catch {
      rowError = "Network error. Try again.";
    } finally {
      savingUserId = null;
    }
  }

  async function toggleActive(user: ManagedUser) {
    savingUserId = user.id;
    rowError = null;
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const data = await res.json().catch(() => ({}) as { error?: string });
      if (!res.ok) {
        rowError = data.error ?? "Could not update account.";
        return;
      }
      users = (users ?? []).map((u) =>
        u.id === user.id ? { ...u, isActive: !user.isActive } : u,
      );
    } catch {
      rowError = "Network error. Try again.";
    } finally {
      savingUserId = null;
    }
  }

  async function revokeInvite(id: number) {
    rowError = null;
    try {
      const res = await fetch(`/api/admin/users/invite?id=${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) {
        rowError = "Could not revoke the invite.";
        return;
      }
      invites = invites.filter((invite) => invite.id !== id);
    } catch {
      rowError = "Network error. Try again.";
    }
  }

  async function createUser() {
    creating = true;
    createError = null;
    manualInviteUrl = null;
    try {
      const res = await fetch("/api/admin/users/invite", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          displayName: newDisplayName || undefined,
          role: newRole,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        emailed?: boolean;
        inviteUrl?: string | null;
      };
      if (!res.ok) {
        createError = data.error ?? "Could not send the invite.";
        return;
      }
      if (data.emailed) {
        toastStore.show(`Invite sent to ${newEmail}.`, "success");
        showCreateForm = false;
      } else {
        // Email is down or not configured: hand the link to the admin.
        manualInviteUrl = data.inviteUrl ?? null;
      }
      newDisplayName = "";
      newEmail = "";
      newRole = "editor";
      await loadUsers();
    } catch {
      createError = "Network error. Try again.";
    } finally {
      creating = false;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="settings-overlay" transition:fade={overlayFade(reducedMotion.current)}>
  <div
    bind:this={frameEl}
    class="settings-frame"
    role="dialog"
    aria-modal="true"
    aria-labelledby="manage-users-title"
    in:fly={modalContentReveal(reducedMotion.current)}
    out:fly={modalContentDismiss(reducedMotion.current)}
  >
    <ModalHeader
      id="manage-users-title"
      title="Manage users"
      onclose={close}
      closeLabel="Close"
    />

    <div class="settings-body">
      {#if loadError}
        <EntityEditorMessage variant="error" message={loadError} />
      {:else if !users}
        <p class="settings-loading"><LoadingIndicator /></p>
      {:else}
        {#if rowError}
          <EntityEditorMessage variant="error" message={rowError} />
        {/if}
        <ul class="user-list">
          {#each users as user (user.id)}
            <li class="user-row" class:user-row--inactive={!user.isActive}>
              <div class="user-row-info">
                <strong>{user.displayName}</strong>
                <small>{user.username}{user.email ? ` (${user.email})` : ""}</small>
              </div>
              {#key selectResetKey}
                <select
                  value={user.role}
                  aria-label={`Role for ${user.displayName}`}
                  disabled={savingUserId === user.id || pendingRole !== null}
                  onchange={(e) =>
                    requestRoleChange(
                      user,
                      (e.currentTarget as HTMLSelectElement)
                        .value as ManagedUser["role"],
                    )}
                >
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="contributor">Contributor</option>
                </select>
              {/key}
              <button
                type="button"
                class="settings-link-btn"
                disabled={savingUserId === user.id}
                onclick={() => toggleActive(user)}
              >
                {user.isActive ? "Deactivate" : "Reactivate"}
              </button>
            </li>
          {/each}
        </ul>

        {#if pendingRole}
          <div
            class="role-confirm"
            class:role-confirm--admin={pendingRole.role === "admin"}
            role="alertdialog"
            aria-labelledby="role-confirm-title"
            aria-describedby="role-confirm-body"
          >
            <p class="role-confirm-title" id="role-confirm-title">
              Make {pendingRole.user.displayName} {ROLE_NAMES[pendingRole.role]}?
            </p>
            <p class="role-confirm-body" id="role-confirm-body">
              {ROLE_CONSEQUENCES[pendingRole.role]}
            </p>
            <div class="settings-danger-actions">
              <EntityEditorSubmitButton
                label="Cancel"
                variant="secondary"
                onclick={cancelRoleChange}
              />
              <EntityEditorSubmitButton
                label={pendingRole.role === "admin" ? "Make admin" : "Change role"}
                variant={pendingRole.role === "admin" ? "danger" : "primary"}
                onclick={confirmRoleChange}
              />
            </div>
          </div>
        {/if}

        {#if invites.length > 0}
          <section class="settings-section">
            <h3>Pending invites</h3>
            <ul class="user-list">
              {#each invites as invite (invite.id)}
                <li class="user-row">
                  <div class="user-row-info">
                    <strong>{invite.email}</strong>
                    <small>
                      {invite.role}, expires {new Date(
                        `${invite.expiresAt.replace(" ", "T")}Z`,
                      ).toLocaleDateString()}
                    </small>
                  </div>
                  <button
                    type="button"
                    class="settings-link-btn"
                    onclick={() => revokeInvite(invite.id)}
                  >
                    Revoke
                  </button>
                </li>
              {/each}
            </ul>
          </section>
        {/if}

        {#if !showCreateForm}
          <EntityEditorSubmitButton
            label="Invite admin / editor"
            variant="secondary"
            onclick={() => (showCreateForm = true)}
          />
        {:else}
          <section class="settings-section">
            <h3>Invite admin / editor</h3>
            <p class="settings-hint">
              They get an email link to choose their own username and password.
              No temporary passwords to pass around.
            </p>
            <EntityEditorFormField label="Display name" inputId="new-user-display-name">
              {#snippet control()}
                <input
                  id="new-user-display-name"
                  bind:value={newDisplayName}
                  disabled={creating}
                />
              {/snippet}
            </EntityEditorFormField>
            <EntityEditorFormField label="Email" inputId="new-user-email">
              {#snippet control()}
                <input
                  id="new-user-email"
                  type="email"
                  bind:value={newEmail}
                  disabled={creating}
                />
              {/snippet}
            </EntityEditorFormField>
            <EntityEditorFormField label="Role" inputId="new-user-role">
              {#snippet control()}
                <select id="new-user-role" bind:value={newRole} disabled={creating}>
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="contributor">Contributor</option>
                </select>
              {/snippet}
            </EntityEditorFormField>
            {#if createError}
              <EntityEditorMessage variant="error" message={createError} />
            {/if}
            {#if manualInviteUrl}
              <EntityEditorMessage
                variant="error"
                message="The invite email could not be sent. Share this one-time link with them directly:"
              />
              <input
                class="invite-url"
                readonly
                value={manualInviteUrl}
                aria-label="Invite link"
                onfocus={(e) => (e.currentTarget as HTMLInputElement).select()}
              />
            {/if}
            <div class="settings-danger-actions">
              <EntityEditorSubmitButton
                label="Send invite"
                savingLabel="Sending…"
                saving={creating}
                disabled={!newEmail.trim()}
                onclick={createUser}
              />
              <EntityEditorSubmitButton
                label="Cancel"
                variant="secondary"
                disabled={creating}
                onclick={() => {
                  showCreateForm = false;
                  manualInviteUrl = null;
                }}
              />
            </div>
          </section>
        {/if}
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
    width: min(28rem, 100%);
    max-height: min(38rem, 90vh);
    background: var(--theme-surface, white);
    border-radius: 1.75rem;
    box-shadow: 0 18px 38px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .settings-body {
    padding: 1rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .settings-loading {
    margin: 0;
    color: var(--theme-text-2, hsl(0, 0%, 45%));
  }
  .settings-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .settings-section h3 {
    margin: 0 0 0.25rem;
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
  }
  .settings-link-btn {
    background: none;
    border: none;
    padding: 0;
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
    font-weight: 600;
    font-size: 0.75rem;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .settings-danger-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .settings-hint {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--theme-text-2, hsl(0, 0%, 45%));
  }
  .role-confirm {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    border: 1px solid var(--theme-border, hsl(0, 0%, 88%));
    border-radius: 0.5rem;
    background: var(--theme-surface-2, hsl(0, 0%, 98%));
  }
  .role-confirm--admin {
    border-color: var(--theme-accent-border, #edc9c9);
    background: var(--theme-accent-soft, #fdf7f7);
  }
  .role-confirm-title {
    margin: 0;
    font-weight: 700;
    font-size: 0.875rem;
  }
  .role-confirm-body {
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.45;
  }
  .invite-url {
    width: 100%;
    box-sizing: border-box;
    font-size: 0.75rem;
  }
  .user-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .user-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    border: 1px solid var(--theme-border, hsl(0, 0%, 92%));
    border-radius: 0.5rem;
  }
  .user-row--inactive {
    opacity: 0.55;
  }
  .user-row-info {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-width: 0;
  }
  .user-row-info strong {
    font-size: 0.8125rem;
  }
  .user-row-info small {
    font-size: 0.6875rem;
    color: var(--theme-text-2, hsl(0, 0%, 45%));
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
