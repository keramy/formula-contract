import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestLogContext {
  requestId?: string;
  route?: string;
  method?: string;
  userId?: string;
  role?: string;
}

const storage = new AsyncLocalStorage<RequestLogContext>();

export function runWithRequestContext<T>(ctx: RequestLogContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getRequestContext(): RequestLogContext | undefined {
  return storage.getStore();
}

export async function readRequestIdFromHeaders(): Promise<string | undefined> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    return h.get("x-request-id") || undefined;
  } catch {
    return undefined;
  }
}

export function generateRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
