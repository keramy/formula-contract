import {
  ArrowUpDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "lucide-react";

interface SortIndicatorProps {
  column: string;
  activeColumn: string;
  direction: "asc" | "desc";
}

export function SortIndicator({ column, activeColumn, direction }: SortIndicatorProps) {
  if (activeColumn !== column) {
    return <ArrowUpDownIcon className="size-3.5 text-muted-foreground/50" />;
  }
  return direction === "asc" ? (
    <ArrowUpIcon className="size-3.5 text-primary" />
  ) : (
    <ArrowDownIcon className="size-3.5 text-primary" />
  );
}
