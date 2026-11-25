// Node/E2E build counterpart of og-wasm.ts: `*.wasm?module` only resolves
// in the Cloudflare build, so here the wasm is read straight from
// node_modules. satori/resvg `init` accept a Buffer (BufferSource).
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export const yogaWasm = readFileSync(require.resolve("satori/yoga.wasm"));
export const resvgWasm = readFileSync(
  require.resolve("@resvg/resvg-wasm/index_bg.wasm"),
);
