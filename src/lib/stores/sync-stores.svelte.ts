
class AppBootstrapStore {
  phase = $state<AppBootstrapPhase>("idle");
  errorMessage = $state<string | null>(null);
  hasCachedData = $state(false);
  private retryHandler: (() => void) | null = null;

  /** Bootstrap never blocks the map; static HTML shell only until hydration. */
  showBlockingOverlay = $derived(false);

  statusLabel = $derived.by(() => {
    switch (this.phase) {
      case "remote":
        return "Connecting to database";
      case "sync":
        return "Writing to offline cache";
      case "error":
        return this.errorMessage ?? "Could not load campus data";
      default:
        return null;
    }
  });

  beginRemote() {
    this.phase = "remote";
    this.errorMessage = null;
  }

  beginSync() {
    this.phase = "sync";
    this.errorMessage = null;
  }

  complete() {
    this.phase = "ready";
    this.errorMessage = null;
  }

  markBackgroundRefresh() {
    if (
      this.phase === "idle" ||
      this.phase === "ready" ||
      this.phase === "error"
    ) {
      this.phase = "remote";
      this.errorMessage = null;
    }
  }

  setHasCachedData(value: boolean) {
    this.hasCachedData = value;
  }

  setRetryHandler(handler: () => void) {
    this.retryHandler = handler;
  }

  get canRetry() {
    return this.retryHandler !== null;
  }

  fail(message: string, retry?: () => void) {
    this.phase = "error";
    this.errorMessage = message;
    if (retry) {
      this.retryHandler = retry;
    }
  }

  retry() {
    const handler = this.retryHandler;
    if (!handler) return;
    this.errorMessage = null;
    this.beginRemote();
    handler();
  }
}


class SyncToastStore {
  activity = $state<SyncActivity>("idle");
  activityTable = $state<SyncTableKey | null>(null);
  fetchProgress = $state<{ done: number; total: number } | null>(null);
  syncError = $state<string | null>(null);

  private _buildings = $state<SyncInfo | null>(null);
  private _colleges = $state<SyncInfo | null>(null);
  private _divisions = $state<SyncInfo | null>(null);
  private _dorms = $state<SyncInfo | null>(null);
  private _events = $state<SyncInfo | null>(null);
  private _aliases = $state<SyncInfo | null>(null);
  private _classes = $state<SyncInfo | null>(null);

  private _syncStartTime = $state<number>(0);

  currentSync = $state<SyncTableKey | null>(null);
  allSynced = $state<boolean>(false);
  recentlySynced = $state<boolean | null>(null);
  fetchingRemote = $state<boolean>(false);

  currentSyncData = $derived.by((): SyncInfo | null => {
    switch (this.currentSync) {
      case "buildings":
        return this._buildings;
      case "colleges":
        return this._colleges;
      case "divisions":
        return this._divisions;
      case "dorms":
        return this._dorms;
      case "events":
        return this._events;
      case "aliases":
        return this._aliases;
      default:
        return null;
    }
  });

  isSyncing = $derived(
    !this.allSynced &&
      this.syncError === null &&
      (this.activity !== "idle" || this.fetchingRemote),
  );

  hasCountableProgress = $derived.by(() => {
    const data = this.currentSyncData;
    if (data !== null && data.total > 0) return true;
    const fetch = this.fetchProgress;
    return fetch !== null && fetch.total > 0;
  });

  progressPercent = $derived.by(() => {
    const data = this.currentSyncData;
    if (data !== null && data.total > 0) {
      return Math.min(100, Math.round((data.synced / data.total) * 100));
    }
    const fetch = this.fetchProgress;
    if (fetch !== null && fetch.total > 0) {
      return Math.min(100, Math.round((fetch.done / fetch.total) * 100));
    }
    return 0;
  });

