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
import { SearchIcon, XIcon, CalendarIcon, Building2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectsTable } from "./projects-table";
import { ProjectCard } from "@/components/projects/project-card";
import { ResponsiveDataView, ViewToggle } from "@/components/ui/responsive-data-view";
import type { DateRange } from "react-day-picker";

interface Project {
  id: string;
  project_code: string;
  name: string;
  status: string;
  installation_date: string | null;
  created_at: string;
  client: { id: string; company_name: string } | null;
  progress?: number;
  totalItems?: number;
  completedItems?: number;
}

interface Client {
  id: string;
  company_name: string;
}

interface ProjectsListClientProps {
  projects: Project[];
  clients?: Client[];
}

// Status options with colors matching the design system
const statusOptions = [
  { value: "all", label: "All", color: "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200" },
  { value: "tender", label: "Tender", color: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200" },
  { value: "active", label: "Active", color: "bg-green-50 text-green-700 hover:bg-green-100 border-green-200" },
  { value: "on_hold", label: "On Hold", color: "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200" },
  { value: "completed", label: "Completed", color: "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-50 text-red-700 hover:bg-red-100 border-red-200" },
];

// Active state styles for chips
const activeStatusStyles: Record<string, string> = {
  all: "bg-gray-800 text-white hover:bg-gray-700 border-gray-800",
  tender: "bg-blue-600 text-white hover:bg-blue-500 border-blue-600",
  active: "bg-green-600 text-white hover:bg-green-500 border-green-600",
  on_hold: "bg-amber-500 text-white hover:bg-amber-400 border-amber-500",
  completed: "bg-slate-600 text-white hover:bg-slate-500 border-slate-600",
  cancelled: "bg-red-600 text-white hover:bg-red-500 border-red-600",
};

export function ProjectsListClient({ projects, clients = [] }: ProjectsListClientProps) {
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

  // View toggle state for manual override
  const [viewOverride, setViewOverride] = useState<"table" | "cards" | undefined>(undefined);

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

  // Filter projects client-side (instant!)
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

    return result;
  }, [projects, status, clientId, dateRange, search]);

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

  return (
    <>
      {/* Search Bar */}
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
        </div>

        {/* Status Filter Chips */}
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((option) => {
            const isActive = status === option.value;
            return (
              <button
                key={option.value}
                onClick={() => handleStatusChange(option.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200",
                  isActive ? activeStatusStyles[option.value] : option.color
                )}
              >
                {option.label}
                {option.value !== "all" && (
                  <span className="ml-1.5 opacity-70">
                    ({projects.filter((p) => p.status === option.value).length})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results count and view toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-muted-foreground">
          Showing {filteredProjects.length} of {projects.length} projects
          {hasFilters && " (filtered)"}
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
        tableView={<ProjectsTable projects={filteredProjects} />}
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
    </>
  );
}
