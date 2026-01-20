"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  FolderIcon,
  Building2Icon,
  UserIcon,
  FileTextIcon,
  PlusIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  ClipboardListIcon,
  UsersIcon,
} from "lucide-react";
import { globalSearch, getRecentItems, type SearchResult } from "@/lib/actions/search";
import { useDebounce } from "@/hooks/use-debounce";

interface CommandMenuProps {
  userRole?: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  folder: FolderIcon,
  building: Building2Icon,
  user: UserIcon,
  "file-text": FileTextIcon,
};

// Quick actions available to users
const quickActions = [
  {
    title: "New Project",
    href: "/projects/new",
    icon: PlusIcon,
    shortcut: "N",
    roles: ["admin", "pm"],
  },
  {
    title: "New Client",
    href: "/clients/new",
    icon: Building2Icon,
    shortcut: "C",
    roles: ["admin", "pm"],
  },
  {
    title: "New Report",
    href: "/reports/new",
    icon: FileTextIcon,
    shortcut: "R",
    roles: ["admin", "pm"],
  },
];

// Navigation shortcuts
const navigationItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
  { title: "Projects", href: "/projects", icon: FolderIcon },
  { title: "Clients", href: "/clients", icon: Building2Icon },
  { title: "Reports", href: "/reports", icon: ClipboardListIcon },
  { title: "Users", href: "/users", icon: UsersIcon, roles: ["admin", "pm"] },
  { title: "Settings", href: "/settings", icon: SettingsIcon },
];

export function CommandMenu({ userRole = "pm" }: CommandMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentItems, setRecentItems] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();

  const debouncedQuery = useDebounce(query, 200);

  // Handle keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Load recent items when dialog opens
  useEffect(() => {
    if (open && recentItems.length === 0) {
      startTransition(async () => {
        const items = await getRecentItems();
        setRecentItems(items);
      });
    }
  }, [open, recentItems.length]);

  // Search when query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      startTransition(async () => {
        const searchResults = await globalSearch(debouncedQuery);
        setResults(searchResults);
      });
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router]
  );

  // Filter actions based on user role
  const availableActions = quickActions.filter(
    (action) => !action.roles || action.roles.includes(userRole)
  );
  const availableNavigation = navigationItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  // Group results by type
  const groupedResults = results.reduce(
    (acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type].push(result);
      return acc;
    },
    {} as Record<string, SearchResult[]>
  );

  const typeLabels: Record<string, string> = {
    project: "Projects",
    client: "Clients",
    user: "Users",
    report: "Reports",
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command Menu"
      description="Search for projects, clients, users, or use quick actions"
    >
      <CommandInput
        placeholder="Search projects, clients, users..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isPending ? "Searching..." : "No results found."}
        </CommandEmpty>

        {/* Search Results */}
        {query.length >= 2 && results.length > 0 && (
          <>
            {Object.entries(groupedResults).map(([type, items]) => (
              <CommandGroup key={type} heading={typeLabels[type] || type}>
                {items.map((result) => {
                  const Icon = iconMap[result.icon || "folder"];
                  return (
                    <CommandItem
                      key={`${result.type}-${result.id}`}
                      value={`${result.title} ${result.subtitle}`}
                      onSelect={() => handleSelect(result.href)}
                    >
                      {Icon && <Icon className="mr-2 size-4" />}
                      <div className="flex flex-col">
                        <span>{result.title}</span>
                        {result.subtitle && (
                          <span className="text-xs text-muted-foreground">
                            {result.subtitle}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
            <CommandSeparator />
          </>
        )}

        {/* Recent Items (when no search query) */}
        {query.length < 2 && recentItems.length > 0 && (
          <>
            <CommandGroup heading="Recent Projects">
              {recentItems.map((item) => {
                const Icon = iconMap[item.icon || "folder"];
                return (
                  <CommandItem
                    key={`recent-${item.id}`}
                    value={`${item.title} ${item.subtitle}`}
                    onSelect={() => handleSelect(item.href)}
                  >
                    {Icon && <Icon className="mr-2 size-4" />}
                    <div className="flex flex-col">
                      <span>{item.title}</span>
                      {item.subtitle && (
                        <span className="text-xs text-muted-foreground">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Quick Actions */}
        {availableActions.length > 0 && (
          <CommandGroup heading="Quick Actions">
            {availableActions.map((action) => (
              <CommandItem
                key={action.href}
                value={action.title}
                onSelect={() => handleSelect(action.href)}
              >
                <action.icon className="mr-2 size-4" />
                <span>{action.title}</span>
                <CommandShortcut>⌘{action.shortcut}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          {availableNavigation.map((item) => (
            <CommandItem
              key={item.href}
              value={item.title}
              onSelect={() => handleSelect(item.href)}
            >
              <item.icon className="mr-2 size-4" />
              <span>{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
