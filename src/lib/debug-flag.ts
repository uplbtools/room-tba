/**
 * Developer flag for map debugging tools (the live camera readout). Normal
 * users never see these: they appear only after visiting with `?debug=1`
 * (remembered in localStorage) or with `room-tba:debug` set by hand.
 * `?debug=0` turns it back off.
 */

export const DEBUG_STORAGE_KEY = "room-tba:debug";

function truthy(value: string | null): boolean {
  return value === "1" || value === "true";
}

export function readDebugFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const param = new URLSearchParams(window.location.search).get("debug");
    if (param !== null) {
      const on = truthy(param);
      if (on) localStorage.setItem(DEBUG_STORAGE_KEY, "1");
      else localStorage.removeItem(DEBUG_STORAGE_KEY);
      return on;
    }
    return truthy(localStorage.getItem(DEBUG_STORAGE_KEY));
  } catch {
    // Private mode: the query param still works for this page view.
    return truthy(new URLSearchParams(window.location.search).get("debug"));
  }
}

/** Read once per page load; flipping it takes a reload, like any dev flag. */
export const debugMode = readDebugFlag();
