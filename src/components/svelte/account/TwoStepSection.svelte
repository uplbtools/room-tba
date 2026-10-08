<script lang="ts">
  import { onMount } from "svelte";
  import SettingsSection from "@ui/modal/SettingsSection.svelte";
  import EntityEditorFormField from "@ui/editor/EntityEditorFormField.svelte";
  import EntityEditorSubmitButton from "@ui/editor/EntityEditorSubmitButton.svelte";
  import EntityEditorMessage from "@ui/editor/EntityEditorMessage.svelte";

  /** Staff two-step verification in Account settings (auth audit item 19). */
  type Status = {
    available: boolean;
    enabled: boolean;
    recoveryCodesLeft: number;
    required: boolean;
    graceUntil: string | null;
  };

  let status = $state<Status | null>(null);
  let loadError = $state<string | null>(null);
  let enrollment = $state<{ secret: string; otpauthUri: string } | null>(null);
  /** "disable" or "codes" while asking for a current code first. */
  let confirming = $state<"disable" | "codes" | null>(null);
  let code = $state("");
  let busy = $state(false);
  let error = $state<string | null>(null);
  let recoveryCodes = $state<string[] | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/account/mfa", { credentials: "same-origin" });
      if (!res.ok) {
        loadError = "Could not load two-step verification.";
        return;
      }
      status = (await res.json()) as Status;
    } catch {
      loadError = "Network error loading two-step verification.";
    }
  }

  onMount(load);

  async function post(body: Record<string, unknown>) {
    busy = true;
    error = null;
    try {
      const res = await fetch("/api/account/mfa", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        error = typeof data.error === "string" ? data.error : "That did not work.";
        return null;
      }
      return data;
    } catch {
      error = "Network error. Try again.";
      return null;
    } finally {
      busy = false;
    }
  }

  async function start() {
    const data = await post({ action: "start" });
    if (data) enrollment = data as { secret: string; otpauthUri: string };
  }

  async function confirmEnrollment() {
    const data = await post({ action: "confirm", code: code.trim() });
    if (!data) return;
    recoveryCodes = data.recoveryCodes as string[];
    enrollment = null;
    code = "";
    await load();
  }

  async function confirmWithCode() {
    if (!confirming) return;
    const action = confirming === "disable" ? "disable" : "recovery_codes";
    const data = await post({ action, code: code.trim() });
    if (!data) return;
    if (confirming === "codes") recoveryCodes = data.recoveryCodes as string[];
    confirming = null;
    code = "";
    await load();
  }

  function cancel() {
    enrollment = null;
    confirming = null;
    code = "";
    error = null;
  }
</script>

{#if loadError}
  <EntityEditorMessage variant="error" message={loadError} />
{:else if status}
  <SettingsSection
    title="Two-step verification"
    description={status.required
      ? "Required for admins: a code from an authenticator app at each password sign-in. Signing in with Google also counts."
      : "Ask for a code from an authenticator app at each password sign-in. Signing in with Google also counts."}
  >
    {#snippet meta()}
      <span class="settings-current">
        {#if !status?.available}
          Not available on this server yet.
        {:else if status?.enabled}
          On. {status.recoveryCodesLeft} recovery code{status.recoveryCodesLeft === 1
            ? ""
            : "s"} left.
        {:else}
          Off.
        {/if}
      </span>
    {/snippet}

    {#if recoveryCodes}
      <p class="twostep-lead">
        Save these recovery codes somewhere safe. Each signs you in once if you
        lose your phone. They will not be shown again.
      </p>
      <ul class="twostep-codes" aria-label="Recovery codes">
        {#each recoveryCodes as recovery (recovery)}
          <li><code>{recovery}</code></li>
        {/each}
      </ul>
    {:else if enrollment}
      <p class="twostep-lead">
        Add Room TBA to your authenticator app, then enter the 6-digit code it
        shows.
      </p>
      <a class="twostep-link" href={enrollment.otpauthUri}>Open in authenticator app</a>
      <p class="twostep-secret">
        Or enter this key by hand:
        <code>{enrollment.secret.replace(/(.{4})/g, "$1 ").trim()}</code>
      </p>
    {/if}
    {#if enrollment || confirming}
      <EntityEditorFormField
        label={confirming ? "Current code or recovery code" : "Verification code"}
        inputId="twostep-code"
      >
        {#snippet control()}
          <input
            id="twostep-code"
            autocomplete="one-time-code"
            inputmode={confirming ? "text" : "numeric"}
            maxlength="12"
            bind:value={code}
            disabled={busy}
          />
        {/snippet}
      </EntityEditorFormField>
    {/if}
    {#if error}
      <EntityEditorMessage variant="error" message={error} />
    {/if}

    {#snippet footer()}
      {#if recoveryCodes}
        <EntityEditorSubmitButton
          label="I saved them"
          onclick={() => (recoveryCodes = null)}
        />
      {:else if enrollment}
        <EntityEditorSubmitButton label="Cancel" variant="secondary" onclick={cancel} />
        <EntityEditorSubmitButton
          label="Turn on"
          savingLabel="Checking…"
          saving={busy}
          disabled={!code.trim()}
          onclick={confirmEnrollment}
        />
      {:else if confirming}
        <EntityEditorSubmitButton label="Cancel" variant="secondary" onclick={cancel} />
        <EntityEditorSubmitButton
          label={confirming === "disable" ? "Turn off" : "Show new codes"}
          savingLabel="Checking…"
          saving={busy}
          disabled={!code.trim()}
          variant={confirming === "disable" ? "danger" : "primary"}
          onclick={confirmWithCode}
        />
      {:else if status?.enabled}
        <EntityEditorSubmitButton
          label="New recovery codes"
          variant="secondary"
          onclick={() => (confirming = "codes")}
        />
        <EntityEditorSubmitButton
          label="Turn off"
          variant="secondary"
          onclick={() => (confirming = "disable")}
        />
      {:else if status?.available}
        <EntityEditorSubmitButton
          label="Set up"
          savingLabel="Starting…"
          saving={busy}
          onclick={start}
        />
      {/if}
    {/snippet}
  </SettingsSection>
{/if}

<style>
  .twostep-lead,
  .twostep-secret {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  .twostep-secret code,
  .twostep-codes code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .twostep-link {
    align-self: flex-start;
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
    font-weight: 600;
    font-size: 0.875rem;
  }
  .twostep-codes {
    list-style: none;
    margin: 0;
    padding: 0.75rem;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.375rem;
    border: 1px solid var(--theme-border, hsl(0, 0%, 90%));
    border-radius: 0.5rem;
  }
</style>
