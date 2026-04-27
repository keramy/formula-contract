"use client";

import { useState, useEffect } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  RepeatIcon,
  PlusIcon,
  PlayIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react";
import { useBreakpoint } from "@/hooks/use-media-query";
import {
  useRecurringTemplates,
  useUpdateRecurringTemplate,
  useDeleteRecurringTemplate,
  useProcessRecurringTemplates,
} from "@/lib/react-query/finance";
import { RECURRING_FREQUENCIES } from "@/types/finance";
import type { FinanceRecurringWithSupplier } from "@/types/finance";
import { formatCurrency, cn } from "@/lib/utils";
import { RecurringSheet } from "./recurring-sheet";

export function RecurringTable() {
  const { data: templates, isLoading } = useRecurringTemplates();
  const updateTemplate = useUpdateRecurringTemplate();
  const deleteTemplate = useDeleteRecurringTemplate();
  const processTemplates = useProcessRecurringTemplates();
  const { isMobile } = useBreakpoint();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FinanceRecurringWithSupplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinanceRecurringWithSupplier | null>(null);

  const { setContent } = usePageHeader();
  useEffect(() => {
    setContent({
      icon: <GradientIcon icon={<RepeatIcon className="size-4" />} color="amber" size="sm" />,
      title: "Recurring",
      description: "Recurring payment templates",
      actions: (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => processTemplates.mutate()}
            disabled={processTemplates.isPending}
          >
            <PlayIcon className="size-4 mr-1" />
            {processTemplates.isPending ? "Processing..." : "Process Now"}
          </Button>
          <Button size="sm" onClick={() => { setEditingTemplate(null); setSheetOpen(true); }}>
            <PlusIcon className="size-4 mr-1" />
            New Template
          </Button>
        </div>
      ),
    });
    return () => setContent({});
  }, [setContent, processTemplates.isPending]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  };

  const getFreqLabel = (freq: string) =>
    RECURRING_FREQUENCIES.find((f) => f.value === freq)?.label || freq;

  const handleToggleActive = (template: FinanceRecurringWithSupplier) => {
    updateTemplate.mutate({
      id: template.id,
      supplier_id: template.supplier_id,
      description: template.description,
      amount: template.amount,
      currency: template.currency,
      frequency: template.frequency,
      day_of_month: template.day_of_month,
      next_due_date: template.next_due_date,
      requires_approval: template.requires_approval,
      is_active: !template.is_active,
    });
  };

  const handleEdit = (template: FinanceRecurringWithSupplier) => {
    setEditingTemplate(template);
    setSheetOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteTemplate.mutate(id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-5">
        <GlassCard className="overflow-hidden">
          <div className="divide-y divide-base-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`skel-${i}`} className="flex gap-4 p-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {isMobile ? (
        <div className="space-y-3">
          {!templates || templates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No recurring templates. Create one to auto-generate invoices.
            </p>
          ) : (
            templates.map((t) => {
              const supplier = t.supplier as { name: string; supplier_code: string } | null;
              return (
                <GlassCard key={t.id} hover="subtle" className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">
                          {t.template_code}
                        </span>
                        <Badge variant={t.is_active ? "default" : "secondary"} className="text-xs">
                          {t.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {supplier?.name} — {t.description}
                      </p>
                    </div>
                    <Switch
                      checked={t.is_active}
                      onCheckedChange={() => handleToggleActive(t)}
                    />
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground tabular-nums">
                      {formatCurrency(t.amount, t.currency)}
                    </span>
                    <span>{getFreqLabel(t.frequency)}</span>
                    <span>Day {t.day_of_month}</span>
                    <span>Next: {formatDate(t.next_due_date)}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleEdit(t)}>
                      <PencilIcon className="size-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(t)}
                    >
                      <TrashIcon className="size-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </GlassCard>
              );
            })
          )}
        </div>
      ) : (
        <GlassCard className="py-0 overflow-hidden">
          <div className="overflow-x-auto">
          <Table
            style={{ tableLayout: "fixed", minWidth: 780 }}
            className="[&_th]:border-r [&_th]:border-base-200 [&_th:last-child]:border-r-0 [&_td]:border-r [&_td]:border-base-200 [&_td:last-child]:border-r-0 [&_td]:align-middle"
          >
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-base-50/60 border-b-2 border-base-200">
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground" style={{ width: 80 }}>Code</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground" style={{ width: 180 }}>Supplier</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground" style={{ width: 200 }}>Description</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground text-right" style={{ width: 110 }}>Amount</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground" style={{ width: 90 }}>Frequency</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground text-center" style={{ width: 50 }}>Day</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground" style={{ width: 100 }}>Next Due</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground text-center" style={{ width: 70 }}>Active</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground" style={{ width: 60 }} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {!templates || templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No recurring templates. Create one to auto-generate invoices.
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((t, idx) => {
                  const supplier = t.supplier as { name: string; supplier_code: string } | null;
                  return (
                    <TableRow
                      key={t.id}
                      className={cn(
                        "hover:bg-primary/[0.04] border-b border-base-200 transition-colors",
                        idx % 2 === 1 ? "bg-base-50/50" : "bg-white"
                      )}
                    >
                      <TableCell className="font-mono text-xs">{t.template_code}</TableCell>
                      <TableCell className="font-medium text-sm">{supplier?.name || "—"}</TableCell>
                      <TableCell className="text-sm truncate">{t.description}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-sm">
                        {formatCurrency(t.amount, t.currency)}
                      </TableCell>
                      <TableCell className="text-xs">{getFreqLabel(t.frequency)}</TableCell>
                      <TableCell className="text-sm text-center">{t.day_of_month}</TableCell>
                      <TableCell className="text-xs">{formatDate(t.next_due_date)}</TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={t.is_active}
                          onCheckedChange={() => handleToggleActive(t)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(t)}>
                            <PencilIcon className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget(t)}
                          >
                            <TrashIcon className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          </div>
        </GlassCard>
      )}

      <RecurringSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        template={editingTemplate}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? It will no longer auto-create invoices.
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
