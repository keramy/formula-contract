/**
 * Finance Summary Email Template
 *
 * Used for: weekly digest + manual "Send Summary"
 * Shows a compact table of due/overdue invoices + expected incoming.
 * Full details are in the attached PDF.
 */
import { Text, Hr, Section } from "@react-email/components";
import * as React from "react";
import { EmailLayout, EmailButton } from "./components/email-layout";

interface InvoiceSummaryRow {
  supplier_name: string;
  invoice_code: string;
  amount_owed: number;
  currency: string;
  due_date: string;
  days_overdue: number;
}

interface ReceivableSummaryRow {
  client_name: string;
  receivable_code: string;
  amount: number;
  currency: string;
  due_date: string;
}

interface FinanceSummaryEmailProps {
  weekLabel: string; // e.g. "March 23rd Week"
  note?: string;
  overdueItems: InvoiceSummaryRow[];
  dueItems: InvoiceSummaryRow[];
  incomingItems: ReceivableSummaryRow[];
  totalsByurrency: Record<string, number>;
  dashboardUrl: string;
}

function formatAmount(amount: number, currency: string): string {
  const symbols: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };
  return `${symbols[currency] || currency}${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function FinanceSummaryEmail({
  weekLabel,
  note,
  overdueItems,
  dueItems,
  incomingItems,
  totalsByurrency,
  dashboardUrl,
}: FinanceSummaryEmailProps) {
  const totalCount = overdueItems.length + dueItems.length;
  const totalsText = Object.entries(totalsByurrency)
    .map(([currency, amount]) => formatAmount(amount, currency))
    .join(" + ");

  return (
    <EmailLayout previewText={`${weekLabel} Payments: ${totalCount} invoices, ${totalsText}`}>
      <Text className="text-gray-900 text-[22px] font-semibold m-0 mb-[8px]">
        {weekLabel} Payments
      </Text>

      <Text className="text-gray-500 text-[14px] m-0 mb-[20px]">
        {totalCount} invoice{totalCount !== 1 ? "s" : ""} · {totalsText}
      </Text>

      {note && (
        <Section className="bg-blue-50 px-[14px] py-[10px] rounded-[6px] mb-[20px]">
          <Text className="text-blue-800 text-[13px] m-0">{note}</Text>
        </Section>
      )}

      {/* Overdue Section */}
      {overdueItems.length > 0 && (
        <>
          <Text className="text-red-600 text-[13px] font-semibold m-0 mb-[8px]">
            ⚠ OVERDUE ({overdueItems.length})
          </Text>
          <Section className="mb-[16px]">
            {overdueItems.map((item) => (
              <Section key={item.invoice_code} className="py-[6px] border-b border-gray-100">
                <Text className="text-[13px] m-0">
                  <span className="text-gray-900 font-medium">{item.supplier_name}</span>
                  <span className="text-gray-400"> · {item.invoice_code}</span>
                </Text>
                <Text className="text-[13px] m-0 mt-[2px]">
                  <span className="text-red-600 font-semibold">{formatAmount(item.amount_owed, item.currency)}</span>
                  <span className="text-red-500 text-[12px]"> · {Math.abs(item.days_overdue)} days overdue</span>
                </Text>
              </Section>
            ))}
          </Section>
        </>
      )}

      {/* Due This Week */}
      {dueItems.length > 0 && (
        <>
          <Text className="text-gray-700 text-[13px] font-semibold m-0 mb-[8px]">
            📅 DUE THIS WEEK ({dueItems.length})
          </Text>
          <Section className="mb-[16px]">
            {dueItems.map((item) => (
              <Section key={item.invoice_code} className="py-[6px] border-b border-gray-100">
                <Text className="text-[13px] m-0">
                  <span className="text-gray-900 font-medium">{item.supplier_name}</span>
                  <span className="text-gray-400"> · {item.invoice_code}</span>
                </Text>
                <Text className="text-[13px] m-0 mt-[2px]">
                  <span className="text-gray-900 font-semibold">{formatAmount(item.amount_owed, item.currency)}</span>
                  <span className="text-gray-500 text-[12px]"> · due {item.due_date}</span>
                </Text>
              </Section>
            ))}
          </Section>
        </>
      )}

      {/* Expected Incoming */}
      {incomingItems.length > 0 && (
        <>
          <Text className="text-teal-700 text-[13px] font-semibold m-0 mb-[8px]">
            💰 EXPECTED INCOMING ({incomingItems.length})
          </Text>
          <Section className="mb-[16px]">
            {incomingItems.map((item) => (
              <Section key={item.receivable_code} className="py-[6px] border-b border-gray-100">
                <Text className="text-[13px] m-0">
                  <span className="text-gray-900 font-medium">{item.client_name}</span>
                  <span className="text-gray-400"> · {item.receivable_code}</span>
                </Text>
                <Text className="text-[13px] m-0 mt-[2px]">
                  <span className="text-teal-700 font-semibold">{formatAmount(item.amount, item.currency)}</span>
                  <span className="text-gray-500 text-[12px]"> · expected {item.due_date}</span>
                </Text>
              </Section>
            ))}
          </Section>
        </>
      )}

      <Hr className="border-gray-200 my-[20px]" />

      <Text className="text-gray-500 text-[12px] m-0 mb-[16px]">
        📎 Full payment schedule with bank details attached as PDF
      </Text>

      <EmailButton href={dashboardUrl}>View Dashboard</EmailButton>
    </EmailLayout>
  );
}
