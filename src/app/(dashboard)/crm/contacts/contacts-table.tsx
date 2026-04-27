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
import { useContacts, useBrands, useFirms } from "@/lib/react-query/crm";
import { RELATIONSHIP_STATUSES } from "@/types/crm";
import type {
  CrmContactWithRelations,
  RelationshipStatus,
} from "@/types/crm";
import { useBreakpoint } from "@/hooks/use-media-query";
import { ContactSheet } from "./contact-sheet";
import {
  PlusIcon,
  SearchIcon,
  PencilIcon,
  UsersIcon,
  ArrowUpDownIcon,
} from "lucide-react";

// ============================================================================
// Props
// ============================================================================

interface ContactsTableProps {
  userRole: string;
}

// ============================================================================
// Constants
// ============================================================================

const ALL_FILTER = "__all__";

// ============================================================================
// Badge helper (module-scope)
// ============================================================================

function RelationshipBadge({ status }: { status: RelationshipStatus }) {
  switch (status) {
    case "identified":
      return <Badge variant="outline">Identified</Badge>;
    case "reached_out":
      return <Badge variant="info">Reached Out</Badge>;
    case "connected":
      return <Badge variant="warning">Connected</Badge>;
    case "meeting_scheduled":
      return <Badge variant="success">Meeting Scheduled</Badge>;
    case "active_relationship":
      return <Badge variant="default">Active Relationship</Badge>;
  }
}

// ============================================================================
// Mobile card (module-scope)
// ============================================================================

interface ContactCardProps {
  contact: CrmContactWithRelations;
  canEdit: boolean;
  onEdit: (contact: CrmContactWithRelations) => void;
}

