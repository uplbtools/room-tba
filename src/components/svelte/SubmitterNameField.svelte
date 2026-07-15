<script lang="ts">
  import { onMount } from "svelte";
  import {
    MAX_SUBMITTER_NAME_LENGTH,
    MIN_SUBMITTER_NAME_LENGTH,
  } from "@constants/proposals";
  import {
    readSubmitterName,
    scheduleSubmitterNameSave,
  } from "@lib/contributor-drafts";
  import "./map-chrome/map-chrome.css";

  type Props = {
    id: string;
    label?: string;
    placeholder?: string;
    value?: string;
    variant?: "editor" | "inline" | "block";
    showHint?: boolean;
    hintClass?: string;
    fieldClass?: string;
  };

  let {
    id,
    label = "What should we call you?",
    placeholder = "First name or nickname",
    value = $bindable(""),
    variant = "editor",
    showHint = variant === "editor",
    hintClass = "submitter-name-hint",
    fieldClass = "editor-field",
  }: Props = $props();

  const atLimit = $derived(value.length >= MAX_SUBMITTER_NAME_LENGTH);
  const wrapperClass = $derived.by(() => {
    if (variant === "inline") return "map-chrome-name-field";
    if (variant === "block")
      return "map-chrome-name-field map-chrome-name-field--block";
    return fieldClass;
  });
  const labelClass = $derived(variant === "inline" ? "sr-only" : undefined);
  let nameReady = $state(false);

  onMount(() => {
    if (!value.trim()) {
      const stored = readSubmitterName();
      if (stored) value = stored;
    }
    nameReady = true;
  });

  $effect(() => {
    if (!nameReady || typeof localStorage === "undefined") return;
    scheduleSubmitterNameSave(value);
  });
</script>

<div class={wrapperClass}>
  <label for={id} class={labelClass}>{label}</label>
  <input
    {id}
    bind:value
    maxlength={MAX_SUBMITTER_NAME_LENGTH}
    autocomplete="name"
    {placeholder}
    aria-describedby={showHint ? `${id}-hint` : undefined}
    title={showHint ? undefined : `2–${MAX_SUBMITTER_NAME_LENGTH} characters`}
  />
  {#if showHint}
    <p
      id="{id}-hint"
      class={hintClass}
      class:at-limit={atLimit}
      aria-live="polite"
    >
      {value.length}/{MAX_SUBMITTER_NAME_LENGTH}
      · at least {MIN_SUBMITTER_NAME_LENGTH} characters so editors can follow up
    </p>
  {/if}
</div>

<style>
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .submitter-name-hint {
    margin: 0.125rem 0 0;
    font-size: 0.8125rem;
    line-height: 1.4;
    font-weight: 500;
    color: hsl(0, 0%, 34%);
  }

  .submitter-name-hint.at-limit {
    color: hsl(5, 53%, 38%);
  }
</style>
