<script lang="ts">
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import { UPLB_RESOURCE_SECTIONS } from "@constants/uplb-resources";
</script>

<div class="resources-modal">
  <header class="resources-modal__header">
    <h2 id="uplb-resources-modal-title">UPLB student resources</h2>
    <p>
      Official and local links checked on 11 July 2026. Offices, deadlines,
      fees, and organization recognition can change—always confirm on the live
      source before acting.
    </p>
  </header>

  <div class="resources-modal__body map-chrome-scroll">
    {#each UPLB_RESOURCE_SECTIONS as section (section.title)}
      <section class="resources-section" aria-labelledby="resource-section-{section.title}">
        <h3 id="resource-section-{section.title}">{section.title}</h3>
        <ul>
          {#each section.resources as resource (resource.href)}
            <li>
              <a href={resource.href} target="_blank" rel="noopener noreferrer">
                <span>
                  <strong>{resource.name}</strong>
                  <span class="resources-section__description">{resource.description}</span>
                  {#if resource.note}
                    <span class="resources-section__note">{resource.note}</span>
                  {/if}
                </span>
                <ExternalLink size={16} aria-hidden="true" />
              </a>
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>
</div>

<style>
  @import "../map-chrome/map-chrome.css";

  .resources-modal {
    box-sizing: border-box;
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    width: 100%;
    min-height: 0;
    padding: 1.5rem;
  }

  .resources-modal__header {
    flex: 0 0 auto;
    padding-right: 2rem;
  }

  .resources-modal__header h2,
  .resources-section h3 {
    margin: 0;
  }

  .resources-modal__header h2 {
    font-size: 1.25rem;
  }

  .resources-modal__header p {
    margin: 0.5rem 0 1rem;
    color: hsl(0 0% 35%);
    font-size: 0.875rem;
    line-height: 1.45;
  }

  .resources-modal__body {
    min-height: 0;
    overflow-y: auto;
  }

  .resources-section + .resources-section {
    margin-top: 1.25rem;
  }

  .resources-section h3 {
    font-size: 0.9375rem;
  }

  .resources-section ul {
    display: grid;
    gap: 0.5rem;
    margin: 0.5rem 0 0;
    padding: 0;
    list-style: none;
  }

  .resources-section a {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.625rem 0.75rem;
    border: 1px solid hsl(265 45% 88%);
    border-radius: 0.5rem;
    color: inherit;
    text-decoration: none;
  }

  .resources-section a:hover,
  .resources-section a:focus-visible {
    border-color: hsl(265 45% 55%);
    background: hsl(265 45% 97%);
  }

  .resources-section a :global(svg) {
    flex: 0 0 auto;
    margin-top: 0.125rem;
    color: hsl(265 45% 45%);
  }

  .resources-section strong,
  .resources-section__description,
  .resources-section__note {
    display: block;
  }

  .resources-section strong {
    font-size: 0.875rem;
  }

  .resources-section__description,
  .resources-section__note {
    margin-top: 0.125rem;
    color: hsl(0 0% 38%);
    font-size: 0.8125rem;
    line-height: 1.35;
  }

  .resources-section__note {
    color: hsl(20 50% 32%);
  }
</style>
