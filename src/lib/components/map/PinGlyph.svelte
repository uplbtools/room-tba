<script lang="ts" module>
	// Filled glyphs for map pins (Material Symbols, Apache-2.0). Stroke-based
	// Lucide reads as visual noise at pin sizes; filled shapes match the
	// filled Room TBA logo (design feedback, 2026-07-25).
	export const PIN_GLYPH_PATHS = {
		building:
			'M200-280v-280h80v280h-80Zm240 0v-280h80v280h-80ZM80-120v-80h800v80H80Zm560-160v-280h80v280h-80ZM80-640v-76l400-204 400 204v76H80Z',
		dorm: 'M160-120v-480l320-240 320 240v480H560v-280H400v280H160Z',
		landmark: 'M200-120v-680h360l16 80h224v400H520l-16-80H280v280h-80Z',
		establishment:
			'M240-80q-33 0-56.5-23.5T160-160v-480q0-33 23.5-56.5T240-720h80q0-66 47-113t113-47q66 0 113 47t47 113h80q33 0 56.5 23.5T800-640v480q0 33-23.5 56.5T720-80H240Zm160-640h160q0-33-23.5-56.5T480-800q-33 0-56.5 23.5T400-720ZM480-440q66 0 113-47t47-113h-80q0 33-23.5 56.5T480-520q-33 0-56.5-23.5T400-600h-80q0 66 47 113t113 47Z',
		organization:
			'M40-160v-112q0-34 17.5-62.5T104-378q62-31 126-46.5T360-440q66 0 130 15.5T616-378q29 15 46.5 43.5T680-272v112H40Zm720 0v-120q0-44-24.5-84.5T666-434q51 6 96 20.5t84 35.5q29 16 45.5 43t16.5 59v116H760ZM360-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm400-160q0 66-47 113t-113 47q-11 0-28-2.5t-28-5.5q27-32 41.5-71t14.5-81q0-42-14.5-81T544-792q14-5 28-6.5t28-1.5q66 0 113 47t47 113Z',
		office:
			'M160-120q-33 0-56.5-23.5T80-200v-440q0-33 23.5-56.5T160-720h160v-80q0-33 23.5-56.5T400-880h160q33 0 56.5 23.5T640-800v80h160q33 0 56.5 23.5T880-640v440q0 33-23.5 56.5T800-120H160Zm240-600h160v-80H400v80Z',
		event:
			'M580-240q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29ZM200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Z'
	} as const;

	export type PinGlyphName = keyof typeof PIN_GLYPH_PATHS;
</script>

<script lang="ts">
	let { name, size = 16 }: { name: PinGlyphName; size?: number | string } = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 -960 960 960"
	fill="currentColor"
	aria-hidden="true"
>
	<path d={PIN_GLYPH_PATHS[name]} />
</svg>
