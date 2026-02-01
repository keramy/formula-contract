/**
 * Report Published Email Template
 *
 * Sent when a report is published for a project.
 */
import { Text, Hr } from "@react-email/components";
import * as React from "react";
import {
  EmailLayout,
  EmailButton,
  CodeBlock,
} from "./components/email-layout";

interface ReportPublishedEmailProps {
  userName: string;
  projectName: string;
  projectCode: string;
  reportType: string;
  publisherName: string;
  reportUrl: string;
}

export function ReportPublishedEmail({
  userName,
  projectName,
  projectCode,
  reportType,
  publisherName,
  reportUrl,
}: ReportPublishedEmailProps) {
  return (
    <EmailLayout previewText={`New ${reportType} report for ${projectName}`}>
      <Text className="text-gray-900 text-[24px] font-semibold m-0 mb-[16px]">
        New report published
      </Text>

      <Text className="text-gray-600 text-[15px] leading-[24px] m-0 mb-[24px]">
        Hi {userName}, {publisherName} has published a new {reportType} report.
      </Text>

      <Hr className="border-gray-200 my-[24px]" />

      <Text className="text-gray-500 text-[12px] uppercase tracking-wider m-0 mb-[4px]">
        Project
      </Text>
      <Text className="text-gray-900 text-[17px] font-medium m-0 mb-[16px]">
        {projectName}
      </Text>

      <Text className="text-gray-500 text-[12px] uppercase tracking-wider m-0 mb-[4px]">
        Project Code
      </Text>
      <CodeBlock>{projectCode}</CodeBlock>

      <Text className="text-gray-500 text-[12px] uppercase tracking-wider m-0 mb-[4px] mt-[16px]">
        Report Type
      </Text>
      <Text className="text-gray-900 text-[15px] capitalize m-0">
        {reportType}
      </Text>

      <Hr className="border-gray-200 my-[24px]" />

      <EmailButton href={reportUrl}>View report</EmailButton>
    </EmailLayout>
  );
}

ReportPublishedEmail.PreviewProps = {
  userName: "John Doe",
  projectName: "Hilton Hotel Renovation",
  projectCode: "PRJ-2024-001",
  reportType: "daily",
  publisherName: "Jane Smith",
  reportUrl: "https://formulacontractpm.com/projects/abc123?tab=reports",
} satisfies ReportPublishedEmailProps;

export default ReportPublishedEmail;
