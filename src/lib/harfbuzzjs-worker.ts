// Drop-in replacement for the `harfbuzzjs` package entry point, used only
// by satori (text shaping for /og.png). workerd forbids compiling wasm from
// bytes (`WebAssembly.instantiate(): Wasm code generation disallowed`), so
// the stock index.js — which fetches hb.wasm and compiles it at runtime —
// cannot work. Instead we hand the emscripten glue a pre-compiled module
// (bundled as a Workers wasm module import, same as yoga/resvg).
import createHarfBuzz from "harfbuzzjs/hb.js";
import hbjs from "harfbuzzjs/hbjs.js";
import hbWasmModule from "harfbuzzjs/hb.wasm?module";

const module = await createHarfBuzz({
  instantiateWasm(
    imports: WebAssembly.Imports,
    done: (instance: WebAssembly.Instance, mod: WebAssembly.Module) => void,
  ) {
    // `instantiate(Module)` resolves to a WebAssembly.Instance directly.
    WebAssembly.instantiate(hbWasmModule, imports).then(
      (instance) => done(instance, hbWasmModule),
      (error) => {
        throw error;
      },
    );
    return {};
  },
});

// hbjs() wraps JS callbacks for wasm via emscripten's addFunction, which
// generates a wasm module at runtime — disallowed in workerd. Every
// addFunction call site is in an API satori never uses (glyph extents,
// names, draw, trace) except freeFuncPtr, which becomes hb_blob_create's
// destroy callback: 0 is a valid NULL there. Stub both to no-ops.
const emscriptenModule = module as {
  addFunction?: unknown;
  removeFunction?: unknown;
};
emscriptenModule.addFunction = () => 0;
emscriptenModule.removeFunction = () => {};

export default hbjs(module);
