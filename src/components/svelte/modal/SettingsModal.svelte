<script lang="ts">
  import ModalHeader from "./ModalHeader.svelte";
  import SettingsSection from "./SettingsSection.svelte";
  import DataStorage from "./DataStorage.svelte";
  import {
    readThemePreference,
    setThemePreference,
    type ThemePreference,
  } from "@lib/theme";
  import "../map-chrome/map-chrome.css";

  /**
   * Settings holds only what changes how the app behaves on this device.
   * Map style, basemap, terrain, pins and the other map layers live in
   * Layers; help, feedback and the about links sit next to Settings in the
   * You sheet. The app has no notification preferences, so there is no
   * Notifications section.
   */
  const APPEARANCE_OPTIONS: { value: ThemePreference; label: string }[] = [
    { value: "system", label: "System" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ];
  let appearance = $state<ThemePreference>(readThemePreference());

  function chooseAppearance(value: ThemePreference) {
    appearance = value;
    setThemePreference(value);
  }

  /** Arrow keys move the choice, as in any radio group. */
  function handleRadioKeydown(event: KeyboardEvent) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const at = APPEARANCE_OPTIONS.findIndex((o) => o.value === appearance);
    const next =
      APPEARANCE_OPTIONS[
        (at + step + APPEARANCE_OPTIONS.length) % APPEARANCE_OPTIONS.length
      ];
    if (!next) return;
    chooseAppearance(next.value);
    const group = event.currentTarget as HTMLElement;
    group
      .querySelector<HTMLElement>(`[data-value="${next.value}"]`)
      ?.focus();
  }
</script>

<div class="settings-screen">
  <ModalHeader id="settings-modal-title" title="Settings" />
  <div class="settings-screen__scroll map-chrome-scroll">
    <SettingsSection variant="list" title="Appearance">
      <div class="settings-screen__row">
        <span class="settings-screen__label" id="settings-appearance">Theme</span>
        <!-- svelte-ignore a11y_interactive_supports_focus -->
        <div
          class="settings-screen__segmented"
          role="radiogroup"
          aria-labelledby="settings-appearance"
          aria-describedby="settings-appearance-hint"
          onkeydown={handleRadioKeydown}
        >
          {#each APPEARANCE_OPTIONS as option (option.value)}
            <button
              type="button"
              role="radio"
              data-value={option.value}
              class="settings-screen__segment"
              aria-checked={appearance === option.value}
              tabindex={appearance === option.value ? 0 : -1}
              onclick={() => chooseAppearance(option.value)}
            >
              {option.label}
            </button>
          {/each}
        </div>
        <p id="settings-appearance-hint" class="settings-screen__hint">
          System follows your device's light or dark setting.
        </p>
      </div>
    </SettingsSection>

    <DataStorage />
  </div>
</div>

<style>
  .settings-screen {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
  }

  .settings-screen__scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .settings-screen__row {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.25rem 1rem 0.5rem;
  }

  .settings-screen__label {
    font-size: 1rem;
    line-height: 1.5;
    color: var(--theme-text, hsl(0, 0%, 12%));
  }

  .settings-screen__hint {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.4;
    color: var(--theme-text-2, hsl(0, 0%, 40%));
  }

  /* Material segmented button: 40px, outlined, the choice filled. */
  .settings-screen__segmented {
    display: grid;
    grid-auto-columns: 1fr;
    grid-auto-flow: column;
    border: 1px solid var(--theme-border-strong, hsl(0, 0%, 47%));
    border-radius: 999px;
    overflow: hidden;
  }

  .settings-screen__segment {
    min-height: 2.5rem;
    min-width: 0;
    padding: 0 0.75rem;
    border: none;
    border-left: 1px solid var(--theme-border-strong, hsl(0, 0%, 47%));
    background: transparent;
    color: var(--theme-text, hsl(0, 0%, 12%));
    font: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    text-align: center;
    cursor: pointer;
  }

  .settings-screen__segment:first-child {
    border-left: none;
  }

  .settings-screen__segment[aria-checked="true"] {
    background: var(--theme-accent-soft, hsl(345, 60%, 93%));
    color: var(--theme-accent-text, hsl(345, 75%, 28%));
  }

  .settings-screen__segment:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(345, 75%, 31%));
    outline-offset: -3px;
  }
</style>
