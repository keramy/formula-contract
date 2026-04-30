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
import { logger } from "@/lib/platform/logger";

const JOB_NAME = "finance_digest";
const AREA = "cron";

export async function GET(request: Request) {
  const startedAt = Date.now();

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    logger.error("Cron secret not configured", {
      area: AREA,
      jobName: JOB_NAME,
      event: "cron.finance_digest.misconfigured",
      errorClass: "logic_error",
    });
    return Response.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    logger.warn("Cron unauthorized invocation", {
      area: AREA,
      jobName: JOB_NAME,
      event: "cron.finance_digest.unauthorized",
      status: 401,
    });
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  logger.info("Cron job started", {
    area: AREA,
    jobName: JOB_NAME,
    event: "cron.finance_digest.started",
  });

  try {
    const result = await sendWeeklyDigestEmails();
    const durationMs = Date.now() - startedAt;

    if (!result.success) {
      logger.error("Cron job failed", {
        area: AREA,
        jobName: JOB_NAME,
        event: "cron.finance_digest.failed",
        durationMs,
        errorMessage: result.error,
        errorClass: "job_error",
      });
      return Response.json({ error: result.error }, { status: 500 });
    }

    const sent = result.data?.sent || 0;
    logger.info("Cron job completed", {
      area: AREA,
      jobName: JOB_NAME,
      event: "cron.finance_digest.completed",
      durationMs,
      sent,
    });

    return Response.json({
      success: true,
      sent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    logger.error("Cron job threw exception", {
      area: AREA,
      jobName: JOB_NAME,
      event: "cron.finance_digest.failed",
      durationMs,
      err: error,
      errorClass: "job_error",
    });
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
