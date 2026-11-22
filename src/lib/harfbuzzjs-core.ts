// Shared emscripten glue for harfbuzzjs, used by satori (text shaping for
// /og.png). Each runtime supplies its own wasm loader: the Worker build
// gets a pre-compiled WebAssembly.Module (?module import, since workerd
// forbids compiling wasm from bytes), the node build compiles bytes itself.
import createHarfBuzz from "harfbuzzjs/hb.js";
import hbjs from "harfbuzzjs/hbjs.js";

export function initHarfbuzz(
  getWasmModule: () => Promise<WebAssembly.Module>,
): Promise<unknown> {
  return (async () => {
    const module = await createHarfBuzz({
      instantiateWasm(
        imports: WebAssembly.Imports,
        done: (instance: WebAssembly.Instance, mod: WebAssembly.Module) => void,
      ) {
        // `instantiate(Module)` resolves to a WebAssembly.Instance directly.
        getWasmModule().then(
          (mod) =>
            WebAssembly.instantiate(mod, imports).then(
              (instance) => done(instance, mod),
              (error) => {
                throw error;
              },
            ),
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

    return hbjs(module);
  })();
}
