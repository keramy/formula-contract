"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  UsersIcon,
  PlusIcon,
  TrashIcon,
  UserIcon,
} from "lucide-react";
import { assignUserToProject, removeUserFromProject, getAvailableUsers } from "./actions";

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

const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  pm: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  production: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  procurement: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  management: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  client: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

const roleLabels: Record<string, string> = {
  admin: "Admin",
  pm: "Project Manager",
  production: "Production",
  procurement: "Procurement",
  management: "Management",
  client: "Client",
};

export function TeamOverview({ projectId, assignments, canManageTeam }: TeamOverviewProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userToRemove, setUserToRemove] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!selectedUserId) return;

    setIsLoading(true);
    setError(null);

    const result = await assignUserToProject(projectId, selectedUserId);

    if (!result.success) {
      setError(result.error || "Failed to assign user");
      setIsLoading(false);
      return;
    }

    setAddDialogOpen(false);
    setSelectedUserId("");
    setIsLoading(false);
    router.refresh();
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

  // Group assignments by role
  const groupedAssignments = assignments.reduce((acc, assignment) => {
    const role = assignment.user.role;
    if (!acc[role]) {
      acc[role] = [];
    }
    acc[role].push(assignment);
    return acc;
  }, {} as Record<string, Assignment[]>);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Project Team</h3>
          <p className="text-sm text-muted-foreground">
            {assignments.length} member{assignments.length !== 1 ? "s" : ""} assigned to this project
          </p>
        </div>
        {canManageTeam && (
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
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
                  <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="user">Select User</Label>
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
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user to add..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <span>{user.name}</span>
                              <span className="text-muted-foreground">({user.email})</span>
                              <Badge variant="secondary" className={`text-xs ${roleColors[user.role] || ""}`}>
                                {roleLabels[user.role] || user.role}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleAssign}
                    disabled={isLoading || !selectedUserId}
                  >
                    {isLoading ? (
                      <>
                        <Spinner className="size-4" />
                        Adding...
                      </>
                    ) : (
                      "Add to Project"
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
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <UsersIcon className="size-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">
              No team members assigned yet.
            </p>
            {canManageTeam && (
              <Button onClick={() => setAddDialogOpen(true)}>
                <PlusIcon className="size-4" />
                Add First Member
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(groupedAssignments).map(([role, roleAssignments]) => (
            <Card key={role}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Badge variant="secondary" className={roleColors[role] || ""}>
                    {roleLabels[role] || role}
                  </Badge>
                  <span className="text-muted-foreground font-normal">
                    ({roleAssignments.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {roleAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-muted flex items-center justify-center">
                        <UserIcon className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{assignment.user.name}</p>
                        <p className="text-xs text-muted-foreground">{assignment.user.email}</p>
                      </div>
                    </div>
                    {canManageTeam && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => openRemoveDialog(assignment.user)}
                      >
                        <TrashIcon className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
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
