<script lang="ts">
  /**
   * Elevation profile: one series (elevation over distance from Station 1),
   * labeled axes, named stops marked on the line, a crosshair readout on
   * hover or touch. The figure carries a text description for screen readers.
   */
  import type { MeasuredTrailStop, ProfilePoint } from "@lib/makiling-trail";
  import { formatKm, formatMeters } from "@lib/makiling-trail";

  type Props = {
    profile: readonly ProfilePoint[];
    stops?: readonly MeasuredTrailStop[];
    selectedStopId?: string | null;
  };

  let { profile, stops = [], selectedStopId = null }: Props = $props();

  const W = 320;
  const H = 140;
  const M = { top: 10, right: 10, bottom: 28, left: 40 };
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;

  const maxDistance = $derived(profile.at(-1)?.distance ?? 1);
  const minEle = $derived(
    Math.floor(Math.min(...profile.map((p) => p.elevation)) / 100) * 100,
  );
  const maxEle = $derived(
    Math.ceil(Math.max(...profile.map((p) => p.elevation)) / 100) * 100,
  );

  const x = (distance: number) => M.left + (distance / maxDistance) * plotW;
  const y = (elevation: number) =>
    M.top + plotH - ((elevation - minEle) / Math.max(1, maxEle - minEle)) * plotH;

  const linePath = $derived(
    profile
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.distance).toFixed(1)},${y(p.elevation).toFixed(1)}`)
      .join(""),
  );
  const areaPath = $derived(
    `${linePath}L${x(maxDistance).toFixed(1)},${M.top + plotH}L${M.left},${M.top + plotH}Z`,
  );

  const yTicks = $derived.by(() => {
    const step = maxEle - minEle > 600 ? 500 : 200;
    const ticks: number[] = [];
    for (let v = Math.ceil(minEle / step) * step; v <= maxEle; v += step) ticks.push(v);
    return ticks;
  });
  const xTicks = $derived.by(() => {
    const ticks: number[] = [];
    for (let km = 0; km * 1000 <= maxDistance; km += 2) ticks.push(km);
    return ticks;
  });

  /** Only stops with something to say get a dot; the plain markers would crowd it. */
  const markedStops = $derived(stops.filter((s) => s.description !== undefined));

  const summary = $derived(
    `Elevation profile from Station 1 at ${formatMeters(profile[0]?.elevation ?? 0)} to Peak 2 at ${formatMeters(profile.at(-1)?.elevation ?? 0)} over ${formatKm(maxDistance)}. ` +
      markedStops
        .map((s) => `${s.name}: ${formatKm(s.distanceMeters)}, ${formatMeters(s.elevationMeters)}`)
        .join(". "),
  );

  let hover = $state<ProfilePoint | null>(null);
  let svgEl = $state<SVGSVGElement | null>(null);

  function track(event: PointerEvent) {
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    const distance = Math.min(maxDistance, Math.max(0, ((px - M.left) / plotW) * maxDistance));
    let best = profile[0] ?? null;
    for (const p of profile) {
      if (best && Math.abs(p.distance - distance) < Math.abs(best.distance - distance)) best = p;
    }
    hover = best;
  }
</script>

<figure class="trail-profile">
  <svg
    bind:this={svgEl}
    viewBox={`0 0 ${W} ${H}`}
    role="img"
    aria-label={summary}
    onpointermove={track}
    onpointerdown={track}
    onpointerleave={() => (hover = null)}
  >
    {#each yTicks as tick (tick)}
      <line class="grid" x1={M.left} x2={W - M.right} y1={y(tick)} y2={y(tick)} />
      <text class="tick" x={M.left - 6} y={y(tick)} text-anchor="end" dominant-baseline="middle"
        >{tick}</text
      >
    {/each}
    {#each xTicks as km (km)}
      <text class="tick" x={x(km * 1000)} y={M.top + plotH + 14} text-anchor="middle">{km}</text>
    {/each}
    <text class="axis-label" x={M.left + plotW / 2} y={H - 2} text-anchor="middle"
      >Distance from Station 1 (km)</text
    >
    <text
      class="axis-label"
      transform={`translate(10 ${M.top + plotH / 2}) rotate(-90)`}
      text-anchor="middle">Elevation (m)</text
    >
    <path class="area" d={areaPath} />
    <path class="line" d={linePath} />
    {#each markedStops as stop (stop.id)}
      <circle
        class="stop"
        class:stop--selected={stop.id === selectedStopId}
        cx={x(stop.distanceMeters)}
        cy={y(stop.elevationMeters)}
        r={stop.id === selectedStopId ? 5 : 4}
      >
        <title>{stop.name}, {formatMeters(stop.elevationMeters)}</title>
      </circle>
    {/each}
    {#if hover}
      <line
        class="crosshair"
        x1={x(hover.distance)}
        x2={x(hover.distance)}
        y1={M.top}
        y2={M.top + plotH}
      />
      <circle class="hover-dot" cx={x(hover.distance)} cy={y(hover.elevation)} r="4" />
    {/if}
  </svg>
  <figcaption class="trail-profile__readout" aria-live="polite">
    {#if hover}
      {formatKm(hover.distance)} from Station 1, {formatMeters(hover.elevation)}
    {:else}
      Touch or hover the chart for elevation along the way.
    {/if}
  </figcaption>
</figure>

<style>
  .trail-profile {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  svg {
    width: 100%;
    height: auto;
    display: block;
    touch-action: pan-y;
    overflow: visible;
  }

  .grid {
    stroke: var(--theme-border, hsl(0 0% 88%));
    stroke-width: 1;
  }

  .tick,
  .axis-label {
    fill: var(--theme-text-2, hsl(0 0% 38%));
    font-size: 9px;
    font-variant-numeric: tabular-nums;
  }

  .axis-label {
    font-size: 9.5px;
  }

  .area {
    fill: var(--trail-color, #15803d);
    opacity: 0.14;
  }

  .line {
    fill: none;
    stroke: var(--trail-color, #15803d);
    stroke-width: 2;
    stroke-linejoin: round;
  }

  .stop {
    fill: var(--trail-color, #15803d);
    stroke: var(--theme-surface, #fff);
    stroke-width: 2;
  }

  .stop--selected {
    stroke: var(--theme-text, #222);
  }

  .crosshair {
    stroke: var(--theme-text-2, hsl(0 0% 38%));
    stroke-width: 1;
    stroke-dasharray: 3 3;
  }

  .hover-dot {
    fill: var(--theme-surface, #fff);
    stroke: var(--trail-color, #15803d);
    stroke-width: 2;
  }

  .trail-profile__readout {
    font-size: 0.75rem;
    color: var(--theme-text-2, hsl(0 0% 38%));
    font-variant-numeric: tabular-nums;
  }
</style>
