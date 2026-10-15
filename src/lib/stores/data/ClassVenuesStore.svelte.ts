import { getBuildingIdsWithClasses } from '#lib/utils/local/data/utils.js';

/**
 * Building ids that host classes for the active term. Powers the dual-role
 * filter: an admin building that also hosts classes surfaces under both the
 * "Administrative" and "Class" building filters. Reload on term change and
 * after an offline sync so the set stays current.
 */

export default class ClassVenuesStore {
	buildingIdsWithClasses = $state<Set<number>>(new Set());
	private _requestId = 0;

	load = async (termId: number | null) => {
		const requestId = ++this._requestId;
		try {
			const set = await getBuildingIdsWithClasses(termId);
			// Ignore stale responses if a newer load started meanwhile.
			if (requestId === this._requestId) this.buildingIdsWithClasses = set;
		} catch (e) {
			console.error('Failed to load class venues:', e);
		}
	};
}
