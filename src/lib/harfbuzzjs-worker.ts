// workerd entry for the `harfbuzzjs` alias (see astro.config.mjs): satori
// gets a drop-in replacement for text shaping. workerd cannot compile
// hb.wasm from bytes, so the wasm ships as a pre-compiled module import.
import hbWasmModule from "harfbuzzjs/hb.wasm?module";
import { initHarfbuzz } from "./harfbuzzjs-core";

const hb = await initHarfbuzz(async () => hbWasmModule);
export default hb;
