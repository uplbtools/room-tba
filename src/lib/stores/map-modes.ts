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

export function deactivateMapModesExcept(active: ExclusiveMapMode) {
  for (const [mode, handle] of registry) {
    if (mode !== active) handle.disable();
  }
}
