export type ErrorClass =
  | "validation_error"
  | "authorization_error"
  | "authentication_error"
  | "integration_error"
  | "database_error"
  | "rls_error"
  | "logic_error"
  | "job_error"
  | "ui_error"
  | "unknown_error";

export interface NormalizedError {
  name: string;
  message: string;
  code?: string;
  errorClass: ErrorClass;
  stack?: string;
  cause?: unknown;
}

export function normalizeError(input: unknown, fallbackClass: ErrorClass = "unknown_error"): NormalizedError {
  if (input instanceof Error) {
    const code = (input as { code?: string }).code;
    return {
      name: input.name,
      message: input.message,
      code,
      errorClass: classifyError(input, code, fallbackClass),
      stack: input.stack,
      cause: (input as { cause?: unknown }).cause,
    };
  }

  if (input && typeof input === "object") {
    const obj = input as Record<string, unknown>;
    const message = typeof obj.message === "string" ? obj.message : JSON.stringify(obj);
    const code = typeof obj.code === "string" ? obj.code : undefined;
    const name = typeof obj.name === "string" ? obj.name : "Object";
    return {
      name,
      message,
      code,
      errorClass: classifyError(input, code, fallbackClass),
    };
  }

  return {
    name: "Unknown",
    message: String(input ?? "Unknown error"),
    errorClass: fallbackClass,
  };
}

function classifyError(err: unknown, code: string | undefined, fallback: ErrorClass): ErrorClass {
  if (code === "54001") return "rls_error";
  if (code === "57014") return "database_error";
  if (code && /^P\d|^[0-9A-Z]{5}$/.test(code) && code !== "PGRST116") return "database_error";
  if (code === "PGRST116") return "logic_error";
  if (code === "42501") return "authorization_error";

  const msg = err instanceof Error ? err.message : "";
  if (/stack depth limit exceeded/i.test(msg)) return "rls_error";
  if (/statement timeout/i.test(msg)) return "database_error";
  if (/permission denied|RLS/i.test(msg)) return "authorization_error";
  if (/JWT|session|unauthenticated/i.test(msg)) return "authentication_error";

  return fallback;
}