  stepLabel = $derived.by(() => {
    if (this.syncError) return this.syncError;
    if (this.allSynced && !this.needRefresh) return "Up to date";
    if (this.needRefresh) return "Update ready";
    if (this.activity === "checking") return "Connecting to database…";
    if (this.activity === "fetching") {
      if (this.activityTable !== null) {
        return `Fetching ${syncTableLabel(this.activityTable)}…`;
      }
      const fetch = this.fetchProgress;
      if (fetch !== null && fetch.total > 0) {
        return `Fetching campus data (${fetch.done}/${fetch.total})…`;
      }
      return "Fetching campus data…";
    }
    if (this.activity === "writing" && this.currentSync !== null) {
      const label = syncTableLabel(this.currentSync);
      const data = this.currentSyncData;
      if (data !== null && data.total > 0) {
        return `Syncing ${label} (${data.synced}/${data.total})`;
      }
      return `Writing ${label} to offline cache…`;
    }
    if (this.fetchingRemote) return "Connecting to database…";
    return "Syncing…";
  });

  stepDetail = $derived.by((): string | null => {
    if (this.syncError) return "Tap to retry";
    if (this.allSynced && !this.needRefresh) {
      return "Campus directory cached; room lists load when you open a building";
    }
    if (this.needRefresh) return "Reload to get the latest updates.";
    if (this.activity === "checking") {
      return "Checking if local data is current";
    }
    if (this.activity === "fetching") {
      return "Loading latest from server";
    }
    if (this.activity === "writing") {
      return "Saving to device for offline use";
    }
    return null;
  });

  // Service worker "new content available" update, surfaced inside this same
  // bottom offline toast instead of a separate floating prompt.
  public needRefresh = $state<boolean>(false);
  private _refresh: (() => void) | null = null;
  private _syncRetry: (() => void) | null = null;

  setRefreshHandler(fn: () => void) {
    this._refresh = fn;
  }
  markNeedRefresh() {
    this.needRefresh = true;
  }
  dismissRefresh() {
    this.needRefresh = false;
  }
  reload() {
    this._refresh?.();
  }

  get canRetrySync() {
    return this._syncRetry !== null;
  }

  setSyncError(message: string, retry?: () => void) {
    this.syncError = message;
    this._syncRetry = retry ?? null;
    this.activity = "idle";
    this.activityTable = null;
    this.fetchProgress = null;
    this.fetchingRemote = false;
    this.currentSync = null;
    this.allSynced = false;
    recordSyncTelemetry({ type: "sync-error", error: message });
  }

  clearSyncError() {
    this.syncError = null;
    this._syncRetry = null;
  }

  retrySync() {
    const handler = this._syncRetry;
    if (!handler) return;
    this.clearSyncError();
    this.allSynced = false;
    this.recentlySynced = true;
    recordSyncTelemetry({ type: "sync-retry" });
    handler();
  }

  startRemoteFetch() {
    this.clearSyncError();
    this.activity = "checking";
    this.activityTable = null;
    this.fetchProgress = null;
    this.fetchingRemote = true;
    this.allSynced = false;
    this.recentlySynced = true;
    this.currentSync = null;
    this._buildings = null;
    this._colleges = null;
    this._divisions = null;
    this._dorms = null;
    this._events = null;
    this._aliases = null;
    this._syncStartTime = performance.now();
  }

  beginFetchingCampus(totalFetches: number) {
    this.activity = "fetching";
    this.activityTable = null;
    this.fetchProgress = { done: 0, total: totalFetches };
    this.fetchingRemote = true;
  }

  reportFetchComplete() {
    if (this.fetchProgress === null) return;
    this.fetchProgress = {
      done: Math.min(this.fetchProgress.done + 1, this.fetchProgress.total),
      total: this.fetchProgress.total,
    };
  }

  markWritingPhase(table: SyncTableKey) {
    this.activity = "writing";
    this.activityTable = table;
    this.fetchingRemote = false;
    this.fetchProgress = null;
    this.currentSync = table;
  }

  private beginWriting(table: SyncTableKey, total: number) {
    this.markWritingPhase(table);
    const info: SyncInfo = { synced: 0, total };
    switch (table) {
      case "buildings":
        this._buildings = info;
        break;
      case "colleges":
        this._colleges = info;
        break;
      case "divisions":
        this._divisions = info;
        break;
      case "dorms":
        this._dorms = info;
        break;
      case "events":
        this._events = info;
        break;
      case "aliases":
        this._aliases = info;
        break;
    }
    this.recentlySynced = true;
  }

