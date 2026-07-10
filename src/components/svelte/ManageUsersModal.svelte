<script lang="ts">
  import LoadingIndicator from "@ui/LoadingIndicator.svelte";
  import IconButton from "@ui/IconButton.svelte";
  import { fade, fly } from "svelte/transition";
  import { X, Users } from "@lucide/svelte";
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

  let showCreateForm = $state(false);
  let newUsername = $state("");
  let newDisplayName = $state("");
  let newEmail = $state("");
  let newPassword = $state("");
  let newRole = $state<"admin" | "editor" | "contributor">("editor");
  let creating = $state(false);
  let createError = $state<string | null>(null);

  async function loadUsers() {
    loadError = null;
    try {
      const res = await fetch("/api/admin/users", { credentials: "same-origin" });
      if (!res.ok) {
        loadError = "Could not load users.";
        return;
      }
      const data = (await res.json()) as { users: ManagedUser[] };
      users = data.users;
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

  async function createUser() {
    creating = true;
    createError = null;
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername,
          displayName: newDisplayName || undefined,
          email: newEmail || undefined,
          password: newPassword,
          role: newRole,
        }),
      });
      const data = await res.json().catch(() => ({}) as { error?: string });
      if (!res.ok) {
        createError = data.error ?? "Could not create account.";
        return;
      }
      toastStore.show(`${newUsername} created. Share the temp password with them.`, "success");
      newUsername = "";
      newDisplayName = "";
      newEmail = "";
      newPassword = "";
      newRole = "editor";
      showCreateForm = false;
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
    <header class="settings-header">
      <div class="settings-title" id="manage-users-title">
        <Users size={16} aria-hidden="true" />
        <span>Manage users</span>
      </div>
      <IconButton size="sm" shape="rounded" label="Close" onclick={close}>
        <X size={18} aria-hidden="true" />
      </IconButton>
    </header>

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
                <small>{user.username}{user.email ? ` · ${user.email}` : ""}</small>
              </div>
              <select
                value={user.role}
                disabled={savingUserId === user.id}
                onchange={(e) =>
                  changeRole(user, (e.currentTarget as HTMLSelectElement).value as ManagedUser["role"])}
              >
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="contributor">Contributor</option>
              </select>
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

        {#if !showCreateForm}
          <EntityEditorSubmitButton
            label="Invite admin / editor"
            variant="secondary"
            onclick={() => (showCreateForm = true)}
          />
        {:else}
          <section class="settings-section">
            <h3>Invite admin / editor</h3>
            <EntityEditorFormField label="Username" inputId="new-user-username">
              {#snippet control()}
                <input id="new-user-username" bind:value={newUsername} disabled={creating} />
              {/snippet}
            </EntityEditorFormField>
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
            <EntityEditorFormField
              label="Temporary password"
              inputId="new-user-password"
              hint="At least 10 characters. Share it with them out of band; they can change it after signing in."
            >
              {#snippet control()}
                <input
                  id="new-user-password"
                  type="password"
                  bind:value={newPassword}
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
            <div class="settings-danger-actions">
              <EntityEditorSubmitButton
                label="Create account"
                savingLabel="Creating…"
                saving={creating}
                disabled={!newUsername.trim() || newPassword.length < 10}
                onclick={createUser}
              />
              <EntityEditorSubmitButton
                label="Cancel"
                variant="secondary"
                disabled={creating}
                onclick={() => (showCreateForm = false)}
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
    gap: 1rem;
  }
  .settings-loading {
    margin: 0;
    color: hsl(0, 0%, 45%);
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
    color: hsl(5, 53%, 32%);
  }
  .settings-link-btn {
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
  .settings-danger-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
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
    border: 1px solid hsl(0, 0%, 92%);
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
    color: hsl(0, 0%, 45%);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
