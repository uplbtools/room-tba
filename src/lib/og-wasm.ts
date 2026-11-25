// workerd forbids compiling wasm from bytes, so the Worker build hands
// satori/resvg pre-compiled WebAssembly.Module imports. Selected via the
// `og-wasm-runtime` alias in astro.config.mjs; the node build uses
// og-wasm-node.ts instead.
export { default as yogaWasm } from "satori/yoga.wasm?module";
export { default as resvgWasm } from "@resvg/resvg-wasm/index_bg.wasm?module";
