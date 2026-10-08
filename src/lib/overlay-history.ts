/**
 * Back closes the topmost layer, never the app (Jakob audit macro 1).
 *
 * Every overlay (menu, modals, mobile search, directions, suggest-edit, …)
 * pushes one history entry when it opens. Back pops it and the overlay closes;
 * closing it from its own X takes the entry back off (a silent history.back())
 * so no stale entry is left for Back to land on.
 *
 * Entity URL pushes (entity-url-sync) go through `navigateAppHistory` so they
 * share the same bookkeeping: an entity opened from the mobile search replaces
 * the search entry instead of stacking on it, and returning to the URL right
 * below (X on a place opened from home) steps back instead of pushing a copy.
 *
 * The popstate listener is registered in the capture phase so it runs before
 * entity-url-sync's, and swallows the events this module caused itself.
 */

import { carryLayersParam } from "./app-url-state";

type OverlayRecord = {
  id: number;
  key: string;
  close: () => void;
  /** Closes itself when an entity is picked (mobile search). */
  transient: boolean;
  /** URL of the entry under this overlay's entry. */
  baseUrl: string;
  /** rtbaIdx of the overlay's own entry; Back to anything below closes it. */
  entryIdx: number;
};

export type OverlayOptions = {
  /** URL for the overlay's own entry (e.g. with ?dir=), from the URL under it. Defaults to that URL. */
  url?: (current: string) => string;
  transient?: boolean;
};

type AppHistoryState = Record<string, unknown> & {
  rtbaIdx?: number;
  rtbaOverlayId?: number;
  rtbaPrevUrl?: string;
};

const stack: OverlayRecord[] = [];
let nextId = 1;
let currentIdx = 0;
let installed = false;
/** A history.back() this module issued; its popstate must not reach the app. */
let silentPending = false;
let silentTimer: ReturnType<typeof setTimeout> | null = null;
/**
 * History writes run in order on a microtask, after the reactive flush that
 * asked for them. A menu row that closes the menu and opens a modal flips
 * both in one flush, in whatever order their effects run; deferring lets the
 * menu's entry come off before the modal's goes on. Writes also wait out a
 * silent back.
 */
let queue: (() => void)[] = [];
let drainScheduled = false;

function currentUrl() {
  return `${location.pathname}${location.search}${location.hash}`;
}

function readState(): AppHistoryState {
  const state = history.state;
  return state && typeof state === "object" ? (state as AppHistoryState) : {};
}

/** Base fields only: an overlay's markers must not leak into entries above it. */
function baseState(state: AppHistoryState): AppHistoryState {
  const {
    rtbaIdx: _idx,
    rtbaOverlayId: _overlay,
    rtbaPrevUrl: _prev,
    ...rest
  } = state;
  return rest;
}

function drain() {
  drainScheduled = false;
  while (queue.length > 0 && !silentPending) queue.shift()?.();
}

/** `first` jumps the queue (closing an entry before pending pushes land). */
function schedule(write: () => void, first = false) {
  if (first) queue.unshift(write);
  else queue.push(write);
  if (drainScheduled) return;
  drainScheduled = true;
  queueMicrotask(drain);
}

/**
 * Take closed overlays' entries off the top, one silent back at a time (the
 * silent popstate calls this again). True while a back is in flight.
 */
function unwindClosed(): boolean {
  const id = readState().rtbaOverlayId;
  if (id === undefined || stack.some((record) => record.id === id)) {
    return false;
  }
  silentBack();
  return true;
}

function silentBack() {
  silentPending = true;
  // A back that never fires popstate (no entry below, a test DOM) must not
  // freeze every later history write behind it.
  if (silentTimer) clearTimeout(silentTimer);
  silentTimer = setTimeout(() => {
    if (!silentPending) return;
    silentPending = false;
    drain();
  }, 1000);
  history.back();
}

function handlePopState(event: PopStateEvent) {
  const state = (
    event.state && typeof event.state === "object" ? event.state : {}
  ) as AppHistoryState;
  const idx = state.rtbaIdx ?? 0;
  const goingBack = idx < currentIdx;
  currentIdx = idx;

  if (silentPending) {
    silentPending = false;
    if (silentTimer) clearTimeout(silentTimer);
    event.stopImmediatePropagation();
    if (!unwindClosed()) drain();
    return;
  }

  const landingUrl = currentUrl();
  let lowestBaseUrl: string | null = null;
  for (let i = stack.length - 1; i >= 0; i--) {
    const record = stack[i];
    if (!record || record.entryIdx <= idx) continue;
    stack.splice(i, 1);
    lowestBaseUrl = record.baseUrl;
    record.close();
  }

  // Landed on an overlay entry whose overlay is gone (closed while another
  // entry sat above it). Going back, step over it; going forward, turn it
  // into a plain entry for the page under it.
  const overlayId = state.rtbaOverlayId;
  if (overlayId !== undefined && !stack.some((r) => r.id === overlayId)) {
    if (goingBack) {
      event.stopImmediatePropagation();
      history.back();
      return;
    }
    history.replaceState({ ...baseState(state), rtbaIdx: idx }, "", landingUrl);
  }

  // Back only closed overlays and landed on the page they were opened over:
  // the app is already showing that page, so entity sync has nothing to do.
  if (lowestBaseUrl !== null && sameUrl(lowestBaseUrl, landingUrl)) {
    event.stopImmediatePropagation();
  }
}

