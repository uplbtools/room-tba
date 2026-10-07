import { afterEach, describe, expect, it } from "vitest";
import { trapFocus } from "./focus-trap";

function dialogWithButtons(): HTMLElement {
  const container = document.createElement("div");
  const first = document.createElement("button");
  first.textContent = "first";
  const last = document.createElement("button");
  last.textContent = "last";
  container.append(first, last);
  document.body.append(container);
  return container;
}

function pressEscape(target: EventTarget = document.body) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("trapFocus", () => {
  it("fires onEscape even when focus sits outside the container", () => {
    // The app menu restores focus to its trigger after opening a modal, so
    // Escape must be caught at the document level, not on the container.
    const outside = document.createElement("button");
    document.body.append(outside);
    const container = dialogWithButtons();
    let escaped = 0;
    const release = trapFocus(container, { onEscape: () => escaped++ });

    outside.focus();
    pressEscape(outside);

    expect(escaped).toBe(1);
    release();
  });

  it("routes Escape to the innermost trap only, and back after release", () => {
    const outerEl = dialogWithButtons();
    const innerEl = dialogWithButtons();
    const hits: string[] = [];
    const releaseOuter = trapFocus(outerEl, {
      onEscape: () => hits.push("outer"),
    });
    const releaseInner = trapFocus(innerEl, {
      onEscape: () => hits.push("inner"),
    });

    pressEscape();
    expect(hits).toEqual(["inner"]);

    releaseInner();
    pressEscape();
    expect(hits).toEqual(["inner", "outer"]);
    releaseOuter();
  });

  it("stops handling after release and restores previous focus", async () => {
    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();

    const container = dialogWithButtons();
    let escaped = 0;
    const release = trapFocus(container, { onEscape: () => escaped++ });
    await Promise.resolve(); // initial-focus microtask
    expect(container.contains(document.activeElement)).toBe(true);

    release();
    pressEscape();
    expect(escaped).toBe(0);
    expect(document.activeElement).toBe(outside);
  });

  it("wraps Shift+Tab to a summary, skipping links inside a collapsed details", async () => {
    // The app menu ended in a closed <details>: the trap picked a hidden link
    // as "last", focus() on it was a no-op, and Shift+Tab from the first item
    // went nowhere.
    const container = dialogWithButtons();
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "More";
    summary.tabIndex = 0; // browsers default summary to 0; happy-dom says -1
    const hidden = document.createElement("a");
    hidden.href = "/x";
    details.append(summary, hidden);
    container.append(details);
    const release = trapFocus(container);
    await Promise.resolve();
    const first = container.querySelector("button")!;
    expect(document.activeElement).toBe(first);

    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
      }),
    );
    expect(document.activeElement).toBe(summary);
    release();
  });
});
