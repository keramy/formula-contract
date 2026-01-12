"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { format } from "date-fns";
import { UserFormDialog } from "./user-form-dialog";
import { toggleUserActive } from "./actions";

interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

interface UsersTableProps {
  users: User[];
}

const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  pm: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  production: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  procurement: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  management: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  client: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const roleLabels: Record<string, string> = {
  admin: "Admin",
  pm: "Project Manager",
  production: "Production",
  procurement: "Procurement",
  management: "Management",
  client: "Client",
};

// Helper to determine user status
function getUserStatus(user: User): "pending" | "active" | "inactive" {
  if (!user.is_active && !user.last_login_at) return "pending";
  if (!user.is_active) return "inactive";
  return "active";
}

const statusConfig = {
  pending: {
    label: "Pending",
    variant: "outline" as const,
    className: "border-yellow-500/50 text-yellow-600 dark:text-yellow-400",
  },
  active: {
    label: "Active",
    variant: "default" as const,
    className: "",
  },
  inactive: {
    label: "Inactive",
    variant: "secondary" as const,
    className: "",
  },
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
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-muted/30">
          <div className="rounded-full bg-muted p-4 mb-4">
            <UsersIcon className="size-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">No users found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-4">
            Get started by adding your first team member.
          </p>
          <Button onClick={handleAddUser}>
            <PlusIcon className="size-4" />
            Add User
          </Button>
        </div>
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
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={searchParams.get("role") || "all"}
          onValueChange={handleRoleFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="pm">Project Manager</SelectItem>
            <SelectItem value="production">Production</SelectItem>
            <SelectItem value="procurement">Procurement</SelectItem>
            <SelectItem value="management">Management</SelectItem>
            <SelectItem value="client">Client</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleAddUser}>
          <PlusIcon className="size-4" />
          Add User
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No users found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className={getUserStatus(user) === "inactive" ? "opacity-60" : ""}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={roleColors[user.role]}>
                      {roleLabels[user.role] || user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const status = getUserStatus(user);
                      const config = statusConfig[status];
                      return (
                        <Badge variant={config.variant} className={config.className}>
                          {config.label}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.last_login_at
                      ? format(new Date(user.last_login_at), "MMM d, yyyy")
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" disabled={isLoading}>
                          <MoreHorizontalIcon className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditUser(user)}>
                          <PencilIcon className="size-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {getUserStatus(user) !== "pending" && (
                          <DropdownMenuItem onClick={() => handleToggleActive(user)}>
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
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Form Dialog */}
      <UserFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editUser={editUser}
      />
    </>
  );
}
