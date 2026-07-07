<script lang="ts">
  import EntityEditorFormField from "@ui/editor/EntityEditorFormField.svelte";
  import EntityEditorSubmitButton from "@ui/editor/EntityEditorSubmitButton.svelte";
  import EntityEditorMessage from "@ui/editor/EntityEditorMessage.svelte";
  import "./editor/entity-editor.css";

  const token = $derived(
    new URLSearchParams(window.location.search).get("token"),
  );
  let newPassword = $state("");
  let saving = $state(false);
  let error = $state<string | null>(null);
  let done = $state(false);

  async function submit(e: Event) {
    e.preventDefault();
    if (!token) return;
    saving = true;
    error = null;
    try {
      const res = await fetch("/api/account/confirm-password-reset", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json().catch(() => ({}) as { error?: string });
      if (!res.ok) {
        error = data.error ?? "Could not reset password.";
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
  {#if !token}
    <EntityEditorMessage
      variant="error"
      message="This link is missing its token. Request a new password reset from the editor login."
    />
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
        hint="At least 10 characters."
      >
        {#snippet control()}
          <input
            id="reset-password-new"
            type="password"
            autocomplete="new-password"
            bind:value={newPassword}
            disabled={saving}
            required
          />
        {/snippet}
      </EntityEditorFormField>
      {#if error}
        <EntityEditorMessage variant="error" message={error} />
      {/if}
      <EntityEditorSubmitButton
        type="submit"
        label="Set new password"
        savingLabel="Saving…"
        saving={saving}
        disabled={newPassword.length < 10}
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
    color: hsl(5, 53%, 32%);
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
</style>
