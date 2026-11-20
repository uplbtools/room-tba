let registered = false;

export function register(): void {
  if (registered) return;

  const apiKey = process.env.DD_API_KEY?.trim();
  if (!apiKey) return;

  registered = true;

  // @vercel/otel pulls Node-only deps; load it lazily so non-Vercel runtimes
  // (Cloudflare Workers) can import this module without the package in the
  // critical path. Datadog is optional everywhere.
  void (async () => {
    try {
      const { registerOTel, OTLPHttpProtoTraceExporter } = await import(
        "@vercel/otel"
      );
      const site = process.env.DD_SITE?.trim() || "us5.datadoghq.com";
      const isProduction =
        process.env.VERCEL_ENV === "production" ||
        process.env.PUBLIC_APP_ENV === "production";

      registerOTel({
        serviceName: process.env.DD_SERVICE?.trim() || "room-tba",
        traceExporter: new OTLPHttpProtoTraceExporter({
          url:
            process.env.DD_OTLP_ENDPOINT?.trim() ||
            `https://otlp.${site}/v1/traces`,
          headers: {
            "dd-api-key": apiKey,
          },
        }),
        traceSampler: isProduction ? "parentbased_traceidratio" : "always_on",
      });
    } catch (error) {
      console.error("OTel registration failed:", error);
    }
  })();
}
