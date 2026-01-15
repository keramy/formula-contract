"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchIcon, XIcon, FilterIcon } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { StatusBadge } from "@/components/ui/ui-helpers";

const statusOptions = [
  { value: "all", label: "All Status", variant: "default" as const },
  { value: "tender", label: "Tender", variant: "info" as const },
  { value: "active", label: "Active", variant: "success" as const },
  { value: "on_hold", label: "On Hold", variant: "warning" as const },
  { value: "completed", label: "Completed", variant: "default" as const },
  { value: "cancelled", label: "Cancelled", variant: "danger" as const },
];

export function ProjectsFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const status = searchParams.get("status") || "all";

  const updateFilters = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== "all") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      startTransition(() => {
        router.push(`/projects?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const handleSearch = () => {
    updateFilters({ search });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const clearFilters = () => {
    setSearch("");
    startTransition(() => {
      router.push("/projects");
    });
  };

  const hasFilters = search || status !== "all";
  const activeStatus = statusOptions.find((s) => s.value === status);

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      {/* Search */}
      <div className="flex gap-2 flex-1">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-9 bg-white/50 border-gray-200 focus:bg-white transition-colors"
          />
        </div>
        <Button
          variant="outline"
          onClick={handleSearch}
          disabled={isPending}
          className="border-gray-200 hover:bg-gray-50"
        >
          <SearchIcon className="size-4 mr-2" />
          Search
        </Button>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <FilterIcon className="size-4 text-muted-foreground hidden sm:block" />
        <Select
          value={status}
          onValueChange={(value) => updateFilters({ status: value })}
        >
          <SelectTrigger className="w-[160px] bg-white/50 border-gray-200">
            <SelectValue placeholder="Filter by status">
              {activeStatus && (
                <StatusBadge variant={activeStatus.variant} dot>
                  {activeStatus.label}
                </StatusBadge>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <StatusBadge variant={option.variant} dot>
                  {option.label}
                </StatusBadge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          onClick={clearFilters}
          className="gap-1 text-muted-foreground hover:text-foreground"
        >
          <XIcon className="size-4" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
