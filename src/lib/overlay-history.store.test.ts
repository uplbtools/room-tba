// Vitest (happy-dom): needs a real window.history with popstate.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  closeOverlay,
  installOverlayHistory,
  navigateAppHistory,
  openOverlay,
  openOverlayKeys,
  replaceAppUrl,
  resetOverlayHistoryForTests,
} from "./overlay-history";

function url() {
  return `${location.pathname}${location.search}${location.hash}`;
}

/** Back, then let its popstate (and any back the handler issued) settle.
 * Can't await a listener: the module swallows the events it handles. */
async function back() {
  history.back();
  await settle();
}

async function settle() {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 20));
}

/** Entity sync stand-in: a bubble listener after the module's capture one. */
let appPopstates: string[] = [];
function onAppPopstate() {
  appPopstates.push(url());
}

beforeEach(() => {
  resetOverlayHistoryForTests();
  history.replaceState(null, "", "/");
  appPopstates = [];
  installOverlayHistory();
  window.addEventListener("popstate", onAppPopstate);
});

afterEach(() => {
  window.removeEventListener("popstate", onAppPopstate);
  resetOverlayHistoryForTests();
});

describe("overlay history", () => {
  it("Back closes the topmost overlay first and stays in the app", async () => {
    const closeMenu = vi.fn();
    const closeModal = vi.fn();
    openOverlay("menu", closeMenu);
    openOverlay("modal", closeModal);
    await settle();
    expect(history.length).toBeGreaterThanOrEqual(3);

    await back();
    expect(closeModal).toHaveBeenCalledOnce();
    expect(closeMenu).not.toHaveBeenCalled();
    expect(openOverlayKeys()).toEqual(["menu"]);

    await back();
    expect(closeMenu).toHaveBeenCalledOnce();
    expect(openOverlayKeys()).toEqual([]);
    expect(url()).toBe("/");
    // Closing layers over the same page is not a page change.
    expect(appPopstates).toEqual([]);
  });

  it("closing from the X takes the entry back off", async () => {
    const close = vi.fn();
    const before = history.length;
    const id = openOverlay("sheet", close);
    await settle();
    expect(history.state.rtbaOverlayId).toBe(id);

    closeOverlay(id);
    await settle();
    expect(close).not.toHaveBeenCalled();
    expect(history.state?.rtbaOverlayId).toBeUndefined();
    expect(appPopstates).toEqual([]);
    // The next push reuses the slot instead of leaving a stale entry.
    openOverlay("sheet", vi.fn());
    await settle();
    expect(history.length).toBe(before + 1);
  });

  it("an overlay's URL rides on its own entry only", async () => {
    openOverlay("directions", vi.fn(), { url: () => "/?dir=me/psb" });
    await settle();
    expect(url()).toBe("/?dir=me/psb");
    replaceAppUrl(() => "/?dir=me/main-library");
    await settle();
    expect(url()).toBe("/?dir=me/main-library");

    await back();
    expect(url()).toBe("/");
  });

  it("a place picked from the transient search replaces its entry", async () => {
    const closeSearch = vi.fn();
    const searchId = openOverlay("search", closeSearch, { transient: true });
    await settle();
    navigateAppHistory({ query: "psb" }, "/building/psb/");
    await settle();
    expect(url()).toBe("/building/psb/");
    // The search closes itself afterwards (blur); its entry is already gone.
    closeOverlay(searchId);
    await settle();
    expect(url()).toBe("/building/psb/");

    await back();
    expect(url()).toBe("/");
    expect(closeSearch).not.toHaveBeenCalled();
    expect(appPopstates).toEqual(["/"]);
  });

  it("navigating to the URL right below steps back instead of pushing", async () => {
    navigateAppHistory({}, "/building/psb/");
    await settle();
    const length = history.length;
    navigateAppHistory({}, "/");
    await settle();
    expect(url()).toBe("/");
    expect(history.length).toBe(length);
    // The app already shows home; entity sync must not re-run for it.
    expect(appPopstates).toEqual([]);
  });

  it("writes queued behind a silent back land after it", async () => {
    const id = openOverlay("menu", vi.fn());
    await settle();
    closeOverlay(id);
    // Same tick: the menu item opened a screen.
    navigateAppHistory({}, "/planner/");
    await settle();
    expect(url()).toBe("/planner/");
    await back();
    expect(url()).toBe("/");
  });

  it("Back steps over the entry of an overlay that closed under a newer entry", async () => {
    const id = openOverlay("modal", vi.fn());
    await settle();
    navigateAppHistory({}, "/college/cas/");
    await settle();
    closeOverlay(id);
    await settle();
    expect(url()).toBe("/college/cas/");

    await back();
    // Landed on the modal's stale entry and moved on to the page under it.
    expect(url()).toBe("/");
    expect(appPopstates).toEqual(["/"]);
  });

  it("a menu row that swaps the menu for a modal leaves one entry", async () => {
    const menuId = openOverlay("menu", vi.fn());
    await settle();
    const length = history.length;
    // One reactive flush, effects in either order: modal opens, menu closes.
    const closeModal = vi.fn();
    openOverlay("modal", closeModal);
    closeOverlay(menuId);
    await settle();
    expect(openOverlayKeys()).toEqual(["modal"]);
    expect(history.length).toBe(length);

    await back();
    expect(closeModal).toHaveBeenCalledOnce();
    expect(url()).toBe("/");
    expect(history.state?.rtbaOverlayId).toBeUndefined();
  });

  it("two overlays closing together both come off", async () => {
    const menuId = openOverlay("menu", vi.fn());
    const modalId = openOverlay("modal", vi.fn());
    await settle();
    closeOverlay(modalId);
    closeOverlay(menuId);
    await settle();
    expect(history.state?.rtbaOverlayId).toBeUndefined();
    expect(appPopstates).toEqual([]);
  });
});
