"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GlassCard, GradientIcon, StatusBadge, GradientAvatar, EmptyState } from "@/components/ui/ui-helpers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import {
  UsersIcon,
  PlusIcon,
  TrashIcon,
  UserIcon,
} from "lucide-react";
import { assignUserToProject, removeUserFromProject, getAvailableUsers } from "@/lib/actions/project-assignments";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Assignment {
  id: string;
  assigned_at: string;
  user: User;
  assigned_by_user: { name: string } | null;
}

interface TeamOverviewProps {
  projectId: string;
  assignments: Assignment[];
  canManageTeam: boolean;
}

type StatusVariant = "info" | "success" | "warning" | "default" | "danger";

const roleConfig: Record<string, { variant: StatusVariant; label: string }> = {
  admin: { variant: "danger", label: "Admin" },
  pm: { variant: "info", label: "Project Manager" },
  production: { variant: "info", label: "Production" },
  procurement: { variant: "warning", label: "Procurement" },
  management: { variant: "default", label: "Management" },
  client: { variant: "success", label: "Client" },
};

export function TeamOverview({ projectId, assignments, canManageTeam }: TeamOverviewProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [userToRemove, setUserToRemove] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Toggle user selection for multi-select
  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  // Select/deselect all users
  const toggleSelectAll = () => {
    if (selectedUserIds.size === availableUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(availableUsers.map((u) => u.id)));
    }
  };

  // Load available users when dialog opens
  useEffect(() => {
    if (addDialogOpen) {
      setLoadingUsers(true);
      setError(null);
      getAvailableUsers(projectId)
        .then((users) => {
          setAvailableUsers(users as User[]);
        })
        .catch((err) => {
          console.error("Failed to load users:", err);
          setError("Failed to load users");
        })
        .finally(() => {
          setLoadingUsers(false);
        });
    }
  }, [addDialogOpen, projectId]);

  const handleAssign = async () => {
    if (selectedUserIds.size === 0) return;

    setIsLoading(true);
    setError(null);

    const userIds = Array.from(selectedUserIds);
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Assign all selected users
    for (const userId of userIds) {
      const result = await assignUserToProject(projectId, userId);
      if (result.success) {
        successCount++;
      } else {
        failedCount++;
        errors.push(result.error || "Unknown error");
      }
    }

    if (failedCount > 0) {
      setError(`Failed to assign ${failedCount} user(s): ${errors[0]}`);
    }

    if (successCount > 0) {
      setAddDialogOpen(false);
      setSelectedUserIds(new Set());
      router.refresh();
    }

    setIsLoading(false);
  };

  const handleRemove = async () => {
    if (!userToRemove) return;

    setIsLoading(true);
    setError(null);

    const result = await removeUserFromProject(projectId, userToRemove.id);

    if (!result.success) {
      setError(result.error || "Failed to remove user");
      setIsLoading(false);
      return;
    }

    setRemoveDialogOpen(false);
    setUserToRemove(null);
    setIsLoading(false);
    router.refresh();
  };

  const openRemoveDialog = (user: User) => {
    setUserToRemove(user);
    setRemoveDialogOpen(true);
  };

  // OPTIMIZED: Memoize grouped assignments to avoid recomputing on every render
  const groupedAssignments = useMemo(() =>
    assignments.reduce((acc, assignment) => {
      const role = assignment.user.role;
      if (!acc[role]) {
        acc[role] = [];
      }
      acc[role].push(assignment);
      return acc;
    }, {} as Record<string, Assignment[]>),
  [assignments]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GradientIcon icon={<UsersIcon className="size-4" />} color="coral" size="sm" />
          <div>
            <h3 className="text-lg font-medium">Project Team</h3>
            <p className="text-sm text-muted-foreground">
              {assignments.length} member{assignments.length !== 1 ? "s" : ""} assigned to this project
            </p>
          </div>
        </div>
        {canManageTeam && (
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600">
                <PlusIcon className="size-4" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>
                  Assign a user to this project. They will be able to access and work on this project.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                {error && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Select Users</Label>
                    {availableUsers.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleSelectAll}
                        className="text-xs h-6"
                      >
                        {selectedUserIds.size === availableUsers.length ? "Deselect All" : "Select All"}
                      </Button>
                    )}
                  </div>
                  {loadingUsers ? (
                    <div className="flex items-center gap-2 p-3 text-muted-foreground">
                      <Spinner className="size-4" />
                      Loading users...
                    </div>
                  ) : availableUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-3">
                      All users are already assigned to this project.
                    </p>
                  ) : (
                    <ScrollArea className="h-[200px] border rounded-md p-2">
                      <div className="space-y-1">
                        {availableUsers.map((user) => {
                          const config = roleConfig[user.role] || { variant: "default" as StatusVariant, label: user.role };
                          return (
                            <label
                              key={user.id}
                              className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                            >
                              <Checkbox
                                checked={selectedUserIds.has(user.id)}
                                onCheckedChange={() => toggleUserSelection(user.id)}
                              />
                              <GradientAvatar name={user.name} size="sm" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{user.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                              </div>
                              <StatusBadge variant={config.variant}>
                                {config.label}
                              </StatusBadge>
                            </label>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                  {selectedUserIds.size > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedUserIds.size} user{selectedUserIds.size === 1 ? "" : "s"} selected
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleAssign}
                    disabled={isLoading || selectedUserIds.size === 0}
                    className="bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600"
                  >
                    {isLoading ? (
                      <>
                        <Spinner className="size-4" />
                        Adding {selectedUserIds.size}...
                      </>
                    ) : (
                      `Add ${selectedUserIds.size > 0 ? `${selectedUserIds.size} ` : ""}to Project`
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setAddDialogOpen(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Team Members by Role */}
      {assignments.length === 0 ? (
        <GlassCard className="p-8">
          <EmptyState
            icon={<UsersIcon className="size-6" />}
            title="No team members yet"
            description="No team members assigned yet."
            action={canManageTeam ? (
              <Button
                onClick={() => setAddDialogOpen(true)}
                className="bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600"
              >
                <PlusIcon className="size-4" />
                Add First Member
              </Button>
            ) : undefined}
          />
        </GlassCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(groupedAssignments).map(([role, roleAssignments]) => {
            const config = roleConfig[role] || { variant: "default" as StatusVariant, label: role };
            return (
              <GlassCard key={role}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <StatusBadge variant={config.variant}>
                      {config.label}
                    </StatusBadge>
                    <span className="text-muted-foreground font-normal">
                      ({roleAssignments.length})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {roleAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <GradientAvatar name={assignment.user.name} size="sm" />
                        <div>
                          <p className="text-sm font-medium">{assignment.user.name}</p>
                          <p className="text-xs text-muted-foreground">{assignment.user.email}</p>
                        </div>
                      </div>
                      {canManageTeam && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => openRemoveDialog(assignment.user)}
                        >
                          <TrashIcon className="size-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{userToRemove?.name}</strong> from this project?
              They will no longer have access to this project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? (
                <>
                  <Spinner className="size-4" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
