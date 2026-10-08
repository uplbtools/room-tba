import { getContext, setContext } from "svelte";

/**
 * What a modal surface (Dialog, the You sheet) tells the screens inside it,
 * so one screen component renders the same top app bar wherever it opens:
 * an X at the root of a surface, a back arrow when it was pushed onto one.
 */
export type SheetContext = {
  /** Close the whole surface (the X). */
  readonly close: () => void;
  readonly closeLabel: string;
  /** Pop one nested screen; null at the root. */
  readonly back: (() => void) | null;
  /** A header mounted: the host drops its fallback close button. */
  readonly claimHeader?: () => () => void;
};

const KEY = Symbol("sheet");

export function setSheetContext(context: SheetContext): void {
  setContext(KEY, context);
}

export function getSheetContext(): SheetContext | undefined {
  return getContext<SheetContext | undefined>(KEY);
}
