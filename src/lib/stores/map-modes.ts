export type ExclusiveMapMode =
  | "edit"
  | "routes"
  | "terrain"
  | "travel-time"
  | "measure";

type MapModeHandle = { disable: () => void };

const registry = new Map<ExclusiveMapMode, MapModeHandle>();

export function registerMapMode(mode: ExclusiveMapMode, handle: MapModeHandle) {
  registry.set(mode, handle);
}

/** Turn off every registered mode except `active` (and any it may run beside). */
export function deactivateMapModesExcept(
  active: ExclusiveMapMode,
  ...coexisting: ExclusiveMapMode[]
) {
  for (const [mode, handle] of registry) {
    if (mode !== active && !coexisting.includes(mode)) handle.disable();
  }
}
