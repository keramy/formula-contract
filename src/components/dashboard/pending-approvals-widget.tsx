import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GlassCard, GradientIcon } from "@/components/ui/ui-helpers";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardCheckIcon,
  ArrowRightIcon,
  FileImageIcon,
  PackageIcon,
  CheckCircle2Icon,
} from "lucide-react";
import type { PendingApproval } from "@/lib/actions/dashboard";

interface PendingApprovalsWidgetProps {
  approvals: PendingApproval[];
}

const typeConfig = {
  drawing: {
    icon: FileImageIcon,
    label: "Drawing",
    color: "text-blue-600 bg-blue-50",
  },
  material: {
    icon: PackageIcon,
    label: "Material",
    color: "text-purple-600 bg-purple-50",
  },
};

export function PendingApprovalsWidget({ approvals }: PendingApprovalsWidgetProps) {
  if (approvals.length === 0) {
    return (
      <GlassCard>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <GradientIcon icon={<ClipboardCheckIcon className="size-4" />} color="amber" size="sm" />
            <CardTitle className="text-base font-semibold">Pending Approvals</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="py-6 text-center text-muted-foreground">
            <CheckCircle2Icon className="size-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm font-medium text-green-700">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">No items awaiting your approval</p>
          </div>
        </CardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GradientIcon icon={<ClipboardCheckIcon className="size-4" />} color="amber" size="sm" />
            <CardTitle className="text-base font-semibold">Pending Approvals</CardTitle>
            <Badge variant="warning" className="ml-2">
              {approvals.length}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {approvals.slice(0, 5).map((approval) => {
          const config = typeConfig[approval.type];
          const Icon = config.icon;

          return (
            <Link
              key={`${approval.type}-${approval.id}`}
              href={`/projects/${approval.projectSlug || approval.projectId}?tab=${approval.type === "drawing" ? "drawings" : "materials"}`}
              className="group block p-3 rounded-lg bg-amber-50/50 border border-amber-100 hover:bg-amber-100/70 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-md ${config.color}`}>
                  <Icon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">
                      {config.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(approval.sentAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {approval.itemCode && (
                      <span className="font-mono text-muted-foreground mr-1">{approval.itemCode}</span>
                    )}
                    {approval.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {approval.projectCode} • {approval.projectName}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="shrink-0">
                  Review
                  <ArrowRightIcon className="size-3 ml-1" />
                </Button>
              </div>
            </Link>
          );
        })}

        {approvals.length > 5 && (
          <div className="text-center pt-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/projects">
                View all {approvals.length} items
                <ArrowRightIcon className="size-4 ml-1" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </GlassCard>
  );
}
