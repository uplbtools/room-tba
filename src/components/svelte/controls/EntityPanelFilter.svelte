<script lang="ts">
  import Search from "@lucide/svelte/icons/search";
  import X from "@lucide/svelte/icons/x";

  type Props = {
    value: string;
    placeholder: string;
    label: string;
    search?: boolean;
    oninput: (event: Event) => void;
    /** Shows an X that clears the field while it has text. */
    onclear?: () => void;
  };

  let {
    value,
    placeholder,
    label,
    search = false,
    oninput,
    onclear,
  }: Props = $props();

  let input = $state<HTMLInputElement | null>(null);

  function clear() {
    onclear?.();
    input?.focus();
  }
</script>

<!-- The X is a sibling of the label, not inside it: a label may only hold
     the one control it names. -->
<div
  class="entity-panel-filter"
  class:entity-panel-filter--search={search}
  class:entity-panel-filter--clearable={!!onclear}
>
  <label class="entity-panel-filter__field">
    {#if search}
      <span class="entity-panel-filter__icon" aria-hidden="true">
        <Search size={16} />
      </span>
    {/if}
    <span class="sr-only">{label}</span>
    <input
      bind:this={input}
      type="search"
      {value}
      {placeholder}
      aria-label={label}
      {oninput}
    />
  </label>
  {#if onclear && value}
    <button
      type="button"
      class="entity-panel-filter__clear"
      aria-label="Clear filter"
      onclick={clear}
    >
      <X size={14} aria-hidden="true" />
    </button>
  {/if}
</div>

<style>
  @import "./entity-detail.css";
</style>
