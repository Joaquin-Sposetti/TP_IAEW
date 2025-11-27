const { NodeSDK } = require("@opentelemetry/sdk-node");  // usa la versión 0.44
const { Resource } = require("@opentelemetry/resources"); 
const { SemanticResourceAttributes } = require("@opentelemetry/semantic-conventions");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-grpc");

const exporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
});

const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "unknown-service",
  [SemanticResourceAttributes.SERVICE_VERSION]: "1.0.0",
});

const sdk = new NodeSDK({
  traceExporter: exporter,
  resource,
});

module.exports = {
  startOtel: async () => {
    try {
      await sdk.start();
      console.log(`[otel] tracing iniciado para: ${process.env.OTEL_SERVICE_NAME}`);
    } catch (err) {
      console.error("[otel] error iniciando tracing:", err);
    }
  }
};
