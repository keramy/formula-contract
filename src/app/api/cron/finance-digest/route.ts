/**
 * Finance Weekly Digest Cron Route
 *
 * Triggered by pg_cron (or Vercel Cron) every Monday at 08:00 UTC.
 * Protected by CRON_SECRET bearer token.
 *
 * pg_cron config (run in Supabase SQL Editor after enabling pg_cron + pg_net):
 * SELECT cron.schedule('finance-weekly-digest', '0 8 * * 1', $$
 *   SELECT net.http_post(
 *     url := '<site_url>/api/cron/finance-digest',
 *     headers := jsonb_build_object('Authorization', 'Bearer <cron_secret>'),
 *     body := '{}'::jsonb
 *   );
 * $$);
 */

import { sendWeeklyDigestEmails } from "@/lib/actions/finance";

export async function GET(request: Request) {
  // Verify cron secret. Fail closed: a missing CRON_SECRET is a server
  // configuration error, not a free pass to invoke the digest publicly.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[finance-digest] CRON_SECRET is not configured");
    return Response.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendWeeklyDigestEmails();

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 500 });
    }

    return Response.json({
      success: true,
      sent: result.data?.sent || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[finance-digest cron] Error:", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
