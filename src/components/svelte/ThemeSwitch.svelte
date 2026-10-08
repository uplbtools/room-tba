<script lang="ts">
  import Monitor from "@lucide/svelte/icons/monitor";
  import Moon from "@lucide/svelte/icons/moon";
  import Sun from "@lucide/svelte/icons/sun";
  import type { Component } from "svelte";
  import {
    getResolvedTheme,
    onThemeChange,
    readThemePreference,
    setThemePreference,
    type ThemePreference,
  } from "@lib/theme";
  import "./map-chrome/map-chrome.css";

  /**
   * Appearance control shared by Settings, the app menu and the desktop top
   * bar. `segmented` is the System / Light / Dark row; `toggle` is a one-tap
   * sun/moon button that flips between Light and Dark.
   */
  type Props = {
    variant?: "segmented" | "toggle";
    /** id of the visible label for the segmented group. */
    labelledBy?: string;
  };

  let { variant = "segmented", labelledBy }: Props = $props();

  const OPTIONS: { value: ThemePreference; label: string; icon: Component }[] =
    [
      { value: "system", label: "System", icon: Monitor },
      { value: "light", label: "Light", icon: Sun },
      { value: "dark", label: "Dark", icon: Moon },
    ];

  let preference = $state<ThemePreference>(readThemePreference());
  let resolved = $state(getResolvedTheme());

  // Another switch (menu vs top bar vs Settings), another tab or the OS can
  // change the theme while this one is mounted.
  $effect(() =>
    onThemeChange((theme) => {
      resolved = theme;
      preference = readThemePreference();
    }),
  );

  function choose(value: ThemePreference) {
    preference = value;
    setThemePreference(value);
  }
</script>

{#if variant === "toggle"}
  <button
    type="button"
    class="theme-switch__toggle"
    aria-label={resolved === "dark"
      ? "Switch to light mode"
      : "Switch to dark mode"}
    title={resolved === "dark" ? "Light mode" : "Dark mode"}
    onclick={() => choose(resolved === "dark" ? "light" : "dark")}
  >
    {#if resolved === "dark"}
      <Sun size={16} aria-hidden="true" />
    {:else}
      <Moon size={16} aria-hidden="true" />
    {/if}
  </button>
{:else}
  <div
    class="theme-switch"
    role="group"
    aria-labelledby={labelledBy}
    aria-label={labelledBy ? undefined : "Theme"}
  >
    {#each OPTIONS as option (option.value)}
      {@const Icon = option.icon}
      <button
        type="button"
        class="map-chrome-chip theme-switch__option"
        class:map-chrome-chip--toggle-active={preference === option.value}
        aria-pressed={preference === option.value}
        onclick={() => choose(option.value)}
      >
        <Icon size={13} aria-hidden="true" />
        {option.label}
      </button>
    {/each}
  </div>
{/if}

<style>
  .theme-switch {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  /* Chip height is 28px for density elsewhere; a theme row is a primary
     control, so give it a finger-sized target. */
  .theme-switch__option {
    min-height: 2rem;
    height: 2rem;
    gap: 0.3rem;
  }

  .theme-switch__toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    margin: 0;
    padding: 0;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: var(--theme-text, #332529);
    cursor: pointer;
  }

  .theme-switch__toggle:hover {
    background: var(--theme-accent-soft, #feeaea);
  }

  .theme-switch__toggle:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
    outline-offset: -2px;
  }
</style>
