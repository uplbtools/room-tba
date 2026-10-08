<script lang="ts">
  import Users from "@lucide/svelte/icons/users";
  import { locationStore } from "@lib/store.svelte";
  import { type RouteAtStop, routeDirections } from "@lib/transit-direction";
  import {
    type JeepReport,
    type ReportDirection,
    REPORT_COOLDOWN_MS,
    frequencyText,
    lastReportText,
    recentFullReports,
    reportTimesFor,
    summarizeReports,
    transitStopKey,
  } from "@lib/transit-reports";
  import {
    CROWDING_ESTIMATE_NOTE,
    CROWDING_REPORTS_NOTE,
    crowdingHint,
  } from "@lib/transit-crowding";
  import {
    type StopPeaksResponse,
    fetchStopPeaks,
    fetchStopReports,
    postJeepReport,
  } from "@lib/transit-reports-client";

  type Props = {
    /** Routes serving this kerb (from `routesAtStop`), the open one first. */
    entries: RouteAtStop[];
  };

  let { entries }: Props = $props();

  type Row = {
    key: string;
    routeId: string;
    name: string;
    color: string;
    stopKey: string;
    direction: ReportDirection | null;
    directionLabel: string | null;
  };

  // Two-way routes get a row per direction: a Kaliwa and a Kanan jeep are
  // different jeeps, with their own gaps.
  const rows = $derived(
    entries.flatMap((entry): Row[] => {
      const stop = entry.route.stops[entry.stopIndex];
      if (!stop) return [];
      const base = {
        routeId: entry.route.id,
        name: entry.route.name,
        color: entry.route.color,
        stopKey: transitStopKey(stop),
      };
      const directions = routeDirections(entry.route.id);
      if (!directions) {
        return [
          { ...base, key: base.routeId, direction: null, directionLabel: null },
        ];
      }
      return (["forward", "reverse"] as const).map((direction) => ({
        ...base,
        key: `${base.routeId}:${direction}`,
        direction,
        directionLabel: directions[direction].label,
      }));
    }),
  );

  const stopKeys = $derived([...new Set(rows.map((row) => row.stopKey))]);
  const stopKeysSignature = $derived(stopKeys.join("|"));

  /** Null until loaded, and on failure: then no status line is shown. */
  let reports = $state<JeepReport[] | null>(null);
  let skewMs = $state(0);
  let peaks = $state<StopPeaksResponse | null>(null);
  let now = $state(Date.now());
  /** This device's taps, so buttons rest for the cooldown. */
  let sent = $state<Record<string, { at: number; full: boolean }>>({});
  let pending = $state<string | null>(null);
  let message = $state<{ key: string; text: string; error: boolean } | null>(
    null,
  );
  let loadToken = 0;

  async function loadReports(keys: string[]) {
    const token = ++loadToken;
    const result = await fetchStopReports(keys);
    if (token !== loadToken) return;
    reports = result?.reports ?? null;
    if (result) skewMs = result.skewMs;
  }

  $effect(() => {
    const keys = stopKeysSignature ? stopKeysSignature.split("|") : [];
    reports = null;
    message = null;
    if (keys.length === 0) return;
    void loadReports(keys);
    const poll = setInterval(() => void loadReports(keys), 60_000);
    return () => {
      clearInterval(poll);
      loadToken++;
    };
  });

  // Peaks are per kerb; the open route's stop stands in for it.
  $effect(() => {
    const key = stopKeysSignature.split("|")[0];
    peaks = null;
    if (!key) return;
    let cancelled = false;
    void fetchStopPeaks(key).then((result) => {
      if (!cancelled) peaks = result;
    });
    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    const tick = setInterval(() => {
      now = Date.now();
    }, 30_000);
    return () => clearInterval(tick);
  });

  const clock = $derived(now + skewMs);

  const hint = $derived(
    crowdingHint({
      now: clock,
      peaks: peaks?.peaks ?? [],
      termWindow: peaks?.termWindow ?? null,
      fullReports: reports ? recentFullReports(reports, clock) : 0,
    }),
  );

  function statusFor(row: Row) {
    if (!reports) return null;
    const summary = summarizeReports(
      reportTimesFor(reports, row.routeId, row.stopKey, row.direction),
      clock,
    );
    return {
      last: lastReportText(summary, clock),
      frequency: frequencyText(summary),
    };
  }

  function coolingDown(row: Row, full: boolean) {
    const tap = sent[row.key];
    if (!tap || now - tap.at >= REPORT_COOLDOWN_MS) return false;
    return full ? tap.full : true;
  }

  function rowLabel(row: Row) {
    return row.directionLabel ? `${row.name} (${row.directionLabel})` : row.name;
  }

  async function report(row: Row, full: boolean) {
    pending = `${row.key}:${full}`;
    message = null;
    const coords = locationStore.coords;
    const result = await postJeepReport({
      routeId: row.routeId,
      stopKey: row.stopKey,
      direction: row.direction,
      full,
      location: coords ? { lon: coords[0], lat: coords[1] } : null,
    });
    pending = null;
    if (!result.ok) {
      message = { key: row.key, text: result.error, error: true };
      return;
    }
    const previous = sent[row.key];
    const fresh = !previous || Date.now() - previous.at >= REPORT_COOLDOWN_MS;
    now = Date.now();
    sent[row.key] = {
      at: fresh ? now : previous.at,
      full: full || (!fresh && previous.full),
    };
    message = {
      key: row.key,
      text: full ? "Thanks, marked as full." : "Thanks, reported.",
      error: false,
    };
    void loadReports(stopKeys);
  }