  startBuildingsSync(total: number) {
    this.beginWriting("buildings", total);
  }
  startCollegesSync(total: number) {
    this.beginWriting("colleges", total);
  }
  startDivisionsSync(total: number) {
    this.beginWriting("divisions", total);
  }
  startDormsSync(total: number) {
    this.beginWriting("dorms", total);
  }
  startEventsSync(total: number) {
    this.beginWriting("events", total);
  }
  startAliasesSync(total: number) {
    this.beginWriting("aliases", total);
  }
  startClassesSync(total: number) {
    this.beginWriting("classes", total);
  }

  updateBuildingsSync() {
    if (this._buildings === null) return;
    this._buildings.synced++;
  }
  updateCollegesSync() {
    if (this._colleges === null) return;
    this._colleges.synced++;
  }
  updateDivisionsSync() {
    if (this._divisions === null) return;
    this._divisions.synced++;
  }
  updateDormsSync() {
    if (this._dorms === null) return;
    this._dorms.synced++;
  }
  updateEventsSync() {
    if (this._events === null) return;
    this._events.synced++;
  }
  updateAliasesSync() {
    this._aliases!.synced++;
  }
  updateClassesSync() {
    this._classes!.synced++;
  }

  endSync(didSync = true) {
    if (this.syncError !== null) return;
    this.activity = "idle";
    this.activityTable = null;
    this.fetchProgress = null;
    this.fetchingRemote = false;
    this.currentSync = null;
    this.allSynced = true;
    if (this.recentlySynced === null) {
      this.recentlySynced = didSync;
    } else if (!didSync) {
      this.recentlySynced = false;
    }
    const duration =
      this._syncStartTime > 0
        ? Math.round(performance.now() - this._syncStartTime)
        : undefined;
    recordSyncTelemetry({ type: "sync-complete", durationMs: duration });
    this._syncStartTime = 0;
  }
}


class OfflineStore {
  /** Campus map tile download. */
  status = $state<OfflineStatus>("idle");
  /** Buildings, rooms, aliases bundle for offline search. */
  directoryStatus = $state<OfflineStatus>("idle");
  directoryError = $state<string | null>(null);
  directoryProgress = $state(0);
  directoryProgressLabel = $state("");
  directoryLastSyncedAt = $state<string | null>(null);
  /** Class schedules for active term in PGlite. */
  schedulesStatus = $state<OfflineStatus>("idle");
  schedulesError = $state<string | null>(null);
  schedulesProgressLabel = $state("");
  schedulesRowCount = $state(0);
  schedulesLastSyncedAt = $state<string | null>(null);
  tilesTotal = $state(0);
  tilesDone = $state(0);
  bytesDownloaded = $state(0);
  storageUsed = $state<number | null>(null);
  error = $state<string | null>(null);
  private cancelRequested = false;

  progress = $derived(
    this.tilesTotal === 0 ? 0 : Math.min(1, this.tilesDone / this.tilesTotal),
  );
  estimatedBytes = $derived(this.tilesTotal * AVG_TILE_BYTES);

  // Compute the tile count up front so the size estimate shows before download.
  prepareEstimate = async () => {
    void this.refreshStorage();
    this.directoryLastSyncedAt =
      localStorage.getItem(OFFLINE_DIRECTORY_SYNCED_AT_KEY) ?? null;
    this.schedulesLastSyncedAt =
      localStorage.getItem(OFFLINE_CLASSES_SYNCED_AT_KEY) ?? null;
    if (this.tilesTotal !== 0) return;
    const source = await getTileTemplate();
    this.tilesTotal = getCampusTileCoords(MIN_ZOOM, source?.maxZoom).length;
  };

  refreshStorage = async () => {
    this.storageUsed = await getStorageUsage();
  };

  cancel = () => {
    this.cancelRequested = true;
  };

