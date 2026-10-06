import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/svelte";
import { afterEach } from "vitest";
import "@ui/map-chrome/map-chrome.css";

document.documentElement.style.setProperty(
  "--map-chrome-toggle-size",
  "2.75rem",
);

// Always stub, not only when missing: happy-dom 20.14 ships a real
// Element.animate whose `finished` promise rejects when Svelte cancels a
// transition on unmount, and Vitest 5 fails the run on those rejections.
Element.prototype.animate = () =>
  ({
    finished: Promise.resolve(),
    cancel: () => {},
  }) as unknown as Animation;

// Component tests never reach a server. A component that fetches on mount
// would otherwise send a real request that happy-dom aborts at teardown,
// which Vitest 5 also reports as an unhandled error. Tests that care about
// fetch stub it themselves, which replaces this default.
globalThis.fetch = async () => new Response(null, { status: 404 });

if (typeof window !== "undefined") {
  (window as any).turnstile = {
    render: () => "mock-widget-id",
    remove: () => {},
  };
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as any;
}

afterEach(() => {
  cleanup();
});
