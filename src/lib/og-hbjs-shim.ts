// workerd shims for harfbuzzjs, which satori/standalone pulls in for text
// shaping (via src/lib/harfbuzzjs-worker.ts). Its emscripten glue does two
// things workerd cannot survive:
//   1. detects Node via `process.versions.node` (true under nodejs_compat) and
//      then reads `__dirname`/`require("fs")` — force the worker branch by
//      setting `process.type = "renderer"`, and
//   2. reads `self.location.href` to derive scriptDirectory — workerd has no
//      `location`.
// This module must be imported before satori so the patches land first.
export {};

const proc = (
  globalThis as {
    process?: { type?: string; versions?: { node?: string } };
  }
).process;
if (proc?.versions?.node !== undefined && proc.type === undefined) {
  // harfbuzzjs checks `process.type != "renderer"` for its Node branch.
  try {
    proc.type = "renderer";
  } catch {
    // Read-only process shim.
  }
}

const g = globalThis as { location?: { href: string } };
if (g.location === undefined) {
  try {
    Object.defineProperty(g, "location", {
      value: { href: "https://room-tba.invalid/" },
      configurable: true,
      writable: true,
    });
  } catch {
    // Read-only global.
  }
}
