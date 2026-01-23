"use client";

import { useMemo, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { SearchIcon, XIcon, CalendarIcon, Building2Icon, PlusIcon, FilterIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ProjectsTable, type SortField, type SortDirection } from "./projects-table";
import { ProjectEditSheet } from "./project-edit-sheet";
import { ProjectCard } from "@/components/projects/project-card";
import { ResponsiveDataView, ViewToggle } from "@/components/ui/responsive-data-view";
import type { DateRange } from "react-day-picker";

interface Project {
  id: string;
  slug: string | null;
  project_code: string;
  name: string;
  status: string;
  installation_date: string | null;
  created_at: string;
  client: { id: string; company_name: string } | null;
  progress?: number;
  totalItems?: number;
  completedItems?: number;
  hasAttention?: boolean;
  attentionCount?: number;
}

interface Client {
  id: string;
  company_name: string;
}

interface ProjectsListClientProps {
  projects: Project[];
  clients?: Client[];
  canCreateProject?: boolean;
}

// Status options for dropdown
const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "tender", label: "Tender" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function ProjectsListClient({ projects, clients = [], canCreateProject = false }: ProjectsListClientProps) {
  const searchParams = useSearchParams();

  // Initialize state from URL params (for bookmarking support)
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "all");
  const [clientId, setClientId] = useState(searchParams.get("client") || "all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from) {
      return {
        from: new Date(from),
        to: to ? new Date(to) : undefined,
      };
    }
    return undefined;
  });

  // Sorting state
  const [sortField, setSortField] = useState<SortField | undefined>(undefined);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // View toggle state for manual override
  const [viewOverride, setViewOverride] = useState<"table" | "cards" | undefined>(undefined);

  // Edit sheet state
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);

  const handleEditProject = useCallback((projectId: string) => {
    setEditProjectId(projectId);
    setEditSheetOpen(true);
  }, []);

  // Extract unique clients from projects if not provided
  const uniqueClients = useMemo(() => {
    if (clients.length > 0) return clients;
    const clientMap = new Map<string, Client>();
    projects.forEach((p) => {
      if (p.client) {
        clientMap.set(p.client.id, p.client);
      }
    });
    return Array.from(clientMap.values()).sort((a, b) =>
      a.company_name.localeCompare(b.company_name)
    );
  }, [projects, clients]);

  // Filter and sort projects client-side (instant!)
  const filteredProjects = useMemo(() => {
    let result = projects;

    // Filter by status
    if (status && status !== "all") {
      result = result.filter((p) => p.status === status);
    }

    // Filter by client
    if (clientId && clientId !== "all") {
      result = result.filter((p) => p.client?.id === clientId);
    }

    // Filter by date range (created_at)
    if (dateRange?.from) {
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      result = result.filter((p) => {
        const projectDate = new Date(p.created_at);
        return projectDate >= fromDate;
      });
    }
    if (dateRange?.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter((p) => {
        const projectDate = new Date(p.created_at);
        return projectDate <= toDate;
      });
    }

    // Filter by search (name or code)
    if (search.trim()) {
      const searchLower = search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.project_code.toLowerCase().includes(searchLower)
      );
    }

    // Sort results
    if (sortField) {
      result = [...result].sort((a, b) => {
        let aVal: string | number | null = null;
        let bVal: string | number | null = null;

        switch (sortField) {
          case "project_code":
            aVal = a.project_code.toLowerCase();
            bVal = b.project_code.toLowerCase();
            break;
          case "name":
            aVal = a.name.toLowerCase();
            bVal = b.name.toLowerCase();
            break;
          case "client":
            aVal = a.client?.company_name.toLowerCase() || "";
            bVal = b.client?.company_name.toLowerCase() || "";
            break;
          case "status":
            aVal = a.status;
            bVal = b.status;
            break;
          case "progress":
            aVal = a.progress || 0;
            bVal = b.progress || 0;
            break;
          case "installation_date":
            aVal = a.installation_date ? new Date(a.installation_date).getTime() : 0;
            bVal = b.installation_date ? new Date(b.installation_date).getTime() : 0;
            break;
        }

        if (aVal === null || bVal === null) return 0;

        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortDirection === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        }

        return 0;
      });
    }

    return result;
  }, [projects, status, clientId, dateRange, search, sortField, sortDirection]);

  // Handle sort
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      // Toggle direction or clear
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField(undefined);
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }, [sortField, sortDirection]);

  // Update URL for bookmarking (debounced, non-blocking)
  const syncToUrl = useCallback(
    (
      newStatus: string,
      newSearch: string,
      newClientId: string,
      newDateRange: DateRange | undefined
    ) => {
      const params = new URLSearchParams();
      if (newStatus && newStatus !== "all") {
        params.set("status", newStatus);
      }
      if (newSearch.trim()) {
        params.set("search", newSearch.trim());
      }
      if (newClientId && newClientId !== "all") {
        params.set("client", newClientId);
      }
      if (newDateRange?.from) {
        params.set("from", format(newDateRange.from, "yyyy-MM-dd"));
      }
      if (newDateRange?.to) {
        params.set("to", format(newDateRange.to, "yyyy-MM-dd"));
      }
      const queryString = params.toString();
      const newUrl = queryString ? `/projects?${queryString}` : "/projects";

      // Use replaceState to update URL without navigation
      window.history.replaceState(null, "", newUrl);
    },
    []
  );

  const handleStatusChange = (value: string) => {
    setStatus(value);
    syncToUrl(value, search, clientId, dateRange);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    syncToUrl(status, value, clientId, dateRange);
  };

  const handleClientChange = (value: string) => {
    setClientId(value);
    syncToUrl(status, search, value, dateRange);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    syncToUrl(status, search, clientId, range);
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setClientId("all");
    setDateRange(undefined);
    setSortField(undefined);
    setSortDirection("asc");
    window.history.replaceState(null, "", "/projects");
  };

  const hasFilters = search || status !== "all" || clientId !== "all" || dateRange?.from;

  // Count active filters
  const activeFilterCount = [
    status !== "all",
    clientId !== "all",
    dateRange?.from,
    search.trim(),
  ].filter(Boolean).length;

  // Count projects by status for display
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return counts;
  }, [projects]);

  return (
    <>
      {/* Filters Row */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or code..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 bg-white/50 border-gray-200 focus:bg-white transition-colors"
            />
          </div>

          {/* Status Filter Dropdown */}
          <div className="flex items-center gap-2">
            <FilterIcon className="size-4 text-muted-foreground hidden sm:block" />
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full sm:w-[160px] bg-white/50 border-gray-200">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                    {option.value !== "all" && statusCounts[option.value] > 0 && (
                      <span className="ml-2 text-muted-foreground">
                        ({statusCounts[option.value]})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client Filter */}
          <div className="flex items-center gap-2">
            <Building2Icon className="size-4 text-muted-foreground hidden sm:block" />
            <Select value={clientId} onValueChange={handleClientChange}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white/50 border-gray-200">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {uniqueClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full sm:w-[240px] justify-start text-left font-normal bg-white/50 border-gray-200",
                  !dateRange?.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "MMM d, yyyy")} -{" "}
                      {format(dateRange.to, "MMM d, yyyy")}
                    </>
                  ) : (
                    format(dateRange.from, "MMM d, yyyy")
                  )
                ) : (
                  "Filter by date..."
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={handleDateRangeChange}
                numberOfMonths={2}
              />
              {dateRange?.from && (
                <div className="p-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => handleDateRangeChange(undefined)}
                  >
                    Clear dates
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Clear All Filters */}
          {hasFilters && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-4" />
              Clear{activeFilterCount > 1 ? ` (${activeFilterCount})` : ""}
            </Button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* New Project Button */}
          {canCreateProject && (
            <Button asChild size="sm" className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
              <Link href="/projects/new">
                <PlusIcon className="size-4" />
                New Project
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Results count and view toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-muted-foreground">
          Showing {filteredProjects.length} of {projects.length} projects
          {hasFilters && " (filtered)"}
          {sortField && (
            <span className="ml-2">
              • Sorted by {sortField.replace("_", " ")} ({sortDirection})
            </span>
          )}
        </div>
        {/* Manual view toggle for users who prefer a specific view */}
        <div className="hidden sm:block">
          <ViewToggle
            view={viewOverride || "table"}
            onViewChange={setViewOverride}
          />
        </div>
      </div>

      {/* Responsive Projects View - Table on desktop, Cards on mobile */}
      <ResponsiveDataView
        data={filteredProjects}
        tableView={
          <ProjectsTable
            projects={filteredProjects}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            onEdit={handleEditProject}
          />
        }
        renderCard={(project) => (
          <ProjectCard key={project.id} project={project} />
        )}
        forceView={viewOverride}
        emptyState={
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 rounded-full bg-gray-100 mb-4">
              <SearchIcon className="size-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No projects found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {hasFilters
                ? "Try adjusting your filters or search term."
                : "No projects have been created yet."}
            </p>
          </div>
        }
      />

      {/* Edit Project Sheet */}
      {editProjectId && (
        <ProjectEditSheet
          projectId={editProjectId}
          open={editSheetOpen}
          onOpenChange={setEditSheetOpen}
        />
      )}
    </>
  );
}
