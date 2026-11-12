import { debounce } from "es-toolkit";

export default class ToastStore {
	message: string | null = $state(null);
	type: 'info' | 'error' | 'success' = $state('info');

	debounceClear = debounce(() => {
		this.clear();
	}, 3000)

	public show(message: string, type: 'info' | 'error' | 'success' = 'info') {
		this.message = message;
		this.type = type;
		this.debounceClear();
	};

	public clear() {
		this.message = null;
	};
}
