/**
 * Milestone Alert Email Template
 *
 * Sent when a milestone is approaching or overdue.
 * Uses different styling for upcoming vs overdue alerts.
 */
import { Text, Hr, Section } from "@react-email/components";
import * as React from "react";
import {
  EmailLayout,
  EmailButton,
  InfoRow,
} from "./components/email-layout";

interface MilestoneAlertEmailProps {
  userName: string;
  milestoneName: string;
  projectName: string;
  projectCode: string;
  dueDate: string;
  daysUntilDue: number; // negative = overdue
  projectUrl: string;
}

export function MilestoneAlertEmail({
  userName,
  milestoneName,
  projectName,
  projectCode,
  dueDate,
  daysUntilDue,
  projectUrl,
}: MilestoneAlertEmailProps) {
  const isOverdue = daysUntilDue < 0;
  const daysText = isOverdue
    ? `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? "s" : ""} overdue`
    : daysUntilDue === 0
    ? "Due today"
    : `${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""} remaining`;

  return (
    <EmailLayout
      previewText={
        isOverdue
          ? `Overdue: ${milestoneName} - ${projectCode}`
          : `Upcoming: ${milestoneName} due in ${daysUntilDue} days`
      }
    >
      <Text className="text-gray-900 text-[24px] font-semibold m-0 mb-[16px]">
        {isOverdue ? "Milestone Overdue" : "Milestone Approaching"}
      </Text>

      <Text className="text-gray-600 text-[15px] leading-[24px] m-0 mb-[24px]">
        Hi {userName}, you have a milestone that requires your attention:
      </Text>

      {/* Alert Box */}
      <Section
        className={`px-[16px] py-[12px] my-[24px] rounded-[6px] ${
          isOverdue
            ? "bg-red-50 border-l-[3px] border-l-red-500"
            : "bg-amber-50 border-l-[3px] border-l-amber-500"
        }`}
      >
        <Text
          className={`text-[13px] font-semibold m-0 ${
            isOverdue ? "text-red-700" : "text-amber-700"
          }`}
        >
          {daysText}
        </Text>
      </Section>

      <Hr className="border-gray-200 my-[24px]" />

      <InfoRow label="Milestone" value={milestoneName} />
      <InfoRow label="Project" value={`${projectName} (${projectCode})`} />
      <InfoRow label="Due Date" value={dueDate} />

      <Hr className="border-gray-200 my-[24px]" />

      <EmailButton href={projectUrl}>View Project</EmailButton>

      <Text className="text-gray-500 text-[13px] leading-[20px] m-0 mt-[24px]">
        {isOverdue
          ? "Please update the milestone status or contact your project manager if you need assistance."
          : "Make sure to complete this milestone before the due date."}
      </Text>
    </EmailLayout>
  );
}

MilestoneAlertEmail.PreviewProps = {
  userName: "John Doe",
  milestoneName: "Client Design Review",
  projectName: "Hilton Hotel Renovation",
  projectCode: "PRJ-2024-001",
  dueDate: "February 15, 2026",
  daysUntilDue: -3,
  projectUrl: "https://formulacontractpm.com/projects/abc123",
} satisfies MilestoneAlertEmailProps;

export default MilestoneAlertEmail;
