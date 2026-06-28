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
};

export type EntityUrlSyncSnapshot = RoutableQueryState & {
  room: { id: number; code: string } | null;
  editMode: boolean;
  termId: number | null;
  defaultTermId: number | null;
};

const HOME_PATH = "/";

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

    return getEntityCanonicalPath(query, {
      room: currentRoom.value,
      dorm,
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
    const query = context.getQuerySnapshot();
    const initialState = buildHistoryState(
      query.type === "result" && query.category !== null ? query : null,
      HOME_PATH,
    );

    const initialPath = withTermQuery(
      pathname,
      parseTermIdFromSearch(window.location.search) ?? termStore.activeTermId,
      termStore.defaultTermId,
    );

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

    const pathWithTerm = withTermQuery(
      path,
      snapshot.termId,
      snapshot.defaultTermId,
    );
    const pathname = currentPathname();
    const currentSearch = window.location.search;
    const targetPath = pathWithTerm;
    const targetSearch = targetPath.includes("?")
      ? targetPath.slice(targetPath.indexOf("?"))
      : "";
    const targetPathname = targetPath.slice(0, targetPath.indexOf("?") >= 0 ? targetPath.indexOf("?") : undefined);

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
