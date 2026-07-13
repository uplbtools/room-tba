import { registerOTel, OTLPHttpProtoTraceExporter } from "@vercel/otel";

let registered = false;

export function register(): void {
  if (registered) return;

  const apiKey = process.env.DD_API_KEY?.trim();
  if (!apiKey) return;

  registered = true;

  const site = process.env.DD_SITE?.trim() || "us5.datadoghq.com";
  const isProduction = process.env.VERCEL_ENV === "production";

  if (isProduction) {
    process.env.OTEL_TRACES_SAMPLER = "parentbased_traceidratio";
    process.env.OTEL_TRACES_SAMPLER_ARG = "0.1";
  }

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
}
