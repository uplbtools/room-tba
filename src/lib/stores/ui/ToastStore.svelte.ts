export default class ToastStore {
	message: string | null = $state(null);
	type: 'info' | 'error' | 'success' = $state('info');

	show = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
		this.message = message;
		this.type = type;
	};

	clear = () => {
		this.message = null;
	};
}
