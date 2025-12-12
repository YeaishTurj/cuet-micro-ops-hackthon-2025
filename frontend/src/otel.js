import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { Resource } from "@opentelemetry/resources";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { ZoneContextManager } from "@opentelemetry/context-zone";

export function initOtel() {
  const exporterUrl = import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!exporterUrl) return;

  const provider = new WebTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: "delineate-frontend",
    }),
  });

  provider.addSpanProcessor(
    new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: exporterUrl,
      })
    )
  );

  provider.register({
    propagator: new W3CTraceContextPropagator(),
    contextManager: new ZoneContextManager(),
  });

  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
  const corsRegex = new RegExp(
    `^${apiBase.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}`
  );

  registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation({
        propagateTraceHeaderCorsUrls: [corsRegex],
        clearTimingResources: true,
      }),
    ],
    tracerProvider: provider,
  });

  return { provider };
}
