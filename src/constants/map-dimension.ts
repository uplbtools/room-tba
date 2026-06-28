/** Pitch at or below this value is treated as flat 2D (top-down). */
export const TWO_D_PITCH_THRESHOLD = 1;

/** Default pitch when switching from 2D to tilted 3D campus view. */
export const THREE_D_PITCH = 60;

export const BUILDING_FILL_LAYER_ID = "building";
export const BUILDING_3D_LAYER_ID = "building-3d";

/** Style defaults from liberty-customized.json */
export const BUILDING_FILL_MIN_ZOOM = 13;
export const BUILDING_FILL_MAX_ZOOM_3D = 14;
/** Extended range so flat footprints stay visible when extrusions are hidden. */
export const BUILDING_FILL_MAX_ZOOM_2D = 24;

export function isMap2DPitch(pitch: number): boolean {
  return pitch <= TWO_D_PITCH_THRESHOLD;
}
