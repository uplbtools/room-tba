import type { AppBootstrapPhase } from '../store-types';

export default class AppBootstrapStore {
	phase = $state<AppBootstrapPhase>('idle');
	errorMessage = $state<string | null>(null);
	hasCachedData = $state(false);
	private retryHandler: (() => void) | null = null;

	showBlockingOverlay = $derived(false);

	statusLabel = $derived.by(() => {
		switch (this.phase) {
			case 'remote':
				return 'Connecting to database';
			case 'sync':
				return 'Writing to offline cache';
			case 'error':
				return this.errorMessage ?? 'Could not load campus data';
			default:
				return null;
		}
	});

	beginRemote() {
		this.phase = 'remote';
		this.errorMessage = null;
	}

	beginSync() {
		this.phase = 'sync';
		this.errorMessage = null;
	}

	complete() {
		this.phase = 'ready';
		this.errorMessage = null;
	}

	markBackgroundRefresh() {
		if (this.phase === 'idle' || this.phase === 'ready' || this.phase === 'error') {
			this.phase = 'remote';
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
		this.phase = 'error';
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
