"use client";

import { useState, useEffect, useMemo } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ShieldCheckIcon,
  UserPlusIcon,
  TrashIcon,
  BanknoteIcon,
} from "lucide-react";
import {
  useFinanceAccessList,
  useAvailableUsers,
  useGrantFinanceAccess,
  useRevokeFinanceAccess,
  useUpdateFinanceApproval,
} from "@/lib/react-query/finance";
import type { FinanceAccessWithUser } from "@/types/finance";

export function FinanceAccessManager() {
  const { data: accessList, isLoading } = useFinanceAccessList();
  const { data: allUsers } = useAvailableUsers();
  const grantAccess = useGrantFinanceAccess();
  const revokeAccess = useRevokeFinanceAccess();
  const updateApproval = useUpdateFinanceApproval();

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [revokeTarget, setRevokeTarget] = useState<FinanceAccessWithUser | null>(null);

  const { setContent } = usePageHeader();
  useEffect(() => {
    setContent({
      icon: <GradientIcon icon={<ShieldCheckIcon className="size-4" />} color="amber" size="sm" />,
      title: "Finance Access",
      description: "Manage who can access the Payments module",
    });
    return () => setContent({});
  }, [setContent]);

  // Filter out users who already have access
  const existingUserIds = useMemo(
    () => new Set(accessList?.map((a) => a.user_id) || []),
    [accessList]
  );

  const availableUsers = useMemo(
    () => (allUsers || []).filter((u) => !existingUserIds.has(u.id)),
    [allUsers, existingUserIds]
  );

  const handleGrant = () => {
    if (!selectedUserId) return;
    grantAccess.mutate(
      { userId: selectedUserId, canApprove: false },
      { onSuccess: () => setSelectedUserId("") }
    );
  };

  const handleRevoke = (userId: string) => {
    revokeAccess.mutate(userId, {
      onSuccess: () => setRevokeTarget(null),
    });
  };

  const handleToggleApproval = (userId: string, canApprove: boolean) => {
    updateApproval.mutate({ userId, canApprove });
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Add User Section */}
      <GlassCard>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <GradientIcon icon={<UserPlusIcon className="size-3.5" />} color="blue" size="xs" />
            Add User
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user to add..." />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} — {user.email} ({user.role})
                    </SelectItem>
                  ))}
                  {availableUsers.length === 0 && (
                    <SelectItem value="none" disabled>
                      All users already have access
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              onClick={handleGrant}
              disabled={!selectedUserId || grantAccess.isPending}
            >
              <UserPlusIcon className="size-4 mr-1" />
              Grant Access
            </Button>
          </div>
        </CardContent>
      </GlassCard>

      {/* Access List */}
      <GlassCard>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <GradientIcon icon={<BanknoteIcon className="size-3.5" />} color="amber" size="xs" />
            Whitelisted Users
            {accessList && (
              <Badge variant="secondary" className="ml-1">
                {accessList.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-base-50/50">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-10" />
                </div>
              ))}
            </div>
          ) : !accessList || accessList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No users have been granted access yet.
            </p>
          ) : (
            <div className="space-y-2">
              {accessList.map((access) => (
                <div
                  key={access.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-base-50/50 border border-transparent hover:border-base-200 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {access.user?.name || "Unknown"}
                      </span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {access.user?.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {access.user?.email}
                      {access.granted_by_user && (
                        <span> — added by {access.granted_by_user.name}</span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Can Approve</span>
                      <Switch
                        checked={access.can_approve}
                        onCheckedChange={(checked) =>
                          handleToggleApproval(access.user_id, checked)
                        }
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setRevokeTarget(access)}
                    >
                      <TrashIcon className="size-3.5" />
                      <span className="sr-only">Remove access</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </GlassCard>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={!!revokeTarget} onOpenChange={() => setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Finance Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{revokeTarget?.user?.name}</strong> from the Payments
              module? They will no longer be able to view or manage invoices,
              receivables, or suppliers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => revokeTarget && handleRevoke(revokeTarget.user_id)}
            >
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