/** Hash is camera state (replaced on every pan), not part of identity. */
function sameUrl(a: string, b: string) {
  return a.split("#")[0] === b.split("#")[0];
}

export function installOverlayHistory() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  currentIdx = readState().rtbaIdx ?? 0;
  window.addEventListener("popstate", handlePopState, { capture: true });
}

/** Push an entry for an overlay that just opened. Returns its id for closeOverlay. */
export function openOverlay(
  key: string,
  close: () => void,
  options: OverlayOptions = {},
): number {
  installOverlayHistory();
  const id = nextId++;
  const record: OverlayRecord = {
    id,
    key,
    close,
    transient: options.transient ?? false,
    baseUrl: currentUrl(),
    // Set when the push runs; until then nothing below can be popped to.
    entryIdx: Number.POSITIVE_INFINITY,
  };
  stack.push(record);
  schedule(() => {
    record.baseUrl = currentUrl();
    // Closed before the queued push ran: nothing to push.
    if (!stack.includes(record)) return;
    currentIdx += 1;
    record.entryIdx = currentIdx;
    history.pushState(
      {
        ...baseState(readState()),
        rtbaIdx: currentIdx,
        rtbaOverlayId: id,
      } satisfies AppHistoryState,
      "",
      options.url?.(currentUrl()) ?? currentUrl(),
    );
  });
  return id;
}

/**
 * The overlay closed from its own UI. Take its entry back off when it is the
 * current one; otherwise (an entity was pushed above it) just forget it.
 */
export function closeOverlay(id: number) {
  const index = stack.findIndex((record) => record.id === id);
  if (index === -1) return;
  const record = stack[index];
  // Top among pushed entries: anything above is still waiting to push.
  const isTop = stack
    .slice(index + 1)
    .every((above) => above.entryIdx === Number.POSITIVE_INFINITY);
  stack.splice(index, 1);
  // Never pushed (its queued push sees it gone), or buried under a newer entry.
  if (!isTop || record?.entryIdx === Number.POSITIVE_INFINITY) return;
  schedule(unwindClosed, true);
}

/**
 * Rewrite the current entry's URL (search text, directions, camera) in place.
 * `update` maps the URL at write time, so it composes with queued pushes.
 */
export function replaceAppUrl(update: (current: string) => string) {
  schedule(() => {
    const url = update(currentUrl());
    if (url === currentUrl()) return;
    history.replaceState(history.state, "", url);
  });
}

/**
 * Move the app to a new URL (entity, screen, home). Steps back instead when
 * the entry below is that URL, and replaces a transient overlay's entry.
 */
export function navigateAppHistory(
  state: Record<string, unknown>,
  target: string,
) {
  installOverlayHistory();
  schedule(() => {
    // Map layers the rider turned on (?layers=trail) follow them around.
    const url = carryLayersParam(target, currentUrl());
    const current = readState();
    const top = stack.at(-1);
    if (
      top?.transient &&
      current.rtbaOverlayId !== undefined &&
      current.rtbaOverlayId === top.id
    ) {
      stack.pop();
      history.replaceState(
        {
          ...state,
          rtbaIdx: currentIdx,
          rtbaPrevUrl: top.baseUrl,
        } satisfies AppHistoryState,
        "",
        url,
      );
      return;
    }
    if (
      current.rtbaOverlayId === undefined &&
      current.rtbaPrevUrl !== undefined &&
      sameUrl(current.rtbaPrevUrl, url)
    ) {
      silentBack();
      return;
    }
    const prevUrl = currentUrl();
    currentIdx += 1;
    history.pushState(
      {
        ...state,
        rtbaIdx: currentIdx,
        rtbaPrevUrl: prevUrl,
      } satisfies AppHistoryState,
      "",
      url,
    );
  });
}

/** Keys of the open overlays, bottom to top (tests and debugging). */
export function openOverlayKeys(): string[] {
  return stack.map((record) => record.key);
}

export function resetOverlayHistoryForTests() {
  if (installed && typeof window !== "undefined") {
    window.removeEventListener("popstate", handlePopState, { capture: true });
  }
  stack.length = 0;
  nextId = 1;
  currentIdx = 0;
  installed = false;
  silentPending = false;
  if (silentTimer) clearTimeout(silentTimer);
  silentTimer = null;
  queue = [];
  drainScheduled = false;
}
