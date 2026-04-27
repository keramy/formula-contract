"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard, GradientIcon, EmptyState } from "@/components/ui/ui-helpers";
import { usePageHeader } from "@/components/layout/app-header";
import { useFirms } from "@/lib/react-query/crm";
import {
  VENDOR_STATUSES,
  CONNECTION_STRENGTHS,
  CRM_PRIORITIES,
} from "@/types/crm";
import type {
  CrmFirmWithLinks,
  VendorListStatus,
  ConnectionStrength,
  CrmPriority,
} from "@/types/crm";
import { useBreakpoint } from "@/hooks/use-media-query";
import { FirmSheet } from "./firm-sheet";
import {
  PlusIcon,
  SearchIcon,
  PencilIcon,
  BuildingIcon,
  ArrowUpDownIcon,
  LinkIcon,
} from "lucide-react";

// ============================================================================
// Props
// ============================================================================

interface FirmsTableProps {
  userRole: string;
}

// ============================================================================
// Constants
// ============================================================================

const ALL_FILTER = "__all__";

// ============================================================================
// Badge helpers (module-scope)
// ============================================================================

function VendorStatusBadge({ status }: { status: VendorListStatus }) {
  const label = VENDOR_STATUSES.find((s) => s.value === status)?.label ?? status;

  switch (status) {
    case "not_applied":
      return <Badge variant="outline">{label}</Badge>;
    case "applied":
      return <Badge variant="info">{label}</Badge>;
    case "under_review":
      return <Badge variant="warning">{label}</Badge>;
    case "approved":
      return <Badge variant="success">{label}</Badge>;
    case "rejected":
      return <Badge variant="destructive">{label}</Badge>;
  }
}

function ConnectionBadge({ strength }: { strength: ConnectionStrength }) {
  const label =
    CONNECTION_STRENGTHS.find((s) => s.value === strength)?.label ?? strength;

  switch (strength) {
    case "none":
      return <Badge variant="outline">{label}</Badge>;
    case "cold":
      return <Badge variant="info">{label}</Badge>;
    case "warm":
      return <Badge variant="warning">{label}</Badge>;
    case "hot":
      return <Badge variant="destructive">{label}</Badge>;
  }
}

function PriorityBadge({ priority }: { priority: CrmPriority }) {
  switch (priority) {
    case "high":
      return <Badge variant="destructive">High</Badge>;
    case "medium":
      return <Badge variant="secondary">Medium</Badge>;
    case "low":
      return <Badge variant="outline">Low</Badge>;
  }
}

// ============================================================================
// Mobile card (module-scope)
// ============================================================================

interface FirmCardProps {
  firm: CrmFirmWithLinks;
  canEdit: boolean;
  onEdit: (firm: CrmFirmWithLinks) => void;
}

