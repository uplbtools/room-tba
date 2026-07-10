<script lang="ts">
  import Users from "@lucide/svelte/icons/users";
  import Building2 from "@lucide/svelte/icons/building-2";
  import Pencil from "@lucide/svelte/icons/pencil";
  import {
    modalStore,
    queryStore,
    sidePanelStore,
  } from "@lib/store.svelte";
  import { adminAuthStore } from "@lib/stores/admin-auth.svelte";
  import { openCampusBrowse } from "@lib/browse-campus";

  function browseOrganizations() {
    openCampusBrowse(queryStore, sidePanelStore, "organizations");
    modalStore.closeModal();
  }

  function signUp() {
    modalStore.closeModal();
    adminAuthStore.openLogin("signup");
  }
</script>

<div class="orgs-modal map-chrome-scroll">
  <header class="orgs-modal__header">
    <h2 id="student-orgs-modal-title">Student organizations</h2>
    <p class="orgs-modal__lead">
      Room TBA lists UPLB student organizations and their tambayans so you can
      find where an org is based and how to reach it.
    </p>
  </header>

  <ul class="orgs-modal__points">
    <li>
      <Users size={18} aria-hidden="true" />
      <span>
        <strong>Find an org.</strong> Search its name, or browse the Orgs category.
        Each listing shows its category, host building, and contact links.
      </span>
    </li>
    <li>
      <Building2 size={18} aria-hidden="true" />
      <span>
        <strong>Locate the tambayan.</strong> Listings pin to the org's own location
        when known, otherwise to its host building, so directions always resolve.
      </span>
    </li>
    <li>
      <Pencil size={18} aria-hidden="true" />
      <span>
        <strong>Keep it accurate.</strong> Open any listing and hit
        <em>Edit</em> to suggest a fix. Signed-in contributors have their suggestions
        credited to them.
      </span>
    </li>
  </ul>

  <div class="orgs-modal__actions">
    <button
      type="button"
      class="orgs-modal__btn orgs-modal__btn--primary"
      onclick={browseOrganizations}
    >
      Browse organizations
    </button>
    {#if !adminAuthStore.isLoggedIn}
      <button type="button" class="orgs-modal__btn" onclick={signUp}>
        Sign up to contribute
      </button>
    {/if}
  </div>
</div>

<style>
  @import "../map-chrome/map-chrome.css";

  .orgs-modal {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
    max-height: calc(100vh - 4rem);
  }

  .orgs-modal__header h2 {
    margin: 0 0 0.5rem;
    font-size: 1.25rem;
    font-weight: 700;
  }

  .orgs-modal__lead {
    margin: 0;
    font-size: 0.9375rem;
    line-height: 1.5;
    color: hsl(0, 0%, 35%);
  }

  .orgs-modal__points {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }

  .orgs-modal__points li {
    display: flex;
    gap: 0.625rem;
    align-items: flex-start;
    font-size: 0.875rem;
    line-height: 1.5;
    color: hsl(0, 0%, 25%);
  }

  .orgs-modal__points :global(svg) {
    flex: 0 0 auto;
    margin-top: 0.125rem;
    color: hsl(265, 45%, 48%);
  }

  .orgs-modal__points strong {
    color: hsl(0, 0%, 12%);
  }

  .orgs-modal__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }

  .orgs-modal__btn {
    flex: 1 1 auto;
    padding: 0.5rem 1rem;
    border: 1px solid hsl(265, 45%, 80%);
    border-radius: 0.5rem;
    background: white;
    color: hsl(265, 45%, 40%);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
  }

  .orgs-modal__btn:hover,
  .orgs-modal__btn:focus-visible {
    background: hsl(265, 45%, 97%);
  }

  .orgs-modal__btn--primary {
    background: hsl(265, 45%, 48%);
    border-color: hsl(265, 45%, 48%);
    color: white;
  }

  .orgs-modal__btn--primary:hover,
  .orgs-modal__btn--primary:focus-visible {
    background: hsl(265, 45%, 42%);
  }
</style>
