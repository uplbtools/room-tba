<script lang="ts">
  import Search from "@lucide/svelte/icons/search";

  type Props = {
    value: string;
    placeholder: string;
    label: string;
    search?: boolean;
    oninput: (event: Event) => void;
  };

  let { value, placeholder, label, search = false, oninput }: Props = $props();
</script>

<label class="entity-panel-filter" class:entity-panel-filter--search={search}>
  {#if search}
    <span class="entity-panel-filter__icon" aria-hidden="true">
      <Search size={16} />
    </span>
  {/if}
  <span class="sr-only">{label}</span>
  <input type="search" {value} {placeholder} aria-label={label} {oninput} />
</label>

<style>
  @import "./entity-detail.css";
</style>
