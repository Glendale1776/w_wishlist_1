import { randomUUID } from "node:crypto";

const redactedKeyPattern = /(secret|token|key|password|authorization|cookie|sig)/i;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const [key, fieldValue] of Object.entries(input)) {
    if (redactedKeyPattern.test(key)) {
      output[key] = "[REDACTED]";
      continue;
    }
    output[key] = redact(fieldValue);
  }

  return output;
}

export function getCorrelationId(headers: Headers) {
  return headers.get("x-correlation-id")?.trim() || randomUUID();
}

export function logOpsEvent(scope: string, event: Record<string, unknown>) {
  const payload = {
    timestamp: new Date().toISOString(),
    scope,
    ...event
  };

  console.info(JSON.stringify(redact(payload)));
}
