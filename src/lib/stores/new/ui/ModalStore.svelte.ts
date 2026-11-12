import { getEscapeActions } from '#lib/utils/context.ts';
import { dismissEphemeralOverlays } from '#lib/utils/overlay-stack.js';
import type { LandingModalTab, ModalStoreState } from '../../store-types';
import type EscapeActions from './EscapeActionStack.svelte';

export default class ModalStore {
	private _modalStore = $state<ModalStoreState>({
		open: false,
		type: null
	});
	
	private _dataRecord = $state<Record<string, unknown> | null>(null);
	open = $derived(this._modalStore.open);
	type = $derived(this._modalStore.type);
	landingTab = $derived(this._modalStore.landingTab);
	private _escapeActionsStack: EscapeActions;


	constructor() {
		this._escapeActionsStack = getEscapeActions();
	}

	public openModal(type: ModalStoreState['type'], dataRecord?: Record<string, unknown>) {
		dismissEphemeralOverlays();
		this._modalStore.open = true;
		this._modalStore.type = type;
		this._dataRecord = dataRecord ?? null;
		this._escapeActionsStack.pushAction(() => {
			this.closeModal();
		})
	};

	public closeModal() {
		this._modalStore = {
			open: false,
			type: null
		};
		this._dataRecord = null;
	};

	public getDataRecord() {
		return this._dataRecord;
	}


}
