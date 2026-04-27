import { Resend } from "resend";

let warned = false;

/**
 * Returns a configured Resend client, or null if RESEND_API_KEY is unset.
 *
 * Callers should treat null as "email delivery is disabled in this
 * environment" — never throw, never block the surrounding action. This
 * mirrors the existing skip-on-missing-key behavior that was duplicated
 * across every email-sending action.
 *
 * The missing-key warning is logged at most once per process so a
 * misconfigured deployment is visible without flooding logs.
 */
export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (!warned) {
      console.warn("[mail] RESEND_API_KEY is not configured — email delivery disabled");
      warned = true;
    }
    return null;
  }
  return new Resend(apiKey);
}
