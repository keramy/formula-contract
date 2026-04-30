import * as Sentry from "@sentry/nextjs";
import { getRequestContext } from "./request-context";
import { normalizeError, type ErrorClass } from "./error-utils";

export type LogLevel = "debug" | "info" | "warn" | "error" | "audit";

export interface LogMeta {
  area?: string;
  action?: string;
  event?: string;

  requestId?: string;
  route?: string;
  method?: string;

  userId?: string;
  role?: string;

  projectId?: string;
  entityType?: string;
  entityId?: string;

  durationMs?: number;
  status?: number | string;
  attempt?: number;

  errorName?: string;
  errorMessage?: string;
  errorCode?: string;
  errorClass?: ErrorClass;

  err?: unknown;

  [key: string]: unknown;
}

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  audit: 25,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEY = /password|token|secret|authorization|cookie|^code$/i;

function activeLevel(): LogLevel {
  const env = (process.env.LOG_LEVEL || "").toLowerCase();
  if (env === "debug" || env === "info" || env === "warn" || env === "error" || env === "audit") {
    return env;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function redact<T>(value: T): T {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((v) => redact(v)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY.test(k) && typeof v === "string") {
      out[k] = "[redacted]";
    } else if (v && typeof v === "object") {
      out[k] = redact(v);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

function emit(level: LogLevel, message: string, meta: LogMeta = {}) {
  if (LEVEL_RANK[level] < LEVEL_RANK[activeLevel()]) return;

  const ctx = getRequestContext();
  const merged: LogMeta = { ...ctx, ...meta };

  if (merged.err !== undefined && (!merged.errorMessage || !merged.errorName)) {
    const norm = normalizeError(merged.err, merged.errorClass ?? "unknown_error");
    merged.errorName = merged.errorName ?? norm.name;
    merged.errorMessage = merged.errorMessage ?? norm.message;
    merged.errorCode = merged.errorCode ?? norm.code;
    merged.errorClass = merged.errorClass ?? norm.errorClass;
  }
  delete merged.err;

  const safe = redact(merged);
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...safe,
  };

  // Structured JSON to stdout — Vercel log drains pick this up.
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }

  // Forward error/audit to Sentry (no-op when DSN is unset).
  if (level === "error") {
    if (meta.err instanceof Error) {
      Sentry.captureException(meta.err, { extra: safe as Record<string, unknown> });
    } else {
      Sentry.captureMessage(message, { level: "error", extra: safe as Record<string, unknown> });
    }
  } else if (level === "audit") {
    Sentry.addBreadcrumb({
      category: "audit",
      level: "info",
      message,
      data: safe as Record<string, unknown>,
    });
  }
}

export const logger = {
  debug(message: string, meta?: LogMeta) {
    emit("debug", message, meta);
  },
  info(message: string, meta?: LogMeta) {
    emit("info", message, meta);
  },
  warn(message: string, meta?: LogMeta) {
    emit("warn", message, meta);
  },
  error(message: string, meta?: LogMeta) {
    emit("error", message, meta);
  },
  audit(message: string, meta?: LogMeta) {
    emit("audit", message, meta);
  },
};

export type Logger = typeof logger;
