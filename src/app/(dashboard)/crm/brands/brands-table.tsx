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
import { useBrands, useDeleteBrand } from "@/lib/react-query/crm";
import { BRAND_TIERS, CRM_PRIORITIES } from "@/types/crm";
import type { CrmBrandWithStats, BrandTier, CrmPriority } from "@/types/crm";
import { useBreakpoint } from "@/hooks/use-media-query";
import { BrandSheet } from "./brand-sheet";
import {
  PlusIcon,
  SearchIcon,
  PencilIcon,
  Trash2Icon,
  TargetIcon,
  ArrowUpDownIcon,
} from "lucide-react";

// ============================================================================
// Props
// ============================================================================

interface BrandsTableProps {
  userRole: string;
}

// ============================================================================
// Constants
// ============================================================================

const ALL_FILTER = "__all__";

// ============================================================================
// Badge helpers (module-scope to avoid nested component definitions)
// ============================================================================

function TierBadge({ tier }: { tier: BrandTier }) {
  switch (tier) {
    case "luxury":
      return <Badge variant="default">Luxury</Badge>;
    case "mid_luxury":
      return <Badge variant="secondary">Mid-Luxury</Badge>;
    case "bridge":
      return <Badge variant="outline">Bridge</Badge>;
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

interface BrandCardProps {
  brand: CrmBrandWithStats;
  canEdit: boolean;
  onEdit: (brand: CrmBrandWithStats) => void;
  onDelete: (brandId: string) => void;
  isDeleting: boolean;
}

function BrandCard({ brand, canEdit, onEdit, onDelete, isDeleting }: BrandCardProps) {
  return (
    <GlassCard hover="subtle" className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/crm/brands/${brand.id}`}
            className="text-sm font-semibold text-primary hover:underline"
          >
            {brand.brand_code}
          </Link>
          <p className="text-sm font-medium mt-0.5 truncate">{brand.name}</p>
          {brand.parent_group && (
            <p className="text-xs text-muted-foreground truncate">
              {brand.parent_group}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <TierBadge tier={brand.tier} />
          <PriorityBadge priority={brand.priority} />
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        {brand.store_count !== null && (
          <span>{brand.store_count} stores</span>
        )}
        {brand.expansion_rate && <span>{brand.expansion_rate}</span>}
        <span>
          {brand.opportunity_count} opp{brand.opportunity_count !== 1 ? "s" : ""}
        </span>
      </div>

      {canEdit && (
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onEdit(brand)}
          >
            <PencilIcon className="size-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs text-destructive hover:text-destructive"
            onClick={() => onDelete(brand.id)}
            disabled={isDeleting}
          >
            <Trash2Icon className="size-3 mr-1" />
            Delete
          </Button>
        </div>
      )}
    </GlassCard>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function BrandsTable({ userRole }: BrandsTableProps) {
  const { data: brands, isLoading } = useBrands();
  const deleteBrand = useDeleteBrand();
  const { isMobile } = useBreakpoint();
  const canEdit = userRole === "admin";

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<CrmBrandWithStats | null>(null);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState(ALL_FILTER);
  const [priorityFilter, setPriorityFilter] = useState(ALL_FILTER);
  const [sorting, setSorting] = useState<SortingState>([]);

  // Filter brands by search + tier + priority
  const filteredBrands = useMemo(() => {
    if (!brands) return [];
    return brands.filter((brand) => {
      const matchesSearch =
        !search ||
        brand.name.toLowerCase().includes(search.toLowerCase()) ||
        brand.brand_code.toLowerCase().includes(search.toLowerCase()) ||
        (brand.parent_group?.toLowerCase().includes(search.toLowerCase()) ?? false);

      const matchesTier = tierFilter === ALL_FILTER || brand.tier === tierFilter;
      const matchesPriority =
        priorityFilter === ALL_FILTER || brand.priority === priorityFilter;

      return matchesSearch && matchesTier && matchesPriority;
    });
  }, [brands, search, tierFilter, priorityFilter]);

  function handleEdit(brand: CrmBrandWithStats): void {
    setEditingBrand(brand);
    setSheetOpen(true);
  }

  function handleNew(): void {
    setEditingBrand(null);
    setSheetOpen(true);
  }

  function handleDelete(brandId: string): void {
    if (window.confirm("Are you sure you want to delete this brand?")) {
      deleteBrand.mutate(brandId);
    }
  }

  function handleSheetChange(open: boolean): void {
    setSheetOpen(open);
    if (!open) setEditingBrand(null);
  }

  // Table columns
  const columns = useMemo<ColumnDef<CrmBrandWithStats>[]>(
    () => [
      {
        accessorKey: "brand_code",
        header: "Code",
        cell: ({ row }) => (
          <Link
            href={`/crm/brands/${row.original.id}`}
            className="font-mono text-sm text-primary hover:underline"
          >
            {row.original.brand_code}
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
        accessorKey: "parent_group",
        header: "Parent Group",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.parent_group ?? "-"}
          </span>
        ),
      },
      {
        accessorKey: "tier",
        header: "Tier",
        cell: ({ row }) => <TierBadge tier={row.original.tier} />,
      },
      {
        accessorKey: "store_count",
        header: "Stores",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.store_count ?? "-"}
          </span>
        ),
      },
      {
        accessorKey: "expansion_rate",
        header: "Expansion",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.expansion_rate ?? "-"}
          </span>
        ),
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
      },
      {
        accessorKey: "opportunity_count",
        header: "Opps",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.opportunity_count}</span>
        ),
      },
      ...(canEdit
        ? [
            {
              id: "actions",
              header: "",
              cell: ({ row }: { row: { original: CrmBrandWithStats } }) => (
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(row.original.id)}
                    disabled={deleteBrand.isPending}
                  >
                    <Trash2Icon className="size-3.5" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              ),
            } satisfies ColumnDef<CrmBrandWithStats>,
          ]
        : []),
    ],
    [canEdit, deleteBrand.isPending]
  );

  const table = useReactTable({
    data: filteredBrands,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const { setContent } = usePageHeader();
  const description = `${filteredBrands.length} brand${filteredBrands.length !== 1 ? "s" : ""}`;
  useEffect(() => {
    setContent({
      icon: <GradientIcon icon={<TargetIcon className="size-4" />} color="amber" size="sm" />,
      title: "Brands",
      description,
      actions: canEdit ? (
        <Button size="sm" onClick={handleNew}>
          <PlusIcon className="size-4 mr-1" />
          New Brand
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
            placeholder="Search brands..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="All Tiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All Tiers</SelectItem>
            {BRAND_TIERS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
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
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Empty State */}
      {!isLoading && filteredBrands.length === 0 && (
        <EmptyState
          icon={<TargetIcon className="size-6" />}
          title="No brands found"
          description={
            search || tierFilter !== ALL_FILTER || priorityFilter !== ALL_FILTER
              ? "Try adjusting your filters."
              : "Get started by adding your first brand."
          }
          action={
            canEdit && !search && tierFilter === ALL_FILTER && priorityFilter === ALL_FILTER ? (
              <Button size="sm" onClick={handleNew}>
                <PlusIcon className="size-4 mr-1" />
                New Brand
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Mobile Card View */}
      {!isLoading && filteredBrands.length > 0 && isMobile && (
        <div className="space-y-3">
          {filteredBrands.map((brand) => (
            <BrandCard
              key={brand.id}
              brand={brand}
              canEdit={canEdit}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isDeleting={deleteBrand.isPending}
            />
          ))}
        </div>
      )}

      {/* Desktop Table View */}
      {!isLoading && filteredBrands.length > 0 && !isMobile && (
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
      <BrandSheet
        open={sheetOpen}
        onOpenChange={handleSheetChange}
        brand={editingBrand}
      />
    </div>
  );
}
