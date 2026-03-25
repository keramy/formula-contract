"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GlassCard, GradientIcon } from "@/components/ui/ui-helpers";
import { usePageHeader } from "@/components/layout/app-header";
import {
  TruckIcon,
  PlusIcon,
  SearchIcon,
  PencilIcon,
  TrashIcon,
  PhoneIcon,
  MailIcon,
} from "lucide-react";
import { useBreakpoint } from "@/hooks/use-media-query";
import { useSuppliers, useDeleteSupplier } from "@/lib/react-query/finance";
import { SUPPLIER_CATEGORIES } from "@/types/finance";
import type { FinanceSupplierWithStats } from "@/types/finance";
import { SupplierSheet } from "./supplier-sheet";

export function SuppliersTable() {
  const { data: suppliers, isLoading } = useSuppliers();
  const deleteSupplier = useDeleteSupplier();
  const { isMobile } = useBreakpoint();

  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<FinanceSupplierWithStats | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinanceSupplierWithStats | null>(null);

  const { setContent } = usePageHeader();
  useEffect(() => {
    setContent({
      icon: <GradientIcon icon={<TruckIcon className="size-4" />} color="amber" size="sm" />,
      title: "Suppliers",
      description: "Vendor registry",
      actions: (
        <Button size="sm" onClick={() => { setEditingSupplier(null); setSheetOpen(true); }}>
          <PlusIcon className="size-4 mr-1" />
          New Supplier
        </Button>
      ),
    });
    return () => setContent({});
  }, [setContent]);

  const filtered = useMemo(() => {
    if (!suppliers) return [];
    if (!search) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.supplier_code.toLowerCase().includes(q) ||
        s.contact_person?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  const getCategoryLabel = (cat: string | null) =>
    SUPPLIER_CATEGORIES.find((c) => c.value === cat)?.label || cat || "—";

  const handleEdit = (supplier: FinanceSupplierWithStats) => {
    setEditingSupplier(supplier);
    setSheetOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteSupplier.mutate(id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex gap-3">
          <Skeleton className="h-9 flex-1" />
        </div>
        <GlassCard className="overflow-hidden">
          <div className="divide-y divide-base-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 p-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Mobile Cards */}
      {isMobile ? (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No suppliers found.</p>
          ) : (
            filtered.map((supplier) => (
              <GlassCard key={supplier.id} hover="subtle" className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">{supplier.name}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {supplier.supplier_code}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {getCategoryLabel(supplier.category)}
                    </p>
                  </div>
                  {supplier.invoice_count > 0 && (
                    <Badge variant="secondary" className="shrink-0">
                      {supplier.invoice_count} inv.
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  {supplier.contact_person && <span>{supplier.contact_person}</span>}
                  {supplier.phone && (
                    <span className="flex items-center gap-1">
                      <PhoneIcon className="size-3" />
                      {supplier.phone}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleEdit(supplier)}>
                    <PencilIcon className="size-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(supplier)}
                  >
                    <TrashIcon className="size-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      ) : (
        /* Desktop Table */
        <GlassCard className="py-0 overflow-hidden">
          <div className="overflow-x-auto">
          <Table
            style={{ tableLayout: "fixed", minWidth: 750 }}
            className="[&_th]:border-r [&_th]:border-base-200 [&_th:last-child]:border-r-0 [&_td]:border-r [&_td]:border-base-200 [&_td:last-child]:border-r-0 [&_td]:align-middle"
          >
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-base-50/60 border-b-2 border-base-200">
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground" style={{ width: 80 }}>Code</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground" style={{ width: 200 }}>Name</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground" style={{ width: 120 }}>Category</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground" style={{ width: 130 }}>Contact</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground" style={{ width: 110 }}>Phone</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground" style={{ width: 150 }}>Email</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground text-center" style={{ width: 70 }}>Invoices</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground" style={{ width: 60 }} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No suppliers found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((supplier, idx) => (
                  <TableRow
                    key={supplier.id}
                    className={cn(
                      "cursor-pointer hover:bg-primary/[0.04] border-b border-base-200 transition-colors",
                      idx % 2 === 1 ? "bg-base-50/50" : "bg-white"
                    )}
                    onClick={() => handleEdit(supplier)}
                  >
                    <TableCell className="font-mono text-xs">{supplier.supplier_code}</TableCell>
                    <TableCell className="font-medium text-sm">{supplier.name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {getCategoryLabel(supplier.category)}
                    </TableCell>
                    <TableCell className="text-sm">{supplier.contact_person || "—"}</TableCell>
                    <TableCell className="text-sm">{supplier.phone || "—"}</TableCell>
                    <TableCell className="text-sm truncate">{supplier.email || "—"}</TableCell>
                    <TableCell className="text-center">
                      {supplier.invoice_count > 0 ? (
                        <Badge variant="secondary">{supplier.invoice_count}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(supplier)}>
                          <PencilIcon className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(supplier)}
                        >
                          <TrashIcon className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </GlassCard>
      )}

      {/* Supplier Sheet */}
      <SupplierSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        supplier={editingSupplier}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
              This will soft-delete the supplier record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
