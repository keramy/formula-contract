import * as Sentry from "@sentry/nextjs";

export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  const enabled = !!dsn;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn,
      enabled,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
      release: process.env.NEXT_PUBLIC_GIT_SHA || undefined,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
      beforeSend(event) {
        return scrubSensitive(event);
      },
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn,
      enabled,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
      release: process.env.NEXT_PUBLIC_GIT_SHA || undefined,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
      beforeSend(event) {
        return scrubSensitive(event);
      },
    });
  }
}

export const onRequestError = Sentry.captureRequestError;

const SENSITIVE_KEY = /password|token|secret|authorization|cookie|^code$/i;

function scrubSensitive<T extends Sentry.ErrorEvent>(event: T): T {
  walk(event as unknown as Record<string, unknown>);
  return event;
}

function walk(obj: Record<string, unknown> | unknown[] | null | undefined) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    obj.forEach((v) => {
      if (v && typeof v === "object") walk(v as Record<string, unknown>);
    });
    return;
  }
  for (const key of Object.keys(obj)) {
    const value = (obj as Record<string, unknown>)[key];
    if (SENSITIVE_KEY.test(key) && typeof value === "string") {
      (obj as Record<string, unknown>)[key] = "[redacted]";
    } else if (value && typeof value === "object") {
      walk(value as Record<string, unknown>);
    }
  }
}
