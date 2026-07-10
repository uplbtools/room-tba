<script lang="ts">
  import Search from "@lucide/svelte/icons/search";
  import Map from "@lucide/svelte/icons/map";
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import PencilLine from "@lucide/svelte/icons/pencil-line";
  import ClipboardCheck from "@lucide/svelte/icons/clipboard-check";
  import CircleCheck from "@lucide/svelte/icons/circle-check";
  import UserRound from "@lucide/svelte/icons/user-round";
  import WifiOff from "@lucide/svelte/icons/wifi-off";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import Plus from "@lucide/svelte/icons/plus";
  import CommunityBrandIcon from "@ui/community/CommunityBrandIcon.svelte";
  import { DISCORD_URL, MESSENGER_CONTRIBUTE_TARGET } from "@constants/community-links";

  const features = [
    { icon: Search, label: "Search rooms", hint: "Room codes and buildings" },
    { icon: Map, label: "Explore the map", hint: "Buildings, dorms, and pins" },
    { icon: CalendarDays, label: "Plan classes", hint: "Build a draft schedule" },
    { icon: CalendarDays, label: "Events", hint: "Where things happen" },
    {
      icon: UserRound,
      label: "Browse freely",
      hint: "No sign-in required",
    },
    {
      icon: WifiOff,
      label: "Offline-friendly",
      hint: "Cache after your first visit",
    },
    {
      icon: PencilLine,
      label: "Suggest fixes",
      hint: "Optional login to edit",
    },
  ] as const;

  const steps = [
    {
      title: "Suggest",
      text: "Edit a room, building, or event. Use + on the map to add new data.",
      icon: PencilLine,
      mock: "suggest" as const,
    },
    {
      title: "Review",
      text: "Volunteer editors check proposals in the app.",
      icon: ClipboardCheck,
      mock: "review" as const,
    },
    {
      title: "Publish",
      text: "Approved changes go live for everyone.",
      icon: CircleCheck,
      mock: "publish" as const,
    },
  ] as const;
</script>

