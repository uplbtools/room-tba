import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/svelte';
import { afterEach } from 'vitest';
import '#lib/components/map-chrome/map-chrome.css';

document.documentElement.style.setProperty('--map-chrome-toggle-size', '2.75rem');

if (!Element.prototype.animate) {
	Element.prototype.animate = () =>
		({
			finished: Promise.resolve(),
			cancel: () => {}
		}) as unknown as Animation;
}

afterEach(() => {
	cleanup();
});
