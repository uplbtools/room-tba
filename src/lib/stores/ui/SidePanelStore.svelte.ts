import type { SidePanelMetaData } from '../store-types';

export type MobileSheetSnap = 'closed' | 'peek' | 'expanded';

export default class SidePanelStore {
	state = $state<SidePanelMetaData | null>(null);
	active = $state<boolean>(false);
	collapsed: boolean = $state(false);
	mobileSheetSnap: MobileSheetSnap = $state('closed');

	openPanel(state: SidePanelMetaData) {
		this.state = state;
		this.active = true;
	}

	closePanel = () => {
		this.active = false;
		this.state = null;
	};

	toggleVisibility = () => {
		this.collapsed = !this.collapsed;
	};

	expand = () => {
		this.collapsed = false;
	};

	collapse = () => {
		this.collapsed = true;
	};

	setMobileSheetSnap = (snap: MobileSheetSnap) => {
		this.mobileSheetSnap = snap;
	};
}
