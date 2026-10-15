import {
	AVG_TILE_BYTES,
	clearMapCaches,
	getCampusTileCoords,
	getStorageUsage,
	getTileTemplate,
	MIN_ZOOM,
	tileUrl
} from '../../utils/local/offline-maps.js';
import {
	OFFLINE_DIRECTORY_SYNCED_AT_KEY,
	syncCampusDirectoryForOffline
} from '../../utils/local/data/campus-directory-sync.js';
import {
	OFFLINE_CLASSES_SYNCED_AT_KEY,
	syncClassSchedulesForOffline
} from '../../utils/local/data/class-schedules-offline-sync.js';
import type { OfflineStatus } from './../store-types.js';

export class OfflineStore {
	status = $state<OfflineStatus>('idle');
	directoryStatus = $state<OfflineStatus>('idle');
	directoryError = $state<string | null>(null);
	directoryProgress = $state(0);
	directoryProgressLabel = $state('');
	directoryLastSyncedAt = $state<string | null>(null);
	schedulesStatus = $state<OfflineStatus>('idle');
	schedulesError = $state<string | null>(null);
	schedulesProgressLabel = $state('');
	schedulesRowCount = $state(0);
	schedulesLastSyncedAt = $state<string | null>(null);
	tilesTotal = $state(0);
	tilesDone = $state(0);
	bytesDownloaded = $state(0);
	storageUsed = $state<number | null>(null);
	error = $state<string | null>(null);
	private cancelRequested = false;

	progress = $derived(this.tilesTotal === 0 ? 0 : Math.min(1, this.tilesDone / this.tilesTotal));
	estimatedBytes = $derived(this.tilesTotal * AVG_TILE_BYTES);

	prepareEstimate = async () => {
		void this.refreshStorage();
		this.directoryLastSyncedAt = localStorage.getItem(OFFLINE_DIRECTORY_SYNCED_AT_KEY) ?? null;
		this.schedulesLastSyncedAt = localStorage.getItem(OFFLINE_CLASSES_SYNCED_AT_KEY) ?? null;
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
		if (this.status === 'downloading') return;
		this.cancelRequested = false;
		this.error = null;
		this.tilesDone = 0;
		this.bytesDownloaded = 0;
		this.status = 'downloading';

		const source = await getTileTemplate();
		if (!source) {
			this.status = 'error';
			this.error = 'Could not resolve the map tile source.';
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
						mode: 'cors'
					});
					if (res.ok) {
						const len = Number(res.headers.get('content-length'));
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
			await Promise.all(Array.from({ length: 6 }, () => worker()));
			await this.refreshStorage();
			this.status = this.cancelRequested ? 'cancelled' : 'done';
		} catch (e) {
			console.error('Offline map download failed:', e);
			this.status = 'error';
			this.error = 'Download failed. Check your connection and try again.';
		}
	};

	clear = async () => {
		await clearMapCaches();
		this.tilesDone = 0;
		this.bytesDownloaded = 0;
		this.status = 'idle';
		await this.refreshStorage();
	};

	downloadCampusDirectory = async () => {
		if (this.directoryStatus === 'downloading') return;
		this.directoryError = null;
		this.directoryProgress = 0;
		this.directoryProgressLabel = 'Starting…';
		this.directoryStatus = 'downloading';

		const result = await syncCampusDirectoryForOffline({
			onProgress: (progress) => {
				this.directoryProgress = progress.step / progress.totalSteps;
				this.directoryProgressLabel = progress.label;
			}
		});

		if (result.ok) {
			this.directoryStatus = 'done';
			this.directoryLastSyncedAt = localStorage.getItem(OFFLINE_DIRECTORY_SYNCED_AT_KEY) ?? null;
			this.directoryProgress = 1;
		} else {
			this.directoryStatus = 'error';
			this.directoryError = result.error ?? 'Campus directory download failed.';
		}
	};

	clearCampusDirectory = () => {
		localStorage.removeItem(OFFLINE_DIRECTORY_SYNCED_AT_KEY);
		this.directoryStatus = 'idle';
		this.directoryError = null;
		this.directoryProgress = 0;
		this.directoryProgressLabel = '';
		this.directoryLastSyncedAt = null;
	};

	downloadClassSchedules = async () => {
		if (this.schedulesStatus === 'downloading') return;
		this.schedulesError = null;
		this.schedulesProgressLabel = 'Starting…';
		this.schedulesStatus = 'downloading';

		const result = await syncClassSchedulesForOffline({
			onProgress: (label) => {
				this.schedulesProgressLabel = label;
			}
		});

		if (result.ok) {
			this.schedulesStatus = 'done';
			this.schedulesRowCount = result.rowCount;
			this.schedulesLastSyncedAt = localStorage.getItem(OFFLINE_CLASSES_SYNCED_AT_KEY) ?? null;
		} else {
			this.schedulesStatus = 'error';
			this.schedulesError = result.error ?? 'Class schedule download failed.';
		}
	};

	clearClassSchedules = () => {
		localStorage.removeItem(OFFLINE_CLASSES_SYNCED_AT_KEY);
		this.schedulesStatus = 'idle';
		this.schedulesError = null;
		this.schedulesProgressLabel = '';
		this.schedulesRowCount = 0;
		this.schedulesLastSyncedAt = null;
	};
}
