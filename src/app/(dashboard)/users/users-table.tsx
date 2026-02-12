"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MoreHorizontalIcon,
  PencilIcon,
  UserXIcon,
  UserCheckIcon,
  UsersIcon,
  SearchIcon,
  PlusIcon,
  FilterIcon,
} from "lucide-react";
import { format } from "date-fns";
import { UserFormDialog } from "./user-form-dialog";
import { toggleUserActive } from "@/lib/actions/users";
import { GlassCard, EmptyState, GradientAvatar, StatusBadge } from "@/components/ui/ui-helpers";

interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  last_active_at: string | null;
  created_at: string;
  employee_code: string | null; // Human-readable code (EMP-NNNN)
}

interface UsersTableProps {
  users: User[];
}

type RoleVariant = "danger" | "info" | "violet" | "coral" | "success" | "default";

const roleConfig: Record<string, { variant: RoleVariant; label: string }> = {
  admin: { variant: "danger", label: "Admin" },
  pm: { variant: "info", label: "Project Manager" },
  production: { variant: "info", label: "Production" },
  procurement: { variant: "coral", label: "Procurement" },
  management: { variant: "success", label: "Management" },
  client: { variant: "default", label: "Client" },
};

// Helper to determine user status
function getUserStatus(user: User): "pending" | "active" | "inactive" {
  if (!user.is_active && !user.last_login_at) return "pending";
  if (!user.is_active) return "inactive";
  return "active";
}

type StatusVariant = "warning" | "success" | "default";

const statusConfig: Record<string, { variant: StatusVariant; label: string }> = {
  pending: { variant: "warning", label: "Pending" },
  active: { variant: "success", label: "Active" },
  inactive: { variant: "default", label: "Inactive" },
};

export function UsersTable({ users }: UsersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  const handleSearch = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    router.push(`/users?${params.toString()}`);
  };

  const handleRoleFilter = (role: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (role && role !== "all") {
      params.set("role", role);
    } else {
      params.delete("role");
    }
    router.push(`/users?${params.toString()}`);
  };

  const handleAddUser = () => {
    setEditUser(null);
    setDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditUser(user);
    setDialogOpen(true);
  };

  const handleToggleActive = async (user: User) => {
    setIsLoading(true);
    try {
      const result = await toggleUserActive(user.id, !user.is_active);
      if (!result.success) {
        console.error("Failed to update user status:", result.error);
      }
      router.refresh();
    } catch (error) {
      console.error("Failed to update user status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (users.length === 0 && !searchParams.get("search") && !searchParams.get("role")) {
    return (
      <>
        <GlassCard>
          <EmptyState
            icon={<UsersIcon className="size-8" />}
            title="No users found"
            description="Get started by adding your first team member."
            action={
              <Button onClick={handleAddUser} >
                <PlusIcon className="size-4" />
                Add User
              </Button>
            }
          />
        </GlassCard>
        <UserFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editUser={editUser}
        />
      </>
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 bg-white/50 border-gray-200 focus:bg-white transition-colors"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterIcon className="size-4 text-muted-foreground hidden sm:block" />
          <Select
            value={searchParams.get("role") || "all"}
            onValueChange={handleRoleFilter}
          >
            <SelectTrigger className="w-[180px] bg-white/50 border-gray-200">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {Object.entries(roleConfig).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  <StatusBadge variant={config.variant} dot>
                    {config.label}
                  </StatusBadge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleAddUser} >
          <PlusIcon className="size-4" />
          Add User
        </Button>
      </div>

      <ResponsiveDataView
        data={users}
        cardsClassName="grid grid-cols-1 gap-3"
        emptyState={
          <GlassCard>
            <EmptyState
              icon={<UsersIcon className="size-8" />}
              title="No users found"
              description="No users found matching your filters."
            />
          </GlassCard>
        }
        tableView={(
          <GlassCard className="py-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-gray-100">
                  <TableHead className="py-4 w-24">Code</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No users found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user, index) => {
                    const userStatus = getUserStatus(user);
                    const statusConf = statusConfig[userStatus];
                    const roleConf = roleConfig[user.role] || { variant: "default" as RoleVariant, label: user.role };

                    return (
                      <TableRow
                        key={user.id}
                        className={`group hover:bg-primary/5 border-b border-base-50 last:border-0 ${userStatus === "inactive" ? "opacity-60" : ""}`}
                      >
                        <TableCell className="py-4">
                          <span className="text-sm font-mono font-medium text-orange-600">
                            {user.employee_code || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <GradientAvatar name={user.name} size="sm" />
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          <StatusBadge variant={roleConf.variant} dot>
                            {roleConf.label}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge variant={statusConf.variant} dot>
                            {statusConf.label}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {user.last_active_at
                            ? format(new Date(user.last_active_at), "MMM d, yyyy 'at' h:mm a")
                            : user.last_login_at
                            ? format(new Date(user.last_login_at), "MMM d, yyyy 'at' h:mm a")
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                disabled={isLoading}
                              >
                                <MoreHorizontalIcon className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleEditUser(user)} className="cursor-pointer">
                                <PencilIcon className="size-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              {userStatus !== "pending" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleToggleActive(user)} className="cursor-pointer">
                                    {user.is_active ? (
                                      <>
                                        <UserXIcon className="size-4 mr-2" />
                                        Deactivate
                                      </>
                                    ) : (
                                      <>
                                        <UserCheckIcon className="size-4 mr-2" />
                                        Activate
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </GlassCard>
        )}
        renderCard={(user, index) => {
          const userStatus = getUserStatus(user);
          const statusConf = statusConfig[userStatus];
          const roleConf = roleConfig[user.role] || { variant: "default" as RoleVariant, label: user.role };
          return (
            <GlassCard key={user.id} className={`p-4 space-y-3 ${userStatus === "inactive" ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <GradientAvatar name={user.name} size="sm" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8" disabled={isLoading}>
                      <MoreHorizontalIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => handleEditUser(user)} className="cursor-pointer">
                      <PencilIcon className="size-4 mr-2" />
                      Edit User
                    </DropdownMenuItem>
                    {userStatus !== "pending" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleToggleActive(user)} className="cursor-pointer">
                          {user.is_active ? (
                            <>
                              <UserXIcon className="size-4 mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheckIcon className="size-4 mr-2" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge variant={roleConf.variant} dot>{roleConf.label}</StatusBadge>
                <StatusBadge variant={statusConf.variant} dot>{statusConf.label}</StatusBadge>
                <Badge variant="outline" className="font-mono">{user.employee_code || "—"}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Last active: {user.last_active_at
                  ? format(new Date(user.last_active_at), "MMM d, yyyy 'at' h:mm a")
                  : user.last_login_at
                  ? format(new Date(user.last_login_at), "MMM d, yyyy 'at' h:mm a")
                  : "Never"}
              </p>
            </GlassCard>
          );
        }}
      />

      {/* Form Dialog */}
      <UserFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editUser={editUser}
      />
    </>
  );
}
