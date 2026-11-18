/**
 * Travel-time calibration knobs for the campus path network (#847, #848).
 *
 * ponytail: flat per-mode speeds, no slope/surface factors; calibrate here
 * against real campus timings (walk speed matches the research notebook),
 * and fold into campus.config.ts if per-campus config sections land (#844).
 */

export const WALK_KPH = 4.5;
export const CYCLE_KPH = 15;
/** Campus posted limit; caps tagged maxspeed and fills in untagged edges. */
export const DRIVE_CAP_KPH = 30;

/** OSM highway classes cars / e-bikes may use; everything else is footpath. */
export const DRIVE_HIGHWAY_CLASSES: ReadonlySet<string> = new Set([
	'service',
	'tertiary',
	'residential',
	'unclassified'
]);

/** Cycling skips stairs. */
export const CYCLE_EXCLUDED_CLASS = 'steps';

/** A trip end farther than this from the mapped paths can't be planned honestly. */
export const ENDPOINT_SNAP_TOLERANCE_METERS = 250;

/** Isochrone color ramp caps here; farther edges keep the last color. */
export const ISOCHRONE_CAP_MINUTES = 30;

/** Standard viridis ramp (8 stops, matplotlib): near = dark purple, far = yellow. */
export const VIRIDIS_STOPS = [
	'#440154',
	'#46327e',
	'#365c8d',
	'#277f8e',
	'#1fa187',
	'#4ac16d',
	'#a0da39',
	'#fde725'
] as const;

/** Door-to-door jeep speed including stops, not the cruising speed. */
export const JEEPNEY_KPH = 14;

/** Half of a roughly 10 minute headway, since campus jeeps run on frequency. */
export const JEEPNEY_WAIT_SECONDS = 5 * 60;

/** Beyond this, walking to a stop costs more than the ride saves. */
export const MAX_ACCESS_WALK_METERS = 900;

/** A stop farther than this from a path node can't be reached on foot. */
export const STOP_SNAP_TOLERANCE_METERS = 120;

/** A ride that saves less than this isn't worth the wait. */
export const MIN_RIDE_SAVING_SECONDS = 3 * 60;
