import type { APIRoute } from "astro";
import { getLatencyStats } from "@lib/latency-tracker";

export const prerender = false;

export const GET: APIRoute = async () => {
  const stats = getLatencyStats(10);

  return new Response(
    JSON.stringify(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        latency: stats,
      },
      null,
      2,
    ),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
};
