import { describe, it, expect } from "bun:test";
import {
  recordLatency,
  getLatencyStats,
  clearLatencySamples,
} from "@lib/latency-tracker";

describe("latency tracker", () => {
  it("records and reports p50/p95/p99", () => {
    clearLatencySamples();
    for (let i = 1; i <= 100; i++) {
      recordLatency("/api/test", i * 10);
    }
    const stats = getLatencyStats(10);
    expect(stats.totalRequests).toBe(100);
    expect(stats.overall?.p50).toBe(500);
    expect(stats.overall?.p95).toBe(950);
    expect(stats.overall?.p99).toBe(990);
    const routeStats = stats.routes["/api/test"];
    expect(routeStats).toBeDefined();
    expect(routeStats!.count).toBe(100);
  });

  it("filters old samples", () => {
    clearLatencySamples();
    recordLatency("/api/old", 100);
    const stats = getLatencyStats(-1);
    expect(stats.totalRequests).toBe(0);
  });
});
