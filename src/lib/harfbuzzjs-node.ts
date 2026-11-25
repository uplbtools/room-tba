// Node/E2E entry for the `harfbuzzjs` alias (see astro.config.mjs).
// `*.wasm?module` only resolves in the Cloudflare build, so the wasm is
// read from node_modules and compiled here — node allows it.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { initHarfbuzz } from "./harfbuzzjs-core";

const require = createRequire(import.meta.url);
const wasmBytes = readFileSync(require.resolve("harfbuzzjs/hb.wasm"));
const hb = await initHarfbuzz(async () => WebAssembly.compile(wasmBytes));

export default hb;
