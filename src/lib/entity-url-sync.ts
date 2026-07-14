import type { AppContextData } from "./context";
import {
  getEntityCanonicalPath,
  normalizePathname,
  parseEntityPathname,
  parseRouteSlug,
  resolveQueryFromEntityPath,
  type RoutableQueryState,
} from "./entity-urls";
import { getLocalRoomById } from "./local/data/utils";
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
// Full-screen overlays that own the URL while open (see the planner deep-link
// notes: bare island props, trailing slash, and the SW denylist in
// astro.config.mjs must cover each path here).
const SCREEN_PATHS = {
  planner: "/planner",
  finals: "/final-exams",
} as const;
export type ScreenId = keyof typeof SCREEN_PATHS;

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

export function createEntityUrlSync(context: EntityUrlSyncContext) {
  let applyingFromHistory = false;
  let initialized = false;

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

  async function hydrateFromPathname(pathname: string) {
    const parsed = parseEntityPathname(pathname);
    if (!parsed) {
      context.clearQuery();
      return;
    }

    if (parsed.category === "room") {
      const { id } = parseRouteSlug(parsed.slug);
      if (id === null) return;
      const localRoom = await getLocalRoomById(id);
      if (!localRoom) return;
      const query: RoutableQueryState = {
        type: "result",
        category: "room",
        value: localRoom.code,
      };
      context.hydrateQuery(query);
      currentRoom.setRoom(localRoom);
      return;
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

    if (!resolved) return;

    if (parsed.category === "event") {
      const event = appData.events?.find((entry) => entry.slug === parsed.slug);
      context.hydrateQuery({
        type: "result",
        category: "event",
        value: event?.title ?? parsed.slug,
        eventSlug: parsed.slug,
      });
      return;
    }

    context.hydrateQuery(resolved);
    await hydrateRoomSelection(resolved);
  }

  function handlePopState(event: PopStateEvent) {
    applyingFromHistory = true;
    try {
      termStore.applyFromUrl();
      // Back/forward into or out of /planner, /final-exams toggles that screen.
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
    const initialPath = initialTermAware
      ? withTermQuery(
          pathname,
          parseTermIdFromSearch(window.location.search) ??
            termStore.activeTermId,
          termStore.defaultTermId,
        )
      : pathname;

    window.history.replaceState(initialState, "", initialPath);
    window.addEventListener("popstate", handlePopState);
  }

  function destroy() {
    if (!initialized || typeof window === "undefined") return;
    window.removeEventListener("popstate", handlePopState);
    initialized = false;
  }

  function syncFromQuery(snapshot: EntityUrlSyncSnapshot) {
    if (!initialized || applyingFromHistory || snapshot.editMode) return;

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
        window.location.search !== screenSearch
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
        window.history.pushState(
          buildHistoryState(carried, HOME_PATH),
          "",
          screenPath,
        );
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
      if (currentPathname() !== transitPath || window.location.search !== "") {
        window.history.pushState(
          buildHistoryState(null, transitPath),
          "",
          transitPath,
        );
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
      if (pathname !== homePathname || window.location.search !== homeSearch) {
        window.history.pushState(
          buildHistoryState(null, HOME_PATH),
          "",
          homePath,
        );
      }
      return;
    }

    const path = resolvePathForQuery(snapshot);
    if (!path) return;

    const pathWithTerm = isTermAwareCategory(snapshot.category)
      ? withTermQuery(path, snapshot.termId, snapshot.defaultTermId)
      : path;
    const pathname = currentPathname();
    const currentSearch = window.location.search;
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
    };

    window.history.pushState(
      buildHistoryState(historyQuery, HOME_PATH),
      "",
      pathWithTerm,
    );
  }

  return {
    init,
    destroy,
    syncFromQuery,
  };
}
