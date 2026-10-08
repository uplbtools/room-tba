import {
  type BrowseParam,
  isUnknownAppPath,
  readAppState,
  stripOverlayParams,
  withAppState,
} from "./app-url-state";
import type { AppContextData } from "./context";
import {
  getEntityCanonicalPath,
  normalizePathname,
  parseEntityPathname,
  parseRouteSlug,
  resolveQueryFromEntityPath,
  type RoutableQueryState,
} from "./entity-urls";
import { getJSONFetch, getLocalRoomById } from "./local/data/utils";
import { isLocalCacheReady } from "./local/data/pgliteDB";
import { installOverlayHistory, navigateAppHistory } from "./overlay-history";
import { currentRoom, termStore } from "./store.svelte";
import { parseTermIdFromSearch, withTermQuery } from "./term-url";
import {
  getTransitRoutePath,
  getTransitStopPath,
  parseTransitPathname,
  TRANSIT_INDEX_PATH,
  type TransitPath,
} from "./transit-urls";
import type { JeepneyRoute } from "@constants/jeepney-routes";

type EntityHistoryState = {
  rtbaEntity?: true;
  query?: RoutableQueryState;
  browsePath?: string;
};

export type EntityUrlSyncContext = {
  getAppData: () => AppContextData;
  hydrateQuery: (query: RoutableQueryState) => void;
  clearQuery: () => void;
  getQuerySnapshot: () => RoutableQueryState;
  /** Open/close a full screen (planner, finals) in response to its path navigations (back/forward). */
  setScreen: (screen: ScreenId | null) => void;
  setTransit: (transit: TransitPath) => void;
  /** The URL names a place that does not exist (bad slug, unknown path). */
  onNotFound: () => void;
};

export type EntityUrlSyncSnapshot = RoutableQueryState & {
  room: { id: number; code: string } | null;
  editMode: boolean;
  termId: number | null;
  defaultTermId: number | null;
  screen: ScreenId | null;
  transitRouteId: string | null;
  transitStopIndex: number | null;
  transitRoute: JeepneyRoute | null;
};

const HOME_PATH = "/";

/** The query a ?browse= URL stands for (chip and menu lists). */
export function browseQuery(browse: BrowseParam): RoutableQueryState {
  if (browse === "events") {
    return { type: "result", category: "events", value: "Campus events" };
  }
  if (browse === "classes") {
    return { type: "result", category: "classes", value: "All classes" };
  }
  return { type: "result", category: "browse", value: browse };
}
// Full-screen overlays that own the URL while open (see the planner deep-link
// notes: bare island props, trailing slash, and the SW denylist in
// astro.config.mjs must cover each path here).
const SCREEN_PATHS = {
  today: "/today",
  planner: "/planner",
  finals: "/final-exams",
  calendar: "/calendar",
} as const;
export type ScreenId = keyof typeof SCREEN_PATHS;

/** Keeps callers from re-listing the screens; adding one only touches SCREEN_PATHS. */
export function isScreenId(value: string): value is ScreenId {
  return Object.hasOwn(SCREEN_PATHS, value);
}

/**
 * Only schedule-bearing surfaces carry ?term=. Establishments, offices/units,
 * landmarks, orgs, dorms, etc. are term-less; their URLs stay clean (#term-urls).
 */
function isTermAwareCategory(
  category: RoutableQueryState["category"] | null,
): boolean {
  return category === "room" || category === "class";
}
// currentPathname() runs through normalizePathname (adds a trailing slash), so
// compare against the normalized form, not the raw "/planner".
const SCREEN_BY_NORMALIZED_PATH = new Map(
  (Object.entries(SCREEN_PATHS) as [ScreenId, string][]).map(
    ([screen, path]) => [normalizePathname(path), screen],
  ),
);

type LocalRoom = Awaited<ReturnType<typeof getLocalRoomById>>;

