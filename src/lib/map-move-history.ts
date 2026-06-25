export type MapMoveCoordinates = {
  lat: number;
  lon: number;
};

export type VersionedMapMove = {
  key: string;
  name: string;
  previous: MapMoveCoordinates;
  current: MapMoveCoordinates;
  version: number;
};

export type MapMoveStacks<TMove extends VersionedMapMove> = {
  undoStack: TMove[];
  redoStack: TMove[];
};

export type MapEditShortcutAction = "undo" | "redo";

export function recordMapMove<TMove extends VersionedMapMove>(
  undoStack: TMove[],
  move: TMove,
): MapMoveStacks<TMove> {
  return {
    undoStack: [...undoStack, move],
    redoStack: [],
  };
}

export function completeMapMoveUndo<TMove extends VersionedMapMove>(
  undoStack: TMove[],
  redoStack: TMove[],
  move: TMove,
  version: number,
): MapMoveStacks<TMove> {
  return {
    undoStack: undoStack.slice(0, -1),
    redoStack: [...redoStack, { ...move, version }],
  };
}

export function completeMapMoveRedo<TMove extends VersionedMapMove>(
  undoStack: TMove[],
  redoStack: TMove[],
  move: TMove,
  version: number,
): MapMoveStacks<TMove> {
  return {
    undoStack: [...undoStack, { ...move, version }],
    redoStack: redoStack.slice(0, -1),
  };
}

export function getMapEditShortcutAction(
  event: Pick<KeyboardEvent, "ctrlKey" | "key" | "metaKey" | "shiftKey">,
): MapEditShortcutAction | null {
  const isModifierPressed = event.ctrlKey || event.metaKey;
  if (!isModifierPressed) return null;

  const key = event.key.toLowerCase();
  if (key === "z") return event.shiftKey ? "redo" : "undo";
  if (key === "y") return "redo";
  return null;
}
