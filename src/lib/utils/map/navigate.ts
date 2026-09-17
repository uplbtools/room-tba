import { map } from "$lib/stores.svelte";
import type * as mapGl from "maplibre-gl";

const SIDEPANEL_WIDTH = 25.75 * 16;


export const calculatePadding = (md: boolean): mapGl.PaddingOptions => {
	if (md) {
		return {
			bottom: window.innerWidth / 2,
			left: 0,
		};
	}
	return {
		left: SIDEPANEL_WIDTH,
		bottom: 0,
	};
};

export const withinMapZoom = (zoomLevel: number): boolean => {
	return zoomLevel <= map.zoomLevel;
}