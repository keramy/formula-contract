/**
 * Milestone Alert Cron Job
 *
 * Runs daily to check for upcoming and overdue milestones.
 * Sends email + in-app notifications to team members.
 *
 * Schedule: Every day at 8:00 AM UTC (configured in vercel.json)
 */

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { MilestoneAlertEmail } from "@/emails/milestone-alert-email";
import { NextResponse } from "next/server";

// Use service role key for cron jobs (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://formula-contract.vercel.app";

interface MilestoneWithProject {
  id: string;
  name: string;
  due_date: string;
  alert_days_before: number;
  project_id: string;
  project: {
    name: string;
    project_code: string;
  };
}

interface TeamMember {
  user_id: string;
  user: {
    id: string;
    name: string;
    email: string;
    email_notifications: boolean;
  };
}

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Find milestones that need alerts:
    // 1. Not completed
    // 2. Due date - alert_days_before <= today (within alert window)
    // 3. Alert not already sent today
    const { data: milestones, error: milestonesError } = await supabase
      .from("milestones")
      .select(
        `
        id,
        name,
        due_date,
        alert_days_before,
        project_id,
        alert_sent_at,
        project:projects!inner(name, project_code)
      `
      )
      .eq("is_completed", false)
      .or(`alert_sent_at.is.null,alert_sent_at.lt.${todayStr}`);

    if (milestonesError) {
      console.error("Error fetching milestones:", milestonesError);
      return NextResponse.json(
        { error: "Failed to fetch milestones" },
        { status: 500 }
      );
    }

    // Filter milestones within alert window
    const milestonesToAlert = (milestones || []).filter((m) => {
      const dueDate = new Date(m.due_date);
      const alertDays = m.alert_days_before || 7;
      const alertStartDate = new Date(dueDate);
      alertStartDate.setDate(alertStartDate.getDate() - alertDays);

      return today >= alertStartDate;
    }) as unknown as MilestoneWithProject[];

    if (milestonesToAlert.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No milestones need alerts",
        processed: 0,
      });
    }

    let emailsSent = 0;
    let notificationsCreated = 0;

    for (const milestone of milestonesToAlert) {
      // Calculate days until due
      const dueDate = new Date(milestone.due_date);
      const diffTime = dueDate.getTime() - today.getTime();
      const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Get team members for this project
      // Use explicit FK reference since project_assignments has two FKs to users (user_id, assigned_by)
      const { data: teamMembers, error: teamError } = await supabase
        .from("project_assignments")
        .select(
          `
          user_id,
          user:users!project_assignments_user_id_fkey(id, name, email, email_notifications)
        `
        )
        .eq("project_id", milestone.project_id);

      if (teamError) {
        console.error("Error fetching team members:", teamError);
        continue;
      }

      if (!teamMembers || teamMembers.length === 0) continue;

      const typedTeamMembers = teamMembers as unknown as TeamMember[];

      // Create in-app notifications for all team members
      const alertTitle =
        daysUntilDue < 0
          ? `Milestone overdue: ${milestone.name}`
          : daysUntilDue === 0
          ? `Milestone due today: ${milestone.name}`
          : `Milestone due in ${daysUntilDue} days: ${milestone.name}`;

      const notifications = typedTeamMembers.map((tm) => ({
        user_id: tm.user_id,
        type: daysUntilDue < 0 ? "milestone_overdue" : "milestone_due",
        title: alertTitle,
        message: `Project: ${milestone.project.name}`,
        project_id: milestone.project_id,
      }));

      const { error: notifError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (notifError) {
        console.error("Error creating notifications:", notifError);
      } else {
        notificationsCreated += notifications.length;
      }

      // Send emails to team members who have email notifications enabled
      if (resend) {
        for (const tm of typedTeamMembers) {
          if (!tm.user.email_notifications || !tm.user.email) continue;

          try {
            await resend.emails.send({
              from: "Formula Contract <noreply@formulacontractpm.com>",
              to: tm.user.email,
              subject: alertTitle,
              react: MilestoneAlertEmail({
                userName: tm.user.name,
                milestoneName: milestone.name,
                projectName: milestone.project.name,
                projectCode: milestone.project.project_code,
                dueDate: new Date(milestone.due_date).toLocaleDateString(
                  "en-US",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }
                ),
                daysUntilDue,
                projectUrl: `${siteUrl}/projects/${milestone.project_id}?tab=milestones`,
              }),
            });
            emailsSent++;
          } catch (emailError) {
            console.error(
              `Failed to send email to ${tm.user.email}:`,
              emailError
            );
          }
        }
      }

      // Mark milestone as alerted
      await supabase
        .from("milestones")
        .update({ alert_sent_at: new Date().toISOString() })
        .eq("id", milestone.id);
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${milestonesToAlert.length} milestones`,
      processed: milestonesToAlert.length,
      emailsSent,
      notificationsCreated,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