</script>

{#if rows.length > 0}
  <section class="jeep-reports" aria-label="Jeep reports">
    <h3 class="jeep-reports__title">Jeep reports</h3>

    {#if hint}
      <div class="jeep-reports__hint" data-source={hint.source}>
        <Users size={14} aria-hidden="true" />
        <p>
          <span class="jeep-reports__hint-text">{hint.text}</span>
          <span class="jeep-reports__hint-note"
            >{hint.source === "reports"
              ? CROWDING_REPORTS_NOTE
              : CROWDING_ESTIMATE_NOTE}</span
          >
        </p>
      </div>
    {/if}

    <ul class="jeep-reports__rows">
      {#each rows as row (row.key)}
        {@const status = statusFor(row)}
        <li class="jeep-reports__row">
          <p class="jeep-reports__route">
            <span
              class="jeep-reports__dot"
              style:background-color={row.color}
              aria-hidden="true"
            ></span>
            <span class="jeep-reports__name">{row.name}</span>
            {#if row.directionLabel}
              <span class="jeep-reports__direction">{row.directionLabel}</span>
            {/if}
          </p>
          {#if status}
            <p class="jeep-reports__status">
              <span>{status.last}</span>
              {#if status.frequency}
                <span class="jeep-reports__frequency">{status.frequency}</span>
              {/if}
            </p>
          {/if}
          <div class="jeep-reports__actions">
            <button
              type="button"
              class="jeep-reports__button jeep-reports__button--main"
              aria-label={`Jeep is here: ${rowLabel(row)}`}
              disabled={pending !== null || coolingDown(row, false)}
              onclick={() => report(row, false)}
            >
              {coolingDown(row, false) ? "Reported" : "Jeep is here"}
            </button>
            <button
              type="button"
              class="jeep-reports__button"
              aria-label={`It was full: ${rowLabel(row)}`}
              disabled={pending !== null || coolingDown(row, true)}
              onclick={() => report(row, true)}
            >
              {coolingDown(row, true) ? "Marked full" : "It was full"}
            </button>
          </div>
          {#if message?.key === row.key}
            <p
              class="jeep-reports__message"
              class:jeep-reports__message--error={message.error}
              role={message.error ? "alert" : "status"}
            >
              {message.text}
            </p>
          {/if}
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .jeep-reports {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    min-width: 0;
  }

  .jeep-reports__title {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--theme-text-2, hsl(0, 0%, 40%));
  }

  .jeep-reports__hint {
    display: flex;
    align-items: flex-start;
    gap: 0.375rem;
    padding: 0.375rem 0.5rem;
    border: 1px solid var(--theme-amber-border, hsl(35, 80%, 70%));
    border-radius: 0.5rem;
    background: var(--theme-amber-soft, hsl(45, 100%, 97%));
    color: var(--theme-amber-text, hsl(30, 70%, 26%));
    font-size: 0.8125rem;
  }

  .jeep-reports__hint :global(svg) {
    flex-shrink: 0;
    margin-top: 0.125rem;
  }

  .jeep-reports__hint p {
    display: flex;
    flex-direction: column;
    margin: 0;
    min-width: 0;
  }

  .jeep-reports__hint-text {
    font-weight: 700;
  }

  .jeep-reports__hint-note {
    font-size: 0.6875rem;
    opacity: 0.9;
  }

  .jeep-reports__rows {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .jeep-reports__row {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
    padding: 0.5rem 0.625rem;
    border: 1px solid var(--theme-border, hsl(0, 0%, 84%));
    border-radius: 0.5rem;
    background: var(--theme-surface, white);
  }

  .jeep-reports__route {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin: 0;
    min-width: 0;
    font-size: 0.8125rem;
    color: var(--theme-text, hsl(0, 0%, 12%));
  }

  .jeep-reports__dot {
    flex-shrink: 0;
    width: 0.625rem;
    height: 0.625rem;
    border-radius: 50%;
  }

  .jeep-reports__name {
    font-weight: 700;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .jeep-reports__direction {
    flex-shrink: 0;
    color: var(--theme-text-2, hsl(0, 0%, 38%));
    font-size: 0.75rem;
  }

  .jeep-reports__status {
    display: flex;
    flex-wrap: wrap;
    column-gap: 0.75rem;
    margin: 0;
    font-size: 0.75rem;
    color: var(--theme-text-2, hsl(0, 0%, 38%));
  }

  .jeep-reports__frequency {
    font-weight: 600;
    color: var(--theme-text, hsl(0, 0%, 12%));
  }

  .jeep-reports__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .jeep-reports__button {
    min-height: 2.25rem;
    padding: 0.25rem 0.75rem;
    border: 1px solid var(--theme-border, hsl(0, 0%, 84%));
    border-radius: 999px;
    background: var(--theme-surface, white);
    color: var(--theme-text, hsl(0, 0%, 12%));
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
  }

  .jeep-reports__button--main {
    border-color: var(--theme-accent-border, hsl(5, 40%, 72%));
    background: var(--theme-accent-soft, hsl(5, 53%, 96%));
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
  }

  .jeep-reports__button:hover:not(:disabled) {
    border-color: var(--theme-accent-text, hsl(5, 53%, 32%));
  }

  .jeep-reports__button:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
    outline-offset: 1px;
  }

  .jeep-reports__button:disabled {
    cursor: default;
    opacity: 0.65;
  }

  .jeep-reports__message {
    margin: 0;
    font-size: 0.75rem;
    color: var(--theme-green-text, hsl(155, 60%, 26%));
  }

  .jeep-reports__message--error {
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
  }
</style>
