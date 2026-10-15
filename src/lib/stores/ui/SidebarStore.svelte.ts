import type { SidebarOpenType } from '../store-types';

export default class SidebarStore {
	private _panelOpen = $state<SidebarOpenType>('map');
	panelOpen = $derived(this._panelOpen);
	/** Mobile-only rail visibility; the hamburger toggles it. Desktop ignores it. */
	railOpen = $state(false);
	/** Desktop label mode for the rail; persisted across reloads. */
	expanded = $state(
		typeof localStorage !== 'undefined' && localStorage.getItem('sidebar-expanded') === 'true'
	);

	toggleExpanded = () => {
		this.expanded = !this.expanded;
		localStorage.setItem('sidebar-expanded', String(this.expanded));
	};

	changeOpened = (panel: SidebarOpenType) => {
		this._panelOpen = panel;
		// Settings/contributors are accordion sections inside the drawer — keep
		// the mobile rail open so sublinks (Settings, Offline maps, …) stay
		// clickable. Map/planner/finals are full surfaces; close the overlay.
		if (panel === 'settings' || panel === 'contributors') return;
		this.railOpen = false;
	};

	toggleRail = () => {
		this.railOpen = !this.railOpen;
	};

	closeRail = () => {
		this.railOpen = false;
	};
}
