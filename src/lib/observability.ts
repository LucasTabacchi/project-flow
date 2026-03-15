import "server-only";

type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

function normalizeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeValue(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeValue(entry)]),
    );
  }

  return value;
}

function writeLog(level: LogLevel, event: string, context: LogContext = {}) {
  const payload = JSON.stringify({
    level,
    event,
    timestamp: new Date().toISOString(),
    context: normalizeValue(context),
  });

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.info(payload);
}

export function logInfo(event: string, context?: LogContext) {
  writeLog("info", event, context);
}

export function logWarn(event: string, context?: LogContext) {
  writeLog("warn", event, context);
}

export function logError(event: string, context?: LogContext) {
  writeLog("error", event, context);
}
