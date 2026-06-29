type LatencySample = {
  pathname: string;
  duration: number;
  timestamp: number;
};

const MAX_SAMPLES = 500;
let samples: LatencySample[] = [];

export function recordLatency(pathname: string, duration: number) {
  samples.push({ pathname, duration, timestamp: Date.now() });
  if (samples.length > MAX_SAMPLES) samples = samples.slice(-MAX_SAMPLES);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export function getLatencyStats(cutoffMinutes = 10) {
  const cutoff = Date.now() - cutoffMinutes * 60_000;
  const recent = samples.filter((s) => s.timestamp >= cutoff);

  const byRoute = new Map<string, number[]>();
  for (const s of recent) {
    const arr = byRoute.get(s.pathname);
    if (arr) {
      arr.push(s.duration);
    } else {
      byRoute.set(s.pathname, [s.duration]);
    }
  }

  const routes: Record<
    string,
    { count: number; p50: number; p95: number; p99: number }
  > = {};

  for (const [pathname, durations] of byRoute) {
    const sorted = durations.slice().sort((a, b) => a - b);
    routes[pathname] = {
      count: sorted.length,
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
    };
  }

  const all = recent.map((s) => s.duration).sort((a, b) => a - b);

  return {
    totalRequests: all.length,
    windowMinutes: cutoffMinutes,
    overall: all.length
      ? {
          p50: percentile(all, 50),
          p95: percentile(all, 95),
          p99: percentile(all, 99),
        }
      : null,
    routes,
  };
}

export function clearLatencySamples() {
  samples = [];
}