function FirmCard({ firm, canEdit, onEdit }: FirmCardProps) {
  const brandCount = firm.brand_links?.length ?? 0;

  return (
    <GlassCard hover="subtle" className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/crm/firms/${firm.id}`}
            className="text-sm font-semibold text-primary hover:underline"
          >
            {firm.firm_code}
          </Link>
          <p className="text-sm font-medium mt-0.5 truncate">{firm.name}</p>
          {firm.location && (
            <p className="text-xs text-muted-foreground truncate">
              {firm.location}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <VendorStatusBadge status={firm.vendor_list_status} />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3 flex-wrap">
        <ConnectionBadge strength={firm.connection_strength} />
        <PriorityBadge priority={firm.priority} />
        {brandCount > 0 && (
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <LinkIcon className="size-3" />
            {brandCount} brand{brandCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {firm.key_clients && (
        <p className="text-xs text-muted-foreground mt-2 truncate">
          Clients: {firm.key_clients}
        </p>
      )}

      {canEdit && (
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onEdit(firm)}
          >
            <PencilIcon className="size-3 mr-1" />
            Edit
          </Button>
        </div>
      )}
    </GlassCard>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function FirmsTable({ userRole }: FirmsTableProps) {
  const { data: firms, isLoading } = useFirms();
  const { isMobile } = useBreakpoint();
  const canEdit = userRole === "admin";

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingFirm, setEditingFirm] = useState<CrmFirmWithLinks | null>(
    null
  );
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState(ALL_FILTER);
  const [connectionFilter, setConnectionFilter] = useState(ALL_FILTER);
  const [priorityFilter, setPriorityFilter] = useState(ALL_FILTER);
  const [sorting, setSorting] = useState<SortingState>([]);

  const filteredFirms = useMemo(() => {
    if (!firms) return [];
    return firms.filter((firm) => {
      const matchesSearch =
        !search ||
        firm.name.toLowerCase().includes(search.toLowerCase()) ||
        firm.firm_code.toLowerCase().includes(search.toLowerCase()) ||
        (firm.location?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (firm.key_clients?.toLowerCase().includes(search.toLowerCase()) ??
          false);

      const matchesVendor =
        vendorFilter === ALL_FILTER ||
        firm.vendor_list_status === vendorFilter;
      const matchesConnection =
        connectionFilter === ALL_FILTER ||
        firm.connection_strength === connectionFilter;
      const matchesPriority =
        priorityFilter === ALL_FILTER || firm.priority === priorityFilter;

      return matchesSearch && matchesVendor && matchesConnection && matchesPriority;
    });
  }, [firms, search, vendorFilter, connectionFilter, priorityFilter]);

  function handleEdit(firm: CrmFirmWithLinks): void {
    setEditingFirm(firm);
    setSheetOpen(true);
  }

  function handleNew(): void {
    setEditingFirm(null);
    setSheetOpen(true);
  }

  function handleSheetChange(open: boolean): void {
    setSheetOpen(open);
    if (!open) setEditingFirm(null);
  }

  const columns = useMemo<ColumnDef<CrmFirmWithLinks>[]>(
    () => [
      {
        accessorKey: "firm_code",
        header: "Code",
        cell: ({ row }) => (
          <Link
            href={`/crm/firms/${row.original.id}`}
            className="font-mono text-sm text-primary hover:underline"
          >
            {row.original.firm_code}
          </Link>
        ),
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "location",
        header: "Location",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.location ?? "-"}
          </span>
        ),
      },
      {
        accessorKey: "vendor_list_status",
        header: "Vendor Status",
        cell: ({ row }) => (
          <VendorStatusBadge status={row.original.vendor_list_status} />
        ),
      },
      {
        accessorKey: "connection_strength",
        header: "Connection",
        cell: ({ row }) => (
          <ConnectionBadge strength={row.original.connection_strength} />
        ),
      },
      {
        accessorKey: "key_clients",
        header: "Key Clients",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm max-w-[200px] truncate block">
            {row.original.key_clients ?? "-"}
          </span>
        ),
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
      },
      {
        id: "brand_links",
        header: "Brands",
        cell: ({ row }) => {
          const count = row.original.brand_links?.length ?? 0;
          return (
            <span className="tabular-nums text-muted-foreground">
              {count}
            </span>
          );
        },
      },
      ...(canEdit
        ? [
            {
              id: "actions",
              header: "",
              cell: ({ row }: { row: { original: CrmFirmWithLinks } }) => (
                <div className="flex items-center gap-1 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleEdit(row.original)}
                  >
                    <PencilIcon className="size-3.5" />
                    <span className="sr-only">Edit</span>
                  </Button>
                </div>
              ),
            } satisfies ColumnDef<CrmFirmWithLinks>,
          ]
        : []),
    ],
    [canEdit]
  );

  const table = useReactTable({
    data: filteredFirms,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const { setContent } = usePageHeader();
  const description = `${filteredFirms.length} firm${filteredFirms.length !== 1 ? "s" : ""}`;
  useEffect(() => {
    setContent({
      icon: <GradientIcon icon={<BuildingIcon className="size-4" />} color="blue" size="sm" />,
      title: "Architecture Firms",
      description,
      actions: canEdit ? (
        <Button size="sm" onClick={handleNew}>
          <PlusIcon className="size-4 mr-1" />
          New Firm
        </Button>
      ) : undefined,
    });
    return () => setContent({});
  }, [description, setContent, canEdit]);

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search firms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={vendorFilter} onValueChange={setVendorFilter}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All Statuses</SelectItem>
            {VENDOR_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={connectionFilter} onValueChange={setConnectionFilter}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="All Connections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All Connections</SelectItem>
            {CONNECTION_STRENGTHS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All Priorities</SelectItem>
            {CRM_PRIORITIES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {isLoading && (
        <GlassCard className="overflow-hidden">
          <div className="border-b border-base-200 px-4 py-3">
            <div className="flex gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={`skel-${i}`} className="h-4 w-16" />
              ))}
            </div>
          </div>
          <div className="divide-y divide-base-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`skel-${i}`} className="flex items-center gap-6 px-4 py-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-4 w-10" />
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Empty State */}
      {!isLoading && filteredFirms.length === 0 && (
        <EmptyState
          icon={<BuildingIcon className="size-6" />}
          title="No firms found"
          description={
            search ||
            vendorFilter !== ALL_FILTER ||
            connectionFilter !== ALL_FILTER ||
            priorityFilter !== ALL_FILTER
              ? "Try adjusting your filters."
              : "Get started by adding your first architecture firm."
          }
          action={
            canEdit &&
            !search &&
            vendorFilter === ALL_FILTER &&
            connectionFilter === ALL_FILTER &&
            priorityFilter === ALL_FILTER ? (
              <Button size="sm" onClick={handleNew}>
                <PlusIcon className="size-4 mr-1" />
                New Firm
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Mobile Card View */}
      {!isLoading && filteredFirms.length > 0 && isMobile && (
        <div className="space-y-3">
          {filteredFirms.map((firm) => (
            <FirmCard
              key={firm.id}
              firm={firm}
              canEdit={canEdit}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {/* Desktop Table View */}
      {!isLoading && filteredFirms.length > 0 && !isMobile && (
        <GlassCard>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button
                          type="button"
                          className="flex items-center gap-1 hover:text-foreground"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          <ArrowUpDownIcon className="size-3" />
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </GlassCard>
      )}

      {/* Sheet */}
      <FirmSheet
        open={sheetOpen}
        onOpenChange={handleSheetChange}
        firm={editingFirm}
      />
    </div>
  );
}