function ContactCard({ contact, canEdit, onEdit }: ContactCardProps) {
  const fullName = `${contact.first_name} ${contact.last_name}`;

  return (
    <GlassCard hover="subtle" className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs text-muted-foreground">
            {contact.contact_code}
          </p>
          <p className="text-sm font-semibold mt-0.5 truncate">{fullName}</p>
          {contact.title && (
            <p className="text-xs text-muted-foreground truncate">
              {contact.title}
            </p>
          )}
          {contact.company && (
            <p className="text-xs text-muted-foreground truncate">
              {contact.company}
            </p>
          )}
        </div>
        <RelationshipBadge status={contact.relationship_status} />
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
        {contact.brand && <span>{contact.brand.name}</span>}
        {contact.architecture_firm && (
          <span>{contact.architecture_firm.name}</span>
        )}
        {contact.email && <span>{contact.email}</span>}
      </div>

      {canEdit && (
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onEdit(contact)}
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

export function ContactsTable({ userRole }: ContactsTableProps) {
  const { data: contacts, isLoading } = useContacts();
  const { data: brands } = useBrands();
  const { data: firms } = useFirms();
  const { isMobile } = useBreakpoint();
  const canEdit = userRole === "admin";

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingContact, setEditingContact] =
    useState<CrmContactWithRelations | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL_FILTER);
  const [brandFilter, setBrandFilter] = useState(ALL_FILTER);
  const [firmFilter, setFirmFilter] = useState(ALL_FILTER);
  const [sorting, setSorting] = useState<SortingState>([]);

  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    return contacts.filter((contact) => {
      const fullName =
        `${contact.first_name} ${contact.last_name}`.toLowerCase();
      const matchesSearch =
        !search ||
        fullName.includes(search.toLowerCase()) ||
        contact.contact_code.toLowerCase().includes(search.toLowerCase()) ||
        (contact.company?.toLowerCase().includes(search.toLowerCase()) ??
          false) ||
        (contact.email?.toLowerCase().includes(search.toLowerCase()) ?? false);

      const matchesStatus =
        statusFilter === ALL_FILTER ||
        contact.relationship_status === statusFilter;
      const matchesBrand =
        brandFilter === ALL_FILTER || contact.brand_id === brandFilter;
      const matchesFirm =
        firmFilter === ALL_FILTER ||
        contact.architecture_firm_id === firmFilter;

      return matchesSearch && matchesStatus && matchesBrand && matchesFirm;
    });
  }, [contacts, search, statusFilter, brandFilter, firmFilter]);

  function handleEdit(contact: CrmContactWithRelations): void {
    setEditingContact(contact);
    setSheetOpen(true);
  }

  function handleNew(): void {
    setEditingContact(null);
    setSheetOpen(true);
  }

  function handleSheetChange(open: boolean): void {
    setSheetOpen(open);
    if (!open) setEditingContact(null);
  }

  const columns = useMemo<ColumnDef<CrmContactWithRelations>[]>(
    () => [
      {
        accessorKey: "contact_code",
        header: "Code",
        cell: ({ row }) => (
          <span className="font-mono text-sm text-muted-foreground">
            {row.original.contact_code}
          </span>
        ),
      },
      {
        id: "name",
        header: "Name",
        accessorFn: (row) => `${row.first_name} ${row.last_name}`,
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.first_name} {row.original.last_name}
          </span>
        ),
      },
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.title ?? "-"}
          </span>
        ),
      },
      {
        accessorKey: "company",
        header: "Company",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.company ?? "-"}
          </span>
        ),
      },
      {
        id: "brand",
        header: "Brand",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.brand?.name ?? "-"}
          </span>
        ),
      },
      {
        id: "firm",
        header: "Firm",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.architecture_firm?.name ?? "-"}
          </span>
        ),
      },
      {
        accessorKey: "relationship_status",
        header: "Status",
        cell: ({ row }) => (
          <RelationshipBadge status={row.original.relationship_status} />
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground truncate max-w-[180px] block">
            {row.original.email ?? "-"}
          </span>
        ),
      },
      ...(canEdit
        ? [
            {
              id: "actions",
              header: "",
              cell: ({
                row,
              }: {
                row: { original: CrmContactWithRelations };
              }) => (
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
            } satisfies ColumnDef<CrmContactWithRelations>,
          ]
        : []),
    ],
    [canEdit]
  );

  const table = useReactTable({
    data: filteredContacts,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const hasActiveFilters =
    search ||
    statusFilter !== ALL_FILTER ||
    brandFilter !== ALL_FILTER ||
    firmFilter !== ALL_FILTER;

  const { setContent } = usePageHeader();
  const description = `${filteredContacts.length} contact${filteredContacts.length !== 1 ? "s" : ""}`;
  useEffect(() => {
    setContent({
      icon: <GradientIcon icon={<UsersIcon className="size-4" />} color="violet" size="sm" />,
      title: "Contacts",
      description,
      actions: canEdit ? (
        <Button size="sm" onClick={handleNew}>
          <PlusIcon className="size-4 mr-1" />
          New Contact
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
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All Statuses</SelectItem>
            {RELATIONSHIP_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="All Brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All Brands</SelectItem>
            {brands?.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={firmFilter} onValueChange={setFirmFilter}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="All Firms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All Firms</SelectItem>
            {firms?.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
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
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Empty State */}
      {!isLoading && filteredContacts.length === 0 && (
        <EmptyState
          icon={<UsersIcon className="size-6" />}
          title="No contacts found"
          description={
            hasActiveFilters
              ? "Try adjusting your filters."
              : "Get started by adding your first contact."
          }
          action={
            canEdit && !hasActiveFilters ? (
              <Button size="sm" onClick={handleNew}>
                <PlusIcon className="size-4 mr-1" />
                New Contact
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Mobile Card View */}
      {!isLoading && filteredContacts.length > 0 && isMobile && (
        <div className="space-y-3">
          {filteredContacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              canEdit={canEdit}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {/* Desktop Table View */}
      {!isLoading && filteredContacts.length > 0 && !isMobile && (
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
      <ContactSheet
        open={sheetOpen}
        onOpenChange={handleSheetChange}
        contact={editingContact}
      />
    </div>
  );
}
