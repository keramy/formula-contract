import Link from "next/link";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassCard, GradientIcon } from "@/components/ui/ui-helpers";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  HammerIcon,
  PlayCircleIcon,
  CheckCircle2Icon,
  TruckIcon,
  ArrowRightIcon,
} from "lucide-react";
import type { ProductionQueueSummary } from "@/lib/actions/dashboard";

interface ProductionQueueWidgetProps {
  queue: ProductionQueueSummary;
}

export function ProductionQueueWidget({ queue }: ProductionQueueWidgetProps) {
  const hasItems = queue.totalInProduction > 0 || queue.totalReady > 0 || queue.totalPendingInstall > 0;

  return (
    <GlassCard className="lg:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <GradientIcon icon={<HammerIcon className="size-4" />} color="amber" size="sm" />
          <CardTitle className="text-base font-semibold">Production Queue</CardTitle>
          {hasItems && (
            <Badge variant="secondary" className="ml-2">
              {queue.totalInProduction + queue.totalReady + queue.totalPendingInstall}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasItems ? (
          <div className="py-6 text-center text-muted-foreground">
            <HammerIcon className="size-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm font-medium text-green-700">Queue is clear!</p>
            <p className="text-xs text-muted-foreground mt-1">No production items at the moment</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {/* In Production */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
                <PlayCircleIcon className="size-4" />
                <span>In Production</span>
                <Badge variant="outline" className="ml-auto">{queue.totalInProduction}</Badge>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {queue.inProduction.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">None</p>
                ) : (
                  queue.inProduction.map((item) => (
                    <Link
                      key={item.id}
                      href={`/projects/${item.project_slug || item.project_id}/scope/${item.id}`}
                      className="group block p-2 rounded-md bg-amber-50 hover:bg-amber-100 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium truncate">{item.item_code}</span>
                        <span className="text-xs font-bold">{item.production_percentage}%</span>
                      </div>
                      <Progress value={item.production_percentage} className="h-1.5" />
                      <p className="text-xs text-muted-foreground truncate mt-1">{item.project_code}</p>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Ready for Production */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <CheckCircle2Icon className="size-4" />
                <span>Ready to Start</span>
                <Badge variant="outline" className="ml-auto">{queue.totalReady}</Badge>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {queue.readyForProduction.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">None</p>
                ) : (
                  queue.readyForProduction.map((item) => (
                    <Link
                      key={item.id}
                      href={`/projects/${item.project_slug || item.project_id}/scope/${item.id}`}
                      className="group block p-2 rounded-md bg-emerald-50 hover:bg-emerald-100 transition-colors"
                    >
                      <span className="text-xs font-medium truncate block">{item.item_code}</span>
                      <p className="text-xs text-muted-foreground truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.project_code}</p>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Pending Installation */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                <TruckIcon className="size-4" />
                <span>Pending Install</span>
                <Badge variant="outline" className="ml-auto">{queue.totalPendingInstall}</Badge>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {queue.pendingInstallation.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">None</p>
                ) : (
                  queue.pendingInstallation.map((item) => (
                    <Link
                      key={item.id}
                      href={`/projects/${item.project_slug || item.project_id}/scope/${item.id}`}
                      className="group block p-2 rounded-md bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                      <span className="text-xs font-medium truncate block">{item.item_code}</span>
                      <p className="text-xs text-muted-foreground truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.project_code}</p>
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
