<script lang="ts">
  import { onMount } from "svelte";
  import SettingsSection from "@ui/modal/SettingsSection.svelte";
  import EntityEditorMessage from "@ui/editor/EntityEditorMessage.svelte";
  import SettingsRow from "@ui/modal/SettingsRow.svelte";

  /**
   * Email notification switches (auth audit item 20). Each switch saves on
   * change, like Android and Google account settings. Password resets and
   * email confirmations always send; these are only the optional emails.
   */
  type Prefs = { digest: boolean; reviewNotices: boolean };

  let { isStaff }: { isStaff: boolean } = $props();

  let prefs = $state<Prefs | null>(null);
  let saving = $state<keyof Prefs | null>(null);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      const res = await fetch("/api/account/notifications", {
        credentials: "same-origin",
      });
      if (!res.ok) {
        error = "Could not load your email preferences.";
        return;
      }
      prefs = (await res.json()) as Prefs;
    } catch {
      error = "Network error loading your email preferences.";
    }
  });

  async function toggle(key: keyof Prefs) {
    if (!prefs) return;
    const next = !prefs[key];
    saving = key;
    error = null;
    prefs = { ...prefs, [key]: next };
    try {
      const res = await fetch("/api/account/notifications", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
      prefs = (await res.json()) as Prefs;
    } catch {
      prefs = { ...prefs, [key]: !next };
      error = "Could not save. Try again.";
    } finally {
      saving = null;
    }
  }
</script>

{#snippet switchRow(key: keyof Prefs, label: string, supporting: string)}
  <SettingsRow
    {label}
    {supporting}
    checked={prefs?.[key] ?? false}
    disabled={!prefs || saving === key}
    onclick={() => toggle(key)}
  />
{/snippet}

<SettingsSection
  title="Email notifications"
  description="Optional emails. Password and sign-in emails always send."
>
  {#if isStaff}
    {@render switchRow(
      "digest",
      "Daily review digest",
      "A morning summary of suggestions waiting for review.",
    )}
  {/if}
  {@render switchRow(
    "reviewNotices",
    "Review notices",
    isStaff
      ? "When your suggestions are reviewed, and copies of team review decisions."
      : "When a reviewer approves, closes, or asks for changes to your suggestions.",
  )}
  {#if error}
    <EntityEditorMessage variant="error" message={error} />
  {/if}
</SettingsSection>
