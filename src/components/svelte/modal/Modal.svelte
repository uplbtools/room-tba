<script lang="ts">
  import { modalStore } from "@lib/store.svelte";
  import { fade, fly } from "svelte/transition";
  import {
    modalContentDismiss,
    modalContentReveal,
    overlayFade,
  } from "@lib/motion";
  import { MediaQuery } from "svelte/reactivity";
  import LandingModal from "./LandingModal.svelte";
  import ScheduleModal from "./ScheduleModal.svelte";
  import FilterModalContent from "./FilterModalContent.svelte";
  import X from "@lucide/svelte/icons/x";

  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");
</script>

{#if modalStore.open}
  <div class="modal-set">
    <!-- svelte-ignore a11y_consider_explicit_label -->
    <button
      class="overlay"
      onclick={() => modalStore.closeModal()}
      transition:fade={overlayFade(reducedMotion.current)}
    ></button>
    <div
      class="modal-content {modalStore.type === 'landing'
        ? 'landing-modal-container'
        : ''}"
      id="modal-content"
      in:fly={modalContentReveal(reducedMotion.current)}
      out:fly={modalContentDismiss(reducedMotion.current)}
    >
      {#if modalStore.type === "landing"}
        <LandingModal />
      {:else if modalStore.type === "schedule-expand"}
        <button
          class="modal-content__close-icon"
          onclick={() => modalStore.closeModal()}
        >
          <X size={20} />
        </button>
        <ScheduleModal />
      {:else if modalStore.type === "filter"}
        <FilterModalContent />
      {/if}
    </div>
  </div>
{/if}

<style>
  :global(hr) {
    margin: 1rem 0;
    border-width: 2px;
    border-color: hsl(0, 0%, 90%);
    border-style: solid;
  }
  :global(mark) {
    background-color: hsl(5, 53%, 90%);
  }
  .modal-set {
    position: fixed;
    top: 50%;
    left: 50%;
    translate: -50% -50%;
    padding: 0.75rem;
    width: 100%;
    height: 100dvh;
    z-index: 100;
    display: flex;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
  }
  .modal-content {
    position: relative;
    flex: 0 1 64rem;
    max-height: 90dvh;
    min-height: 0;
    background-color: white;
    z-index: inherit;
    border-radius: 1rem;
    padding: 0.5rem;
    display: flex;
    flex-flow: column nowrap;
    overflow: hidden;
    .modal-content__close-icon {
      position: absolute;
      right: 0.25rem;
      top: 0.25rem;
      color: hsl(0, 0%, 18%);
      padding: 0.375rem;
      border-radius: 0.25rem;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: #fff;
      &:hover {
        background-color: #f0f0f0;
      }
    }
  }
  .landing-modal-container {
    flex: 0 1 48rem;
    width: 100%;
    max-height: min(92dvh, 52rem);
    padding: 0;
    overflow: hidden;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  @media only screen and (max-width: 31.25rem) {
    .modal-content {
      padding: 0.25rem;
    }
    .landing-modal-container {
      padding: 0;
    }
  }
  .overlay {
    all: unset;
    width: 100%;
    height: 100%;
    inset: 0;
    position: absolute;
    background-color: hsla(0, 0%, 8%, 0.42);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    cursor: pointer;
  }
</style>
