import { bindings, defineConfig, exports } from "cf/config";

export default defineConfig({
  accountId: "90c67c01376ba41cb059c6fa7cb9d70e",
  worker: {
    name: "eduk12-scale",
    entrypoint: "./src/index.ts",
    compatibilityDate: "2026-11-21",
    workersDev: true,
    observability: {
      enabled: true,
      logs: { enabled: true },
      traces: { enabled: true },
    },
    assets: {
      runWorkerFirst: ["/api/*", "/health"],
      htmlHandling: "auto-trailing-slash",
      notFoundHandling: "404-page",
    },
    exports: {
      RealtimeHub: exports.durableObject({ storage: "sqlite" }),
    },
    env: {
      DB: bindings.d1({ name: "eduk12-db" }),
      EDU_KV: bindings.kv(),
      AI: bindings.ai(),
      ASSETS: bindings.assets(),
      REALTIME_HUB: bindings.durableObject({ worker: "eduk12-scale", exportName: "RealtimeHub" }),
    },
  },
});
