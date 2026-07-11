import { JEEPNEY_ROUTES, type JeepneyRoute } from "@constants/jeepney-routes";
import { getLocalJeepneyRoutes } from "@lib/local/data/utils";
import { localTableSyncCheck, syncJeepneyRoutes } from "@lib/local/data/sync";
import {
  fetchJsonWithRetry,
  ENTITY_FETCH_OPTIONS,
} from "@lib/local/data/fetch-json";

export class TransitStore {
  routes = $state<JeepneyRoute[]>(JEEPNEY_ROUTES);
  loaded = $state(false);
  private loading: Promise<void> | null = null;

  getRoute = (id: string | null) =>
    id ? (this.routes.find((route) => route.id === id) ?? null) : null;

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
    const [checker, cached] = await Promise.all([
      localTableSyncCheck("jeepney_routes"),
      getLocalJeepneyRoutes(),
    ]);
    if (cached && cached.length > 0) this.routes = cached;
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
        this.routes = remote;
        await syncJeepneyRoutes(checker, remote, true);
      }
    } catch {
      // The bundled route list remains available when both cache and network fail.
    } finally {
      this.loaded = true;
    }
  }
}
