"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  SearchIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ExternalLinkIcon,
  BuildingIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ExportButton } from "@/components/ui/export-button";
import { type ColumnDefinition, formatters } from "@/lib/export/export-utils";

interface ProjectCostRow {
  id: string;
  slug: string | null;
  name: string;
  project_code: string;
  status: string;
  client_name: string | null;
  budget: number;
  actual: number;
  variance: number;
  variancePercentage: number;
  currency: string;
  itemCount: number;
}

interface ProjectCostsTableProps {
  data: ProjectCostRow[];
}

// Currency formatting helper
const currencySymbols: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };

function formatCurrency(value: number, currency: string): string {
  const symbol = currencySymbols[currency] || currency;
  return `${symbol}${value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

// Status badge styling
const statusConfig: Record<string, { variant: "info" | "success" | "warning" | "default" | "danger"; label: string }> = {
  tender: { variant: "warning", label: "Tender" },
  active: { variant: "success", label: "Active" },
  on_hold: { variant: "default", label: "On Hold" },
  completed: { variant: "info", label: "Completed" },
  cancelled: { variant: "danger", label: "Cancelled" },
  not_awarded: { variant: "danger", label: "Not Awarded" },
};

type SortKey = "name" | "budget" | "actual" | "variance" | "variancePercentage";
type SortDir = "asc" | "desc";

// Status options for filter chips
const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "tender", label: "Tender" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "not_awarded", label: "Not Awarded" },
];

export function ProjectCostsTable({ data }: ProjectCostsTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("budget");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");

  // Extract unique client names for dropdown
  const clientOptions = useMemo(() => {
    const clients = data
      .map((row) => row.client_name)
      .filter((name): name is string => name !== null && name !== "")
      .filter((name, index, self) => self.indexOf(name) === index) // unique
      .sort((a, b) => a.localeCompare(b));
    return clients;
  }, [data]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = data;

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((row) => row.status === statusFilter);
    }

    // Apply client filter
    if (clientFilter !== "all") {
      filtered = filtered.filter((row) => row.client_name === clientFilter);
    }

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (row) =>
          row.name.toLowerCase().includes(searchLower) ||
          row.project_code.toLowerCase().includes(searchLower) ||
          (row.client_name && row.client_name.toLowerCase().includes(searchLower))
      );
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let aVal: string | number = a[sortKey];
      let bVal: string | number = b[sortKey];

      if (sortKey === "name") {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      }

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [data, search, sortKey, sortDir, statusFilter, clientFilter]);

  // Handle sort toggle
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  // Sort indicator
  const SortIndicator = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) {
      return <ArrowUpDownIcon className="size-3.5 text-muted-foreground/50" />;
    }
    return sortDir === "asc" ? (
      <ArrowUpIcon className="size-3.5 text-primary" />
    ) : (
      <ArrowDownIcon className="size-3.5 text-primary" />
    );
  };

  return (
    <Card className="border border-base-200">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          {/* Top row: Title and filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold">Project Costs</CardTitle>
              <p className="text-sm text-muted-foreground">
                Financial overview by project ({filteredData.length} of {data.length})
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Client filter dropdown */}
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-[180px]" size="sm">
                  <BuildingIcon className="size-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clientOptions.map((client) => (
                    <SelectItem key={client} value={client}>
                      {client}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Search input */}
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-48 sm:w-64"
                />
              </div>

              {/* Export Button */}
              <ExportButton
                data={filteredData as unknown as Record<string, unknown>[]}
                columns={[
                  { key: "project_code", header: "Project Code" },
                  { key: "name", header: "Project Name" },
                  { key: "client_name", header: "Client" },
                  { key: "status", header: "Status", format: formatters.status },
                  { key: "budget", header: "Budget" },
                  { key: "actual", header: "Actual" },
                  { key: "variance", header: "Variance" },
                  { key: "variancePercentage", header: "Variance %", format: formatters.percentage },
                  { key: "itemCount", header: "Items" },
                  { key: "currency", header: "Currency" },
                ]}
                filename="project-costs"
                sheetName="Project Costs"
              />
            </div>
          </div>

          {/* Status filter chips */}
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={statusFilter === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(option.value)}
                className={cn(
                  "h-7 text-xs",
                  statusFilter === option.value && "shadow-sm"
                )}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[280px] pl-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("name")}
                    className="-ml-3 h-8 font-medium"
                  >
                    Project
                    <SortIndicator column="name" />
                  </Button>
                </TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("budget")}
                    className="-mr-3 h-8 font-medium"
                  >
                    Budget
                    <SortIndicator column="budget" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("actual")}
                    className="-mr-3 h-8 font-medium"
                  >
                    Actual
                    <SortIndicator column="actual" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("variance")}
                    className="-mr-3 h-8 font-medium"
                  >
                    Variance
                    <SortIndicator column="variance" />
                  </Button>
                </TableHead>
                <TableHead className="w-[60px] pr-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length > 0 ? (
                filteredData.map((row) => {
                  const status = statusConfig[row.status] || {
                    variant: "default" as const,
                    label: row.status,
                  };
                  const isPositiveVariance = row.variance >= 0;

                  return (
                    <TableRow key={row.id} className="group">
                      <TableCell className="pl-6">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{row.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {row.project_code}
                            {row.client_name && ` • ${row.client_name}`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            status.variant === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                            status.variant === "warning" && "border-amber-200 bg-amber-50 text-amber-700",
                            status.variant === "info" && "border-blue-200 bg-blue-50 text-blue-700",
                            status.variant === "danger" && "border-rose-200 bg-rose-50 text-rose-700",
                            status.variant === "default" && "border-gray-200 bg-gray-50 text-gray-700"
                          )}
                        >
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(row.budget, row.currency)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(row.actual, row.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span
                            className={cn(
                              "font-mono text-sm font-medium",
                              isPositiveVariance ? "text-emerald-600" : "text-rose-600"
                            )}
                          >
                            {isPositiveVariance ? "+" : ""}
                            {formatCurrency(row.variance, row.currency)}
                          </span>
                          <span
                            className={cn(
                              "text-xs",
                              isPositiveVariance ? "text-emerald-600/70" : "text-rose-600/70"
                            )}
                          >
                            {isPositiveVariance ? "+" : ""}
                            {row.variancePercentage}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="pr-6">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Link href={`/projects/${row.slug || row.id}`}>
                            <ExternalLinkIcon className="size-4" />
                            <span className="sr-only">View project</span>
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <p className="text-muted-foreground">
                      {search ? "No projects match your search" : "No projects found"}
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
