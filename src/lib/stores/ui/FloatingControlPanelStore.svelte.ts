import type { FloatingControlPanel } from '../store-types';

export default class FloatingControlPanelStore {
	openPanel: FloatingControlPanel | null = $state(null);

	toggle = (panel: FloatingControlPanel) => {
		this.openPanel = this.openPanel === panel ? null : panel;
	};

	close = (panel?: FloatingControlPanel) => {
		if (panel === undefined || this.openPanel === panel) {
			this.openPanel = null;
		}
	};
}
