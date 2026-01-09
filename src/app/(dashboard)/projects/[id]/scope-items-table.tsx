"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import {
  MoreHorizontalIcon,
  PencilIcon,
  TrashIcon,
  ClipboardListIcon,
  FactoryIcon,
  ShoppingCartIcon,
  ImageIcon,
} from "lucide-react";

interface ScopeItem {
  id: string;
  item_code: string;
  name: string;
  item_path: "production" | "procurement";
  status: string;
  quantity: number;
  unit: string;
  unit_price: number | null;
  total_price: number | null;
  production_percentage: number;
  images: string[] | null;
}

interface ScopeItemsTableProps {
  projectId: string;
  items: ScopeItem[];
  currency?: string;
}

const currencySymbols: Record<string, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
};

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  in_design: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  awaiting_approval: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  in_production: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  complete: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  on_hold: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  in_design: "In Design",
  awaiting_approval: "Awaiting Approval",
  approved: "Approved",
  in_production: "In Production",
  complete: "Complete",
  on_hold: "On Hold",
  cancelled: "Cancelled",
};

export function ScopeItemsTable({ projectId, items, currency = "TRY" }: ScopeItemsTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/30">
        <div className="rounded-full bg-muted p-4 mb-4">
          <ClipboardListIcon className="size-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-1">No scope items</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          Add scope items to track production and procurement for this project.
        </p>
        <Button asChild>
          <Link href={`/projects/${projectId}/scope/new`}>Add Scope Item</Link>
        </Button>
      </div>
    );
  }

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)}`;
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Path</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Unit Price</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                {item.images && item.images.length > 0 ? (
                  <div className="size-10 rounded overflow-hidden relative bg-muted">
                    <Image
                      src={item.images[0]}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="size-10 rounded bg-muted flex items-center justify-center">
                    <ImageIcon className="size-4 text-muted-foreground" />
                  </div>
                )}
              </TableCell>
              <TableCell className="font-mono text-sm">{item.item_code}</TableCell>
              <TableCell>
                <Link
                  href={`/projects/${projectId}/scope/${item.id}`}
                  className="font-medium hover:underline"
                >
                  {item.name}
                </Link>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  {item.item_path === "production" ? (
                    <FactoryIcon className="size-3.5 text-purple-500" />
                  ) : (
                    <ShoppingCartIcon className="size-3.5 text-blue-500" />
                  )}
                  <span className="text-xs capitalize">{item.item_path}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={statusColors[item.status]}>
                  {statusLabels[item.status] || item.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {item.quantity} {item.unit}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatCurrency(item.unit_price)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatCurrency(item.total_price)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 min-w-[100px]">
                  <Progress value={item.production_percentage} className="h-2" />
                  <span className="text-xs text-muted-foreground w-8">
                    {item.production_percentage}%
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontalIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/projects/${projectId}/scope/${item.id}`}>
                        View Details
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/projects/${projectId}/scope/${item.id}/edit`}>
                        <PencilIcon className="size-4 mr-2" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive">
                      <TrashIcon className="size-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
