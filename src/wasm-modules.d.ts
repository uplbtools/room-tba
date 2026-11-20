// Vite/rolldown resolves `*.wasm?module` to a compiled WebAssembly.Module
// (same mechanism @vercel/og used for its bundled yoga/resvg wasm).
declare module "*.wasm?module" {
  const wasmModule: WebAssembly.Module;
  export default wasmModule;
}

// Untyped CJS internals of harfbuzzjs; wrapped by src/lib/harfbuzzjs-worker.ts.
declare module "harfbuzzjs/hb.js" {
  const createHarfBuzz: (
    moduleArg?: Record<string, unknown>,
  ) => Promise<unknown> | unknown;
  export default createHarfBuzz;
}
declare module "harfbuzzjs/hbjs.js" {
  const hbjs: (instance: unknown) => unknown;
  export default hbjs;
}
