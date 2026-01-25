/**
 * Welcome Email Template
 *
 * Sent to new users when their account is created.
 * Contains login credentials and first-login instructions.
 */
import { Text, Link, Hr } from "@react-email/components";
import * as React from "react";
import {
  EmailLayout,
  EmailButton,
  CodeBlock,
  Callout,
} from "./components/email-layout";

interface WelcomeEmailProps {
  userName: string;
  userEmail: string;
  tempPassword: string;
  loginUrl: string;
}

export function WelcomeEmail({
  userName,
  userEmail,
  tempPassword,
  loginUrl,
}: WelcomeEmailProps) {
  return (
    <EmailLayout previewText={`Welcome to Formula Contract, ${userName}!`}>
      <Text className="text-gray-900 text-[24px] font-semibold m-0 mb-[16px]">
        Welcome to Formula Contract
      </Text>

      <Text className="text-gray-600 text-[15px] leading-[24px] m-0 mb-[24px]">
        Hi {userName}, your account has been created. Use the credentials below to log in.
      </Text>

      <Hr className="border-gray-200 my-[24px]" />

      {/* Credentials */}
      <Text className="text-gray-500 text-[12px] uppercase tracking-wider m-0 mb-[4px]">
        Email
      </Text>
      <Text className="text-gray-900 text-[15px] m-0 mb-[16px]">
        {userEmail}
      </Text>

      <Text className="text-gray-500 text-[12px] uppercase tracking-wider m-0 mb-[4px]">
        Temporary Password
      </Text>
      <CodeBlock>{tempPassword}</CodeBlock>

      <Hr className="border-gray-200 my-[24px]" />

      <EmailButton href={loginUrl}>Log in to your account</EmailButton>

      <Callout>
        <Text className="text-gray-600 text-[13px] m-0">
          For security, please change your password after your first login.
        </Text>
      </Callout>

      <Text className="text-gray-500 text-[13px] m-0">
        Or copy this link:{" "}
        <Link href={loginUrl} className="text-violet-600 no-underline">
          {loginUrl}
        </Link>
      </Text>
    </EmailLayout>
  );
}

WelcomeEmail.PreviewProps = {
  userName: "John Doe",
  userEmail: "john.doe@example.com",
  tempPassword: "Temp123!xyz",
  loginUrl: "https://formulacontractpm.com/login",
} satisfies WelcomeEmailProps;

export default WelcomeEmail;
