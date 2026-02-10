/**
 * Drawing Sent to Client Email Template
 *
 * Sent when drawings are sent to a client for review/approval.
 */
import { Text, Hr } from "@react-email/components";
import * as React from "react";
import {
  EmailLayout,
  EmailButton,
  CodeBlock,
} from "./components/email-layout";

interface DrawingSentToClientEmailProps {
  userName: string;
  projectName: string;
  projectCode: string;
  drawingCount: number;
  itemCodes: string[];
  senderName: string;
  drawingsPageUrl: string;
}

export function DrawingSentToClientEmail({
  userName,
  projectName,
  projectCode,
  drawingCount,
  itemCodes,
  senderName,
  drawingsPageUrl,
}: DrawingSentToClientEmailProps) {
  const maxDisplay = 10;
  const displayedCodes = itemCodes.slice(0, maxDisplay);
  const remainingCount = itemCodes.length - maxDisplay;

  return (
    <EmailLayout
      previewText={`${drawingCount} drawing${drawingCount !== 1 ? "s" : ""} awaiting your approval for ${projectName}`}
    >
      <Text className="text-gray-900 text-[24px] font-semibold m-0 mb-[16px]">
        Drawings awaiting your approval
      </Text>

      <Text className="text-gray-600 text-[15px] leading-[24px] m-0 mb-[24px]">
        Hi {userName}, {senderName} has sent {drawingCount} drawing
        {drawingCount !== 1 ? "s" : ""} for your review on project{" "}
        {projectName}.
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
        Items
      </Text>
      {displayedCodes.map((code) => (
        <Text
          key={code}
          className="text-gray-900 text-[14px] font-mono m-0 mb-[4px]"
        >
          {code}
        </Text>
      ))}
      {remainingCount > 0 && (
        <Text className="text-gray-500 text-[13px] m-0 mb-[4px]">
          + {remainingCount} more
        </Text>
      )}

      <Hr className="border-gray-200 my-[24px]" />

      <EmailButton href={drawingsPageUrl}>Review drawings</EmailButton>
    </EmailLayout>
  );
}

DrawingSentToClientEmail.PreviewProps = {
  userName: "John Doe",
  projectName: "Hilton Hotel Ankara",
  projectCode: "HA-2026",
  drawingCount: 5,
  itemCodes: ["HA-001", "HA-002", "HA-003", "HA-004", "HA-005"],
  senderName: "Jane Smith",
  drawingsPageUrl: "https://formulacontractpm.com/projects/abc123?tab=drawings",
} satisfies DrawingSentToClientEmailProps;

export default DrawingSentToClientEmail;
