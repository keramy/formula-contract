/**
 * Finance Urgent Notification Email Template
 *
 * Used for: "Notify Team" with selected invoices
 * Shows the sender's note + compact invoice list.
 * Full details are in the attached PDF.
 */
import { Text, Hr, Section } from "@react-email/components";
import * as React from "react";
import { EmailLayout, EmailButton } from "./components/email-layout";

interface UrgentInvoiceRow {
  supplier_name: string;
  invoice_code: string;
  amount_owed: number;
  currency: string;
  due_date: string;
}

interface FinanceUrgentEmailProps {
  senderName: string;
  note?: string;
  invoices: UrgentInvoiceRow[];
  totalsByurrency: Record<string, number>;
  dashboardUrl: string;
}

function formatAmount(amount: number, currency: string): string {
  const symbols: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };
  return `${symbols[currency] || currency}${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function FinanceUrgentEmail({
  senderName,
  note,
  invoices,
  totalsByurrency,
  dashboardUrl,
}: FinanceUrgentEmailProps) {
  const totalsText = Object.entries(totalsByurrency)
    .map(([currency, amount]) => formatAmount(amount, currency))
    .join(" + ");

  return (
    <EmailLayout
      previewText={`⚠️ Urgent: ${invoices.length} payment${invoices.length !== 1 ? "s" : ""} need processing (${totalsText})`}
    >
      <Text className="text-gray-900 text-[22px] font-semibold m-0 mb-[4px]">
        ⚠️ Urgent Payment Alert
      </Text>

      <Text className="text-gray-500 text-[14px] m-0 mb-[16px]">
        Sent by {senderName} · {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} · {totalsText}
      </Text>

      {note && (
        <Section className="bg-amber-50 border border-amber-200 px-[14px] py-[10px] rounded-[6px] mb-[20px]">
          <Text className="text-amber-900 text-[13px] m-0 italic">"{note}"</Text>
        </Section>
      )}

      <Section className="mb-[16px]">
        {invoices.map((inv) => (
          <Section key={inv.invoice_code} className="py-[6px] border-b border-gray-100">
            <Text className="text-[13px] m-0">
              <span className="text-gray-900 font-medium">{inv.supplier_name}</span>
              <span className="text-gray-400"> · {inv.invoice_code}</span>
            </Text>
            <Text className="text-[13px] m-0 mt-[2px]">
              <span className="text-gray-900 font-semibold">{formatAmount(inv.amount_owed, inv.currency)}</span>
              <span className="text-gray-500 text-[12px]"> · due {inv.due_date}</span>
            </Text>
          </Section>
        ))}
      </Section>

      <Hr className="border-gray-200 my-[20px]" />

      <Text className="text-gray-500 text-[12px] m-0 mb-[16px]">
        📎 Payment details with bank info attached as PDF
      </Text>

      <EmailButton href={dashboardUrl}>View in App</EmailButton>
    </EmailLayout>
  );
}