/**
 * A room deep link's row: the local cache when it is already up, else the
 * network, else (offline) wait for the cache. Booting the cache first kept a
 * cold second tab on a skeleton for seconds.
 */
async function loadRoomById(id: number): Promise<LocalRoom> {
  if (isLocalCacheReady()) {
    const local = await getLocalRoomById(id);
    if (local) return local;
  }
  try {
    const res = await getJSONFetch<{ data: LocalRoom }>(
      `/api/rooms?id=${id}`,
      10_000,
    );
    if (res.data) return res.data;
  } catch {
    // Offline: fall through to the local cache.
  }
  return isLocalCacheReady() ? null : getLocalRoomById(id);
}

export function createEntityUrlSync(context: EntityUrlSyncContext) {
  let applyingFromHistory = false;
  let initialized = false;
  /**
   * An entity path the page booted on without a server-hydrated query: the
   * service worker serves the "/" app shell for /room/…, /building/… in any
   * tab it controls. Until it resolves, syncing must not push "/" (the
   * deep-link bounce home).
   */
  let pendingPath: string | null = null;

  function currentPathname() {
    return normalizePathname(window.location.pathname);
  }

  function buildHistoryState(
    query: RoutableQueryState | null,
    browsePath = HOME_PATH,
  ): EntityHistoryState {
    return query
      ? { rtbaEntity: true, query, browsePath }
      : { rtbaEntity: true, browsePath };
  }

  function resolvePathForQuery(query: RoutableQueryState) {
    const appData = context.getAppData();
    const dorm =
      query.category === "dorm"
        ? (appData.dorms?.find((entry) => entry.dormName === query.value) ??
          null)
        : null;
    const organization =
      query.category === "organization"
        ? (appData.organizations?.find((entry) => entry.name === query.value) ??
          null)
        : null;
    const place =
      query.category === "place"
        ? (appData.places?.find((entry) => entry.name === query.value) ?? null)
        : null;

    if (query.type === "result" && query.category === "browse") {
      return withAppState(HOME_PATH, { browse: query.value });
    }
    if (
      query.type === "result" &&
      (query.category === "events" || query.category === "classes")
    ) {
      return withAppState(HOME_PATH, { browse: query.category });
    }

    return getEntityCanonicalPath(query, {
      room: currentRoom.value,
      dorm,
      organization,
      place,
    });
  }

  async function hydrateRoomSelection(query: RoutableQueryState) {
    if (query.category !== "room") return;
    if (currentRoom.value?.code.toUpperCase() === query.value.toUpperCase()) {
      return;
    }
    await currentRoom.getRoomByCode(query.value);
  }

  /** Resolve an entity path into a query; false when it can't (yet). */
  async function hydrateFromPathname(pathname: string): Promise<boolean> {
    const parsed = parseEntityPathname(pathname);
    if (!parsed) {
      context.clearQuery();
      return true;
    }

    if (parsed.category === "room") {
      const { id } = parseRouteSlug(parsed.slug);
      if (id === null) return false;
      const room = await loadRoomById(id);
      if (!room) return false;
      // Room first, so the URL sync the query triggers can already build
      // /room/<slug>/ and the map doesn't refetch it (skeleton flash).
      currentRoom.setRoom(room);
      context.hydrateQuery({
        type: "result",
        category: "room",
        value: room.code,
      });
      return true;
    }

    const appData = context.getAppData();
    const resolved = resolveQueryFromEntityPath(parsed, {
      buildings: appData.buildings,
      colleges: appData.colleges,
      divisions: appData.divisions,
      dorms: appData.dorms,
      organizations: appData.organizations,
      places: appData.places,
    });

    if (!resolved) return false;

    if (parsed.category === "event") {
      const event = appData.events?.find((entry) => entry.slug === parsed.slug);
      if (!event && appData.events) return false;
      context.hydrateQuery({
        type: "result",
        category: "event",
        value: event?.title ?? parsed.slug,
        eventSlug: parsed.slug,
      });
      return true;
    }

    context.hydrateQuery(resolved);
    await hydrateRoomSelection(resolved);
    return true;
  }

  /**
   * Retry the boot path. `dataReady` = campus data is in, so a path that still
   * doesn't resolve never will; it names nothing: say so and go home.
   */
  async function resolvePendingPath(dataReady: boolean) {
    const path = pendingPath;
    if (!path) return;
    const resolved = await hydrateFromPathname(path);
    if (pendingPath !== path) return;
    if (resolved || dataReady) pendingPath = null;
    if (resolved || !dataReady) return;
    context.onNotFound();
    context.clearQuery();
    window.history.replaceState(
      buildHistoryState(null, HOME_PATH),
      "",
      HOME_PATH,
    );
  }

  function handlePopState(event: PopStateEvent) {
    applyingFromHistory = true;
    try {
      termStore.applyFromUrl();
      // Back/forward into or out of /today, /planner, /final-exams toggles it.
      context.setScreen(
        SCREEN_BY_NORMALIZED_PATH.get(currentPathname()) ?? null,
      );
      const transit = parseTransitPathname(currentPathname());
      if (transit) {
        context.setTransit(transit);
        return;
      }
      const state = (event.state ?? null) as EntityHistoryState | null;
      if (state?.query) {
        context.hydrateQuery(state.query);
        void hydrateRoomSelection(state.query);
        return;
      }

      const pathname = currentPathname();
      if (pathname === HOME_PATH) {
        const browse = readAppState(window.location.search).browse;
        if (browse) {
          context.hydrateQuery(browseQuery(browse));
          return;
        }
        context.clearQuery();
        return;
      }

      void hydrateFromPathname(pathname);
    } finally {
      applyingFromHistory = false;
    }
  }

  function init() {
    if (initialized || typeof window === "undefined") return;
    initialized = true;
    installOverlayHistory();

    const pathname = currentPathname();
    const transit = parseTransitPathname(pathname);
    if (transit) context.setTransit(transit);
    const query = context.getQuerySnapshot();
    const initialState = buildHistoryState(
      transit
        ? null
        : query.type === "result" && query.category !== null
          ? query
          : null,
      HOME_PATH,
    );

    const initialTermAware =
      pathname === HOME_PATH ||
      SCREEN_BY_NORMALIZED_PATH.has(pathname) ||
      pathname.startsWith("/room/");
    const termPath = initialTermAware
      ? withTermQuery(
          pathname,
          parseTermIdFromSearch(window.location.search) ??
            termStore.activeTermId,
          termStore.defaultTermId,
        )
      : pathname;
    // Keep URL-borne map state (?q=, ?dir=, ?browse=, #map=) for Entry and
    // the map to restore; dropping it here made those links open bare.
    const appState = new URLSearchParams(window.location.search);
    const initialPath = `${withAppState(termPath, {
      q: appState.get("q"),
      dir: appState.get("dir"),
      browse: appState.get("browse"),
      mode: appState.get("mode"),
    })}${window.location.hash}`;

    window.history.replaceState(initialState, "", initialPath);
    window.addEventListener("popstate", handlePopState);

    if (isUnknownAppPath(pathname)) {
      context.onNotFound();
      window.history.replaceState(
        buildHistoryState(null, HOME_PATH),
        "",
        HOME_PATH,
      );
      return;
    }

    if (!transit && !initialState.query && parseEntityPathname(pathname)) {
      pendingPath = pathname;
      void resolvePendingPath(false);
    }
  }

  function destroy() {
    if (!initialized || typeof window === "undefined") return;
    window.removeEventListener("popstate", handlePopState);
    initialized = false;
  }

  function syncFromQuery(snapshot: EntityUrlSyncSnapshot) {
    if (!initialized || applyingFromHistory || snapshot.editMode) return;
    if (snapshot.type === "result" && snapshot.category !== null) {
      // A result (hydrated or picked) supersedes the boot path.
      pendingPath = null;
    } else if (pendingPath !== null && !snapshot.screen) {
      return;
    }

    // A full screen takes over the URL while open, so clicking "Class Planner"
    // moves to /planner (shareable, refreshable). Closing falls through to the
    // entity/home logic below and restores the prior path.
    if (snapshot.screen) {
      const screenPath = withTermQuery(
        SCREEN_PATHS[snapshot.screen],
        snapshot.termId,
        snapshot.defaultTermId,
      );
      const screenSearch = screenPath.includes("?")
        ? screenPath.slice(screenPath.indexOf("?"))
        : "";
      if (
        currentPathname() !==
          normalizePathname(SCREEN_PATHS[snapshot.screen]) ||
        stripOverlayParams(window.location.search) !== screenSearch
      ) {
        const carried =
          snapshot.type === "result" && snapshot.category !== null
            ? {
                type: "result" as const,
                category: snapshot.category,
                value: snapshot.value,
                eventSlug: snapshot.eventSlug,
              }
            : null;
        navigateAppHistory(buildHistoryState(carried, HOME_PATH), screenPath);
      }
      return;
    }

    const transitBrowse =
      snapshot.type === "result" &&
      snapshot.category === "browse" &&
      snapshot.value === "jeepney";
    if (transitBrowse) {
      const transitPath = snapshot.transitRouteId
        ? snapshot.transitStopIndex !== null
          ? getTransitStopPath(
              snapshot.transitRouteId,
              snapshot.transitStopIndex,
              snapshot.transitRoute ?? undefined,
            )
          : getTransitRoutePath(snapshot.transitRouteId)
        : TRANSIT_INDEX_PATH;
      if (
        currentPathname() !== transitPath ||
        stripOverlayParams(window.location.search) !== ""
      ) {
        navigateAppHistory(buildHistoryState(null, transitPath), transitPath);
      }
      return;
    }

    if (snapshot.type !== "result" || snapshot.category === null) {
      const pathname = currentPathname();
      const homePath = withTermQuery(
        HOME_PATH,
        snapshot.termId,
        snapshot.defaultTermId,
      );
      const homePathname = homePath.split("?")[0] ?? HOME_PATH;
      const homeSearch = homePath.includes("?")
        ? homePath.slice(homePath.indexOf("?"))
        : "";
      if (
        pathname !== homePathname ||
        stripOverlayParams(window.location.search) !== homeSearch
      ) {
        navigateAppHistory(buildHistoryState(null, HOME_PATH), homePath);
      }
      return;
    }

    const path = resolvePathForQuery(snapshot);
    if (!path) return;

    const pathWithTerm = isTermAwareCategory(snapshot.category)
      ? withTermQuery(path, snapshot.termId, snapshot.defaultTermId)
      : path;
    const pathname = currentPathname();
    const currentSearch = stripOverlayParams(window.location.search);
    const targetPath = pathWithTerm;
    const targetSearch = targetPath.includes("?")
      ? targetPath.slice(targetPath.indexOf("?"))
      : "";
    const targetPathname = targetPath.slice(
      0,
      targetPath.indexOf("?") >= 0 ? targetPath.indexOf("?") : undefined,
    );

    if (pathname === targetPathname && currentSearch === targetSearch) {
      return;
    }

    const historyQuery: RoutableQueryState = {
      type: "result",
      category: snapshot.category,
      value: snapshot.value,
      eventSlug: snapshot.eventSlug,
      browseOrigin: snapshot.browseOrigin ?? null,
    };

    navigateAppHistory(
      buildHistoryState(historyQuery, HOME_PATH),
      pathWithTerm,
    );
  }

  return {
    init,
    destroy,
    syncFromQuery,
    resolvePendingPath,
  };
}
