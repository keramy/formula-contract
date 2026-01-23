import Link from "next/link";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassCard, GradientIcon } from "@/components/ui/ui-helpers";
import { Badge } from "@/components/ui/badge";
import {
  PackageIcon,
  PackageSearchIcon,
  ClockIcon,
  ArrowRightIcon,
} from "lucide-react";
import type { ProcurementQueueSummary } from "@/lib/actions/dashboard";

interface ProcurementQueueWidgetProps {
  queue: ProcurementQueueSummary;
}

export function ProcurementQueueWidget({ queue }: ProcurementQueueWidgetProps) {
  const hasItems = queue.totalNeedsMaterials > 0 || queue.totalPendingApproval > 0;

  return (
    <GlassCard className="lg:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <GradientIcon icon={<PackageIcon className="size-4" />} color="teal" size="sm" />
          <CardTitle className="text-base font-semibold">Procurement Queue</CardTitle>
          {hasItems && (
            <Badge variant="secondary" className="ml-2">
              {queue.totalNeedsMaterials + queue.totalPendingApproval}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasItems ? (
          <div className="py-6 text-center text-muted-foreground">
            <PackageIcon className="size-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm font-medium text-green-700">All items have materials!</p>
            <p className="text-xs text-muted-foreground mt-1">No procurement action needed</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Needs Materials */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-rose-700">
                <PackageSearchIcon className="size-4" />
                <span>Needs Materials</span>
                <Badge variant="destructive" className="ml-auto">{queue.totalNeedsMaterials}</Badge>
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {queue.needsMaterials.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">None</p>
                ) : (
                  queue.needsMaterials.map((item) => (
                    <Link
                      key={item.id}
                      href={`/projects/${item.project_slug || item.project_id}/scope/${item.id}`}
                      className="group block p-2.5 rounded-md bg-rose-50 hover:bg-rose-100 transition-colors border border-rose-100"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-rose-800">{item.item_code}</span>
                        <Badge variant="outline" className="text-xs">No materials</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">{item.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.project_code} • {item.project_name}</p>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Pending Approval */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
                <ClockIcon className="size-4" />
                <span>Pending Approval</span>
                <Badge variant="outline" className="ml-auto border-amber-300 text-amber-700">{queue.totalPendingApproval}</Badge>
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {queue.pendingApproval.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">None</p>
                ) : (
                  queue.pendingApproval.map((item) => (
                    <Link
                      key={item.id}
                      href={`/projects/${item.project_slug || item.project_id}/scope/${item.id}`}
                      className="group block p-2.5 rounded-md bg-amber-50 hover:bg-amber-100 transition-colors border border-amber-100"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-amber-800">{item.item_code}</span>
                        <Badge variant="outline" className="text-xs border-amber-300">
                          {item.pendingMaterials} pending
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">{item.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.project_code} • {item.project_name}</p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </GlassCard>
  );
}