  downloadCampus = async () => {
    if (this.status === "downloading") return;
    this.cancelRequested = false;
    this.error = null;
    this.tilesDone = 0;
    this.bytesDownloaded = 0;
    this.status = "downloading";

    const source = await getTileTemplate();
    if (!source) {
      this.status = "error";
      this.error = "Could not resolve the map tile source.";
      return;
    }

    const coords = getCampusTileCoords(MIN_ZOOM, source.maxZoom);
    this.tilesTotal = coords.length;

    let index = 0;
    const worker = async () => {
      while (index < coords.length && !this.cancelRequested) {
        const coord = coords[index++];
        if (!coord) break;
        try {
          const res = await fetch(tileUrl(source.template, coord), {
            mode: "cors",
          });
          if (res.ok) {
            const len = Number(res.headers.get("content-length"));
            if (Number.isFinite(len) && len > 0) {
              this.bytesDownloaded += len;
            } else {
              const buf = await res.clone().arrayBuffer();
              this.bytesDownloaded += buf.byteLength;
            }
          }
        } catch {
          // Skip individual tile failures; keep the overall download going.
        }
        this.tilesDone++;
      }
    };

    try {
      // Modest concurrency to fill the cache quickly without hammering the API.
      await Promise.all(Array.from({ length: 6 }, () => worker()));
      await this.refreshStorage();
      this.status = this.cancelRequested ? "cancelled" : "done";
    } catch (e) {
      console.error("Offline map download failed:", e);
      this.status = "error";
      this.error = "Download failed. Check your connection and try again.";
    }
  };

  clear = async () => {
    await clearMapCaches();
    this.tilesDone = 0;
    this.bytesDownloaded = 0;
    this.status = "idle";
    await this.refreshStorage();
  };

  downloadCampusDirectory = async () => {
    if (this.directoryStatus === "downloading") return;
    this.directoryError = null;
    this.directoryProgress = 0;
    this.directoryProgressLabel = "Starting…";
    this.directoryStatus = "downloading";

    const result = await syncCampusDirectoryForOffline({
      onProgress: (progress) => {
        this.directoryProgress = progress.step / progress.totalSteps;
        this.directoryProgressLabel = progress.label;
      },
    });

    if (result.ok) {
      this.directoryStatus = "done";
      this.directoryLastSyncedAt =
        localStorage.getItem(OFFLINE_DIRECTORY_SYNCED_AT_KEY) ?? null;
      this.directoryProgress = 1;
    } else {
      this.directoryStatus = "error";
      this.directoryError = result.error ?? "Campus directory download failed.";
    }
  };

  clearCampusDirectory = () => {
    localStorage.removeItem(OFFLINE_DIRECTORY_SYNCED_AT_KEY);
    this.directoryStatus = "idle";
    this.directoryError = null;
    this.directoryProgress = 0;
    this.directoryProgressLabel = "";
    this.directoryLastSyncedAt = null;
  };

  downloadClassSchedules = async () => {
    if (this.schedulesStatus === "downloading") return;
    this.schedulesError = null;
    this.schedulesProgressLabel = "Starting…";
    this.schedulesStatus = "downloading";

    const result = await syncClassSchedulesForOffline({
      onProgress: (label) => {
        this.schedulesProgressLabel = label;
      },
    });

    if (result.ok) {
      this.schedulesStatus = "done";
      this.schedulesRowCount = result.rowCount;
      this.schedulesLastSyncedAt =
        localStorage.getItem(OFFLINE_CLASSES_SYNCED_AT_KEY) ?? null;
    } else {
      this.schedulesStatus = "error";
      this.schedulesError = result.error ?? "Class schedule download failed.";
    }
  };

  clearClassSchedules = () => {
    localStorage.removeItem(OFFLINE_CLASSES_SYNCED_AT_KEY);
    this.schedulesStatus = "idle";
    this.schedulesError = null;
    this.schedulesProgressLabel = "";
    this.schedulesRowCount = 0;
    this.schedulesLastSyncedAt = null;
  };
}
