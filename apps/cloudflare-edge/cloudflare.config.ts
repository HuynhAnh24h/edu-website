import { bindings, defineConfig, exports, triggers } from "cf/config";

export default defineConfig({
  accountId: "90c67c01376ba41cb059c6fa7cb9d70e",
  worker: {
    name: "owlie",
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
    triggers: [triggers.scheduled({ schedule: "0 19 * * *" })],
    env: {
      DB: bindings.d1({ name: "eduk12-db" }),
      EDU_KV: bindings.kv({ id: "2b8ecb1e3b5e4467a54ca879fa921af0" }),
      AI: bindings.ai(),
      ASSETS: bindings.assets(),
      REALTIME_HUB: bindings.durableObject({ worker: "owlie", exportName: "RealtimeHub" }),
      // Sau khi bật R2 (10 GB miễn phí/tháng) trên Cloudflare Dashboard, bỏ comment dòng dưới để kích hoạt:
      // MATERIALS_R2: bindings.r2({ name: "eduk12-materials" }),
    },
  },
});
