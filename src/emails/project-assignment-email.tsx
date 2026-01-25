/**
 * Project Assignment Email Template
 *
 * Sent when a user is assigned to a project.
 */
import { Text, Hr } from "@react-email/components";
import * as React from "react";
import {
  EmailLayout,
  EmailButton,
  CodeBlock,
} from "./components/email-layout";

interface ProjectAssignmentEmailProps {
  userName: string;
  assignerName: string;
  projectName: string;
  projectCode: string;
  projectUrl: string;
}

export function ProjectAssignmentEmail({
  userName,
  assignerName,
  projectName,
  projectCode,
  projectUrl,
}: ProjectAssignmentEmailProps) {
  return (
    <EmailLayout previewText={`You've been assigned to ${projectName}`}>
      <Text className="text-gray-900 text-[24px] font-semibold m-0 mb-[16px]">
        You've been assigned to a project
      </Text>

      <Text className="text-gray-600 text-[15px] leading-[24px] m-0 mb-[24px]">
        Hi {userName}, {assignerName} has added you to the following project:
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

      <Hr className="border-gray-200 my-[24px]" />

      <EmailButton href={projectUrl}>View project</EmailButton>
    </EmailLayout>
  );
}

ProjectAssignmentEmail.PreviewProps = {
  userName: "John Doe",
  assignerName: "Jane Smith",
  projectName: "Hilton Hotel Renovation",
  projectCode: "PRJ-2024-001",
  projectUrl: "https://formulacontractpm.com/projects/abc123",
} satisfies ProjectAssignmentEmailProps;

export default ProjectAssignmentEmail;
