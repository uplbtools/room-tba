<script lang="ts">
  import {
    EMERGENCY_HOTLINE_CATEGORIES,
    emergencyHotlineTel,
  } from "@constants/emergency-hotlines";
</script>

<section class="hotlines-modal">
  <header>
    <p class="hotlines-modal__eyebrow">Emergency</p>
    <h2>Emergency hotlines</h2>
    <p>Tap a number to call. Save these contacts before you need them.</p>
  </header>

  <div class="hotlines-modal__scroll map-chrome-scroll">
    {#each EMERGENCY_HOTLINE_CATEGORIES as category}
      <section aria-labelledby="hotlines-{category.name}">
        <h3 id="hotlines-{category.name}">{category.name}</h3>
        {#each category.entries as entry}
          <div class="hotlines-modal__entry">
            <strong>{entry.name}</strong>
            <div class="hotlines-modal__numbers">
              {#each entry.numbers as number}
                <a href={emergencyHotlineTel(number)}>{number}</a>
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
    gap: 0.625rem;
    padding: 0.5rem 0.5rem 0.25rem;
  }

  header {
    padding-right: 2.25rem;
  }

  h2,
  h3,
  p {
    margin: 0;
  }

  h2 {
    color: hsl(0 0% 15%);
    font-size: 1rem;
  }

  h3 {
    color: hsl(5 53% 28%);
    font-size: 0.875rem;
  }

  header > p:last-child,
  .hotlines-modal__eyebrow {
    color: hsl(0 0% 42%);
    font-size: 0.75rem;
  }

  .hotlines-modal__eyebrow {
    margin-bottom: 0.125rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .hotlines-modal__scroll {
    display: flex;
    min-height: 0;
    flex-direction: column;
    gap: 1rem;
    overflow-y: auto;
    padding-right: 0.375rem;
  }

  .hotlines-modal__scroll > section {
    display: grid;
    gap: 0.5rem;
  }

  .hotlines-modal__entry {
    display: grid;
    gap: 0.25rem;
    color: hsl(0 0% 22%);
    font-size: 0.875rem;
    line-height: 1.4;
  }

  .hotlines-modal__numbers {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 0.75rem;
  }

  a {
    color: hsl(5 53% 32%);
    font-weight: 600;
  }
</style>
