<script lang="ts">
  import Phone from "@lucide/svelte/icons/phone";
  import UserPlus from "@lucide/svelte/icons/user-plus";
  import ModalHeader from "./ModalHeader.svelte";
  import {
    EMERGENCY_HOTLINE_CATEGORIES,
    emergencyHotlinesVCard,
    emergencyHotlineTel,
    formatHotlineNumber,
  } from "@constants/emergency-hotlines";

  // Built on the device, so saving works offline like the list itself.
  function saveContacts() {
    const blob = new Blob([emergencyHotlinesVCard()], {
      type: "text/vcard;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "uplb-emergency-hotlines.vcf";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
</script>

<section class="hotlines-modal">
  <ModalHeader
    id="hotlines-modal-title"
    title="Emergency hotlines"
    description="Tap a number to call. Save these contacts before you need them."
  >
    {#snippet actions()}
      <button type="button" class="hotlines-modal__save" onclick={saveContacts}>
        <UserPlus size={16} aria-hidden="true" />
        Save contacts
      </button>
    {/snippet}
  </ModalHeader>

  <div class="hotlines-modal__scroll map-chrome-scroll">
    {#each EMERGENCY_HOTLINE_CATEGORIES as category}
      <section aria-labelledby="hotlines-{category.name}">
        <h3 id="hotlines-{category.name}">{category.name}</h3>
        {#each category.entries as entry}
          <div class="hotlines-modal__entry">
            <strong>{entry.name}</strong>
            <div class="hotlines-modal__numbers">
              {#each entry.numbers as number}
                <a
                  href={emergencyHotlineTel(number)}
                  aria-label="Call {entry.name}, {formatHotlineNumber(number)}"
                >
                  <Phone size={16} aria-hidden="true" />
                  {formatHotlineNumber(number)}
                </a>
              {/each}
            </div>
          </div>
        {/each}
      </section>
    {/each}
  </div>
</section>

<style>
  .hotlines-modal {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    flex-direction: column;
    gap: 0.5rem;
    padding-bottom: 0.25rem;
  }

  h3 {
    margin: 0;
    color: hsl(5 53% 28%);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .hotlines-modal__save {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 2.75rem;
    padding: 0 0.875rem;
    border: 1px solid hsl(5 34% 78%);
    border-radius: 0.625rem;
    background: white;
    color: hsl(5 53% 32%);
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 700;
    cursor: pointer;
  }

  .hotlines-modal__save:focus-visible,
  a:focus-visible {
    outline: 2px solid hsl(5 53% 32%);
    outline-offset: 1px;
  }

  .hotlines-modal__scroll {
    display: flex;
    min-height: 0;
    flex-direction: column;
    gap: 1rem;
    overflow-y: auto;
    padding: 0 0.5rem 0.25rem;
  }

  .hotlines-modal__scroll > section {
    display: grid;
    gap: 0.625rem;
  }

  .hotlines-modal__entry {
    display: grid;
    gap: 0.375rem;
    color: hsl(0 0% 22%);
    font-size: 0.875rem;
    line-height: 1.35;
  }

  .hotlines-modal__numbers {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  a {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 2.75rem;
    padding: 0 0.75rem;
    border: 1px solid hsl(5 34% 82%);
    border-radius: 0.625rem;
    background: hsl(0 100% 99%);
    color: hsl(5 53% 32%);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    text-decoration: none;
    white-space: nowrap;
  }

  @media (hover: hover) {
    a:hover,
    .hotlines-modal__save:hover {
      border-color: hsl(5 34% 68%);
      background: hsl(0 78% 97%);
    }
  }
</style>
