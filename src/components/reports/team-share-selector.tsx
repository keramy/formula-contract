"use client";

/**
 * TeamShareSelector Component
 *
 * A checkbox-based selector for choosing team members to share reports with.
 * Shows team members with avatars and roles.
 *
 * Used in both report creation and editing modals.
 */

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { GradientAvatar } from "@/components/ui/ui-helpers";
import type { TeamMember } from "./report-types";
import { formatRole } from "./report-types";

interface TeamShareSelectorProps {
  teamMembers: TeamMember[];
  selectedUserIds: string[];
  onToggleUser: (userId: string) => void;
  loading?: boolean;
}

export function TeamShareSelector({
  teamMembers,
  selectedUserIds,
  onToggleUser,
  loading = false,
}: TeamShareSelectorProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        <Label className="text-sm">Share with specific users</Label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Loading team members...
        </div>
      </div>
    );
  }

  if (teamMembers.length === 0) {
    return (
      <div className="space-y-2">
        <Label className="text-sm">Share with specific users</Label>
        <p className="text-sm text-muted-foreground">
          No team members assigned to this project
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm">Share with specific users</Label>
      <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
        {teamMembers.map((member) => (
          <label
            key={member.id}
            className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
          >
            <Checkbox
              checked={selectedUserIds.includes(member.id)}
              onCheckedChange={() => onToggleUser(member.id)}
            />
            <GradientAvatar name={member.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{member.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {formatRole(member.role)}
              </p>
            </div>
          </label>
        ))}
      </div>
      {selectedUserIds.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selectedUserIds.length} user{selectedUserIds.length === 1 ? "" : "s"} selected
        </p>
      )}
    </div>
  );
}
