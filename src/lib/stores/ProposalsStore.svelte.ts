import { adminAuthStore } from './index.svelte.js';

export default class ProposalsStore {
	pendingCount = $state(0);
	open = $state(false);
	loading = $state(false);
	proposals = $state<
		Array<{
			id: number;
			entityType: string;
			entityId: number;
			entityLabel: string;
			status: string;
			submitterName: string;
			proposedPatch: Record<string, unknown>;
			adminNote?: string | null;
			/** Contributor's message to the reviewer, never published (#873). */
			submitterNote?: string | null;
			createdAt: string;
			baseVersion: number;
			currentValues?: Record<string, unknown> | null;
			currentVersion?: number | null;
		}>
	>([]);

	refresh = async () => {
		if (!adminAuthStore.canReview) {
			this.pendingCount = 0;
			this.proposals = [];
			return;
		}
		this.loading = true;
		try {
			const res = await fetch('/api/admin/proposals', {
				credentials: 'same-origin'
			});
			if (!res.ok) return;
			const data = (await res.json()) as {
				pendingCount?: number;
				proposals?: ProposalsStore['proposals'];
			};
			this.pendingCount = data.pendingCount ?? 0;
			this.proposals = data.proposals ?? [];
		} catch {
			// ignore
		} finally {
			this.loading = false;
		}
	};

	toggle = () => {
		this.open = !this.open;
		if (this.open) void this.refresh();
	};

	close = () => {
		this.open = false;
	};
}