<section class="guide" aria-labelledby="guide-heading">
  <h3 id="guide-heading" class="guide-heading">What you can do here</h3>
  <ul class="feature-grid">
    {#each features as feature (feature.label)}
      <li class="feature-card">
        <span class="feature-icon" aria-hidden="true">
          <feature.icon size={16} strokeWidth={2.25} />
        </span>
        <span class="feature-copy">
          <span class="feature-label">{feature.label}</span>
          <span class="feature-hint">{feature.hint}</span>
        </span>
      </li>
    {/each}
  </ul>

  <h4 class="steps-heading">How crowdsourcing works</h4>
  <ol class="step-flow">
    {#each steps as step, index (step.title)}
      <li class="step-card">
        <div class="step-head">
          <span class="step-badge">{index + 1}</span>
          <span class="step-icon" aria-hidden="true">
            <step.icon size={14} strokeWidth={2.25} />
          </span>
          <strong class="step-title">{step.title}</strong>
        </div>

        <div class="step-mock" aria-hidden="true">
          {#if step.mock === "suggest"}
            <div class="mock-map">
              <span class="mock-grid"></span>
              <span class="mock-pin"></span>
              <span class="mock-plus"><Plus size={9} strokeWidth={3} /></span>
            </div>
          {:else if step.mock === "review"}
            <div class="mock-review-list">
              <div class="mock-review-row done">
                <span class="mock-check"></span>
                <span class="mock-line short"></span>
              </div>
              <div class="mock-review-row">
                <span class="mock-check pending"></span>
                <span class="mock-line"></span>
              </div>
            </div>
          {:else}
            <div class="mock-map live">
              <span class="mock-grid"></span>
              <span class="mock-pin live"></span>
              <span class="mock-live-badge"><CircleCheck size={10} /></span>
            </div>
          {/if}
        </div>

        <p class="step-text">{step.text}</p>
      </li>
      {#if index < steps.length - 1}
        <li class="step-connector" aria-hidden="true">
          <ArrowRight size={14} strokeWidth={2.5} />
        </li>
      {/if}
    {/each}
  </ol>

  <p class="guide-footnote">
    Questions or want to volunteer? Use <strong>Suggest an edit</strong> on the
    map, or reach us on
    <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" class="guide-community-link">
      <CommunityBrandIcon brand="discord" size={14} />
      Discord
    </a>
    /
    <a
      href={MESSENGER_CONTRIBUTE_TARGET}
      target="_blank"
      rel="noopener noreferrer"
      class="guide-community-link"
    >
      <CommunityBrandIcon brand="messenger" size={14} />
      Messenger
    </a>.
  </p>
</section>

<style>
  .guide {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    text-align: left;
  }

  .guide-heading,
  .steps-heading {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 700;
    color: hsl(5, 53%, 28%);
  }

  .feature-grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.375rem;
  }

  .feature-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.25rem;
    padding: 0.5rem 0.375rem;
    border: 1px solid hsl(5, 28%, 86%);
    border-radius: 0.5rem;
    background: white;
    min-width: 0;
  }

  .feature-icon {
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 0.4375rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: hsl(5, 45%, 94%);
    color: hsl(5, 53%, 32%);
  }

  .feature-copy {
    display: flex;
    flex-direction: column;
    gap: 0.0625rem;
    min-width: 0;
    width: 100%;
  }

  .feature-label {
    font-size: 0.6875rem;
    font-weight: 700;
    color: hsl(0, 0%, 18%);
    line-height: 1.15;
  }

  .feature-hint {
    font-size: 0.625rem;
    line-height: 1.25;
    color: hsl(0, 0%, 30%);
  }

  .step-flow {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    align-items: stretch;
    gap: 0.25rem;
  }

  .step-card {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    padding: 0.5rem;
    border: 1px solid hsl(5, 35%, 88%);
    border-radius: 0.5rem;
    background: hsl(5, 45%, 98%);
  }

  .step-head {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    min-width: 0;
  }

  .step-badge {
    width: 1.125rem;
    height: 1.125rem;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.625rem;
    font-weight: 800;
    color: white;
    background: hsl(5, 53%, 35%);
    flex-shrink: 0;
  }

  .step-icon {
    color: hsl(5, 53%, 32%);
    display: inline-flex;
    flex-shrink: 0;
  }

  .step-title {
    font-size: 0.6875rem;
    color: hsl(5, 53%, 28%);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .step-mock {
    border-radius: 0.375rem;
    border: 1px solid hsl(5, 20%, 88%);
    background: hsl(0, 0%, 99%);
    padding: 0.375rem;
    min-height: 2.75rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .mock-map {
    position: relative;
    height: 2.25rem;
    border-radius: 0.3125rem;
    background: hsl(145, 18%, 92%);
    overflow: hidden;
  }

  .mock-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(hsla(0, 0%, 100%, 0.35) 1px, transparent 1px),
      linear-gradient(90deg, hsla(0, 0%, 100%, 0.35) 1px, transparent 1px);
    background-size: 0.625rem 0.625rem;
  }

  .mock-pin {
    position: absolute;
    left: 42%;
    top: 38%;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 999px 999px 999px 0;
    rotate: -45deg;
    background: hsl(5, 75%, 42%);
    border: 1px solid white;
  }

  .mock-pin.live {
    background: hsl(145, 45%, 38%);
  }

  .mock-plus {
    position: absolute;
    right: 0.25rem;
    bottom: 0.25rem;
    width: 1rem;
    height: 1rem;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: hsl(5, 75%, 28%);
    color: white;
  }

  .mock-live-badge {
    position: absolute;
    right: 0.2rem;
    top: 0.2rem;
    color: hsl(145, 45%, 34%);
    background: white;
    border-radius: 999px;
    display: inline-flex;
  }

  .mock-review-list {
    display: flex;
    flex-direction: column;
    gap: 0.3125rem;
  }

  .mock-review-row {
    display: flex;
    align-items: center;
    gap: 0.3125rem;
  }

  .mock-check {
    width: 0.625rem;
    height: 0.625rem;
    border-radius: 0.15rem;
    border: 1px solid hsl(0, 0%, 72%);
    flex-shrink: 0;
  }

  .mock-check.pending {
    background: white;
  }

  .mock-review-row.done .mock-check {
    background: hsl(145, 45%, 38%);
    border-color: hsl(145, 45%, 38%);
  }

  .mock-line {
    height: 0.3125rem;
    flex: 1;
    border-radius: 999px;
    background: hsl(0, 0%, 88%);
  }

  .mock-line.short {
    max-width: 70%;
  }

  .step-text {
    margin: 0;
    font-size: 0.625rem;
    line-height: 1.35;
    color: hsl(0, 0%, 28%);
  }

  .step-connector {
    list-style: none;
    display: flex;
    align-items: center;
    color: hsl(5, 35%, 38%);
    flex-shrink: 0;
    align-self: center;
  }

  .guide-footnote {
    margin: 0.125rem 0 0;
    font-size: 0.6875rem;
    line-height: 1.45;
    color: hsl(0, 0%, 32%);
  }

  .guide-footnote a {
    color: hsl(5, 53%, 32%);
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .guide-community-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    vertical-align: middle;
  }

  @media screen and (max-width: 36rem) {
    .feature-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .step-flow {
      flex-direction: column;
    }

    /* Stacked cards would stretch the mock graphics edge to edge; pin them
       as a compact thumbnail beside the copy instead. */
    .step-card {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 5.5rem;
      grid-template-areas:
        "head mock"
        "text mock";
      align-items: center;
      column-gap: 0.625rem;
      row-gap: 0.25rem;
    }

    .step-head {
      grid-area: head;
    }

    .step-mock {
      grid-area: mock;
      min-height: 0;
      align-self: center;
    }

    .step-text {
      grid-area: text;
    }

    .step-connector {
      justify-content: center;
      rotate: 90deg;
    }
  }
</style>
