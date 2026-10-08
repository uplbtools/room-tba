import {
  type JeepneyRoute,
  withBundledRoutes,
} from "@constants/jeepney-routes";
import { getLocalJeepneyRoutes } from "@lib/local/data/utils";
import { localTableSyncCheck, syncJeepneyRoutes } from "@lib/local/data/sync";
import {
  fetchJsonWithRetry,
  ENTITY_FETCH_OPTIONS,
} from "@lib/local/data/fetch-json";
import { orientRoute, routeDirections } from "@lib/transit-direction";

export class TransitStore {
  // Every bundled route (campus jeeps and buses), not only the campus four:
  // offline with an empty cache this is the whole list the rider gets.
  routes = $state<JeepneyRoute[]>(withBundledRoutes([]));
  loaded = $state(false);
  /** Two-way routes currently shown in their reverse direction (Kaliwa). */
  reversedRouteIds = $state<string[]>([]);
  private loading: Promise<void> | null = null;

  getRoute = (id: string | null) =>
    id ? (this.routes.find((route) => route.id === id) ?? null) : null;

  isReversed = (id: string | null) =>
    id !== null && this.reversedRouteIds.includes(id);

  /** The route in the direction the rider picked: what the map and lists show. */
  displayRoute = (id: string | null) => {
    const route = this.getRoute(id);
    return route ? orientRoute(route, this.isReversed(route.id)) : null;
  };

  setReversed = (id: string, reversed: boolean) => {
    if (!routeDirections(id) || this.isReversed(id) === reversed) return;
    this.reversedRouteIds = reversed
      ? [...this.reversedRouteIds, id]
      : this.reversedRouteIds.filter((entry) => entry !== id);
  };

  refresh = async () => {
    if (this.loading) return this.loading;
    this.loading = this.load();
    try {
      await this.loading;
    } finally {
      this.loading = null;
    }
  };

  private async load() {
    // Show the cached database routes (town jeeps included) as soon as PGlite
    // has them; the sync-key probe retries for a minute when offline.
    const cachedRoutes = getLocalJeepneyRoutes()
      .catch(() => undefined)
      .then((cached) => {
        if (cached && cached.length > 0)
          this.routes = withBundledRoutes(cached);
        return cached;
      });
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      await cachedRoutes;
      this.loaded = true;
      return;
    }

    const [checker, cached] = await Promise.all([
      localTableSyncCheck("jeepney_routes"),
      cachedRoutes,
    ]);
    if (checker.valid && cached && cached.length > 0) {
      this.loaded = true;
      return;
    }

    try {
      const remote = await fetchJsonWithRetry<JeepneyRoute[]>(
        "/api/transit",
        ENTITY_FETCH_OPTIONS,
      );
      if (Array.isArray(remote) && remote.length > 0) {
        this.routes = withBundledRoutes(remote);
        await syncJeepneyRoutes(checker, remote, true);
      }
    } catch {
      // The bundled route list remains available when both cache and network fail.
    } finally {
      this.loaded = true;
    }
  }
}
