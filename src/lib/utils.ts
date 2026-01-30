import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateAvatarFallback(name: string) {
  const names = name.split(" ").filter((n) => n);
  const mapped = names.map((n) => n.charAt(0).toUpperCase());
  return mapped.slice(0, 2).join("");
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  });
}

const currencySymbols: Record<string, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
};

export function formatCurrency(amount: number | null, currency: "TRY" | "USD" | "EUR" = "TRY"): string {
  if (amount === null || amount === undefined) return "-";
  const symbol = currencySymbols[currency] || currency;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${symbol}${formatted}`;
}

export function getNextRevision(current: string | null): string {
  if (!current) return "A";
  const code = current.charCodeAt(0);
  return String.fromCharCode(code + 1);
}

export function calculateProgress(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}
