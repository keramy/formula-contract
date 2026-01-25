/**
 * Shared Email Layout Component
 *
 * Minimal & Clean design - white background, dark text, single accent color.
 * Professional business style inspired by Stripe/Linear emails.
 */
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Preview,
  Tailwind,
  Hr,
} from "@react-email/components";
import * as React from "react";

interface EmailLayoutProps {
  previewText: string;
  children: React.ReactNode;
}

export function EmailLayout({ previewText, children }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white font-sans m-0 p-0">
          <Container className="mx-auto max-w-[560px] py-[40px] px-[24px]">
            {/* Logo/Brand */}
            <Section className="mb-[32px]">
              <Text className="text-[18px] font-semibold text-gray-900 m-0">
                Formula Contract
              </Text>
            </Section>

            {/* Main Content */}
            {children}

            {/* Footer */}
            <Hr className="border-gray-200 my-[32px]" />
            <Section>
              <Text className="text-gray-400 text-[12px] m-0 leading-[20px]">
                Formula Contract · Project Management for Furniture Manufacturing
              </Text>
              <Link
                href="https://formulacontractpm.com"
                className="text-gray-400 text-[12px] no-underline"
              >
                formulacontractpm.com
              </Link>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

/**
 * Primary action button
 */
interface EmailButtonProps {
  href: string;
  children: React.ReactNode;
}

export function EmailButton({ href, children }: EmailButtonProps) {
  return (
    <Section className="my-[24px]">
      <Link
        href={href}
        className="inline-block bg-gray-900 text-white px-[20px] py-[12px] rounded-[6px] font-medium text-[14px] no-underline"
      >
        {children}
      </Link>
    </Section>
  );
}

/**
 * Secondary/outline button
 */
interface SecondaryButtonProps {
  href: string;
  children: React.ReactNode;
}

export function SecondaryButton({ href, children }: SecondaryButtonProps) {
  return (
    <Link
      href={href}
      className="text-violet-600 text-[14px] font-medium no-underline"
    >
      {children}
    </Link>
  );
}

/**
 * Code/credential display block
 */
interface CodeBlockProps {
  children: React.ReactNode;
}

export function CodeBlock({ children }: CodeBlockProps) {
  return (
    <Text
      className="bg-gray-100 text-gray-900 px-[16px] py-[12px] rounded-[6px] text-[15px] font-mono m-0 my-[8px] tracking-wide"
    >
      {children}
    </Text>
  );
}

/**
 * Key-value row for displaying info
 */
interface InfoRowProps {
  label: string;
  value: React.ReactNode;
}

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <Section className="mb-[16px]">
      <Text className="text-gray-500 text-[12px] uppercase tracking-wider m-0 mb-[4px]">
        {label}
      </Text>
      <Text className="text-gray-900 text-[15px] m-0">
        {value}
      </Text>
    </Section>
  );
}

/**
 * Highlighted box for important information
 */
interface CalloutProps {
  children: React.ReactNode;
}

export function Callout({ children }: CalloutProps) {
  return (
    <Section className="bg-gray-50 border-l-[3px] border-l-gray-300 px-[16px] py-[12px] my-[24px]">
      {children}
    </Section>
  );
}
