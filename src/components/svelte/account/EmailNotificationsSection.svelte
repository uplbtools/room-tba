<script lang="ts">
  import { onMount } from "svelte";
  import SettingsSection from "@ui/modal/SettingsSection.svelte";
  import EntityEditorMessage from "@ui/editor/EntityEditorMessage.svelte";

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
  <div class="notify-row">
    <span class="notify-text">
      <span class="notify-label" id={`notify-${key}-label`}>{label}</span>
      <span class="notify-supporting" id={`notify-${key}-desc`}>{supporting}</span>
    </span>
    <button
      type="button"
      class="notify-switch"
      role="switch"
      aria-checked={prefs?.[key] ?? false}
      aria-labelledby={`notify-${key}-label`}
      aria-describedby={`notify-${key}-desc`}
      disabled={!prefs || saving === key}
      onclick={() => toggle(key)}
    >
      <span class="notify-thumb" aria-hidden="true"></span>
    </button>
  </div>
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

<style>
  .notify-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    min-height: 3.5rem;
  }
  .notify-text {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-width: 0;
  }
  .notify-label {
    font-size: 1rem;
    color: var(--theme-text, hsl(0, 0%, 12%));
  }
  .notify-supporting {
    font-size: 0.875rem;
    line-height: 1.4;
    color: var(--theme-text-2, hsl(0, 0%, 42%));
  }
  .notify-switch {
    position: relative;
    flex: 0 0 auto;
    width: 3.25rem;
    height: 2rem;
    padding: 0;
    border: 2px solid var(--theme-border-strong, hsl(0, 0%, 55%));
    border-radius: 999px;
    background: var(--theme-surface-3, hsl(0, 0%, 92%));
    cursor: pointer;
  }
  .notify-thumb {
    position: absolute;
    top: 50%;
    left: 0.375rem;
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    background: var(--theme-border-strong, hsl(0, 0%, 45%));
    transform: translateY(-50%);
    transition:
      left 150ms ease,
      width 150ms ease,
      height 150ms ease;
  }
  .notify-switch[aria-checked="true"] {
    border-color: var(--theme-accent-fill, #7b1113);
    background: var(--theme-accent-fill, #7b1113);
  }
  .notify-switch[aria-checked="true"] .notify-thumb {
    left: calc(100% - 1.75rem);
    width: 1.5rem;
    height: 1.5rem;
    background: #fff;
  }
  .notify-switch:disabled {
    opacity: 0.38;
    cursor: default;
  }
  .notify-switch:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    .notify-thumb {
      transition: none;
    }
  }
</style>
