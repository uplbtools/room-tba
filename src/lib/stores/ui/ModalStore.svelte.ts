import { dismissEphemeralOverlays } from '#lib/utils/overlay-stack.js';
import type { LandingModalTab, ModalStoreState } from '../store-types';

export default class ModalStore {
	private _modalStore: ModalStoreState = $state({
		open: false,
		type: null
	});

	open = $derived(this._modalStore.open);
	type = $derived(this._modalStore.type);
	landingTab = $derived(this._modalStore.landingTab);

	openModal = (type: ModalStoreState['type'], options?: { landingTab?: LandingModalTab }) => {
		dismissEphemeralOverlays();
		this._modalStore.open = true;
		this._modalStore.type = type;
		this._modalStore.landingTab = options?.landingTab;
	};

	closeModal = () => {
		this._modalStore = {
			open: false,
			type: null
		};
	};
}
