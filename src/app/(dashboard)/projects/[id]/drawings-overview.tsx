"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileIcon,
  AlertTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  FactoryIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Drawing {
  id: string;
  item_id: string;
  status: string;
  current_revision: string | null;
  sent_to_client_at: string | null;
}

interface ProductionItem {
  id: string;
  item_code: string;
  name: string;
}

interface DrawingsOverviewProps {
  projectId: string;
  productionItems: ProductionItem[];
  drawings: Drawing[];
}

const statusColors: Record<string, string> = {
  not_uploaded: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  uploaded: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  sent_to_client: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  approved_with_comments: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusLabels: Record<string, string> = {
  not_uploaded: "Not Uploaded",
  uploaded: "Uploaded",
  sent_to_client: "Awaiting Client",
  approved: "Approved",
  approved_with_comments: "Approved w/ Comments",
  rejected: "Rejected",
};

export function DrawingsOverview({ projectId, productionItems, drawings }: DrawingsOverviewProps) {
  // Create a map of drawings by item_id
  const drawingsByItemId = new Map(drawings.map((d) => [d.item_id, d]));

  // Combine items with their drawings
  const itemsWithDrawings = productionItems.map((item) => ({
    ...item,
    drawing: drawingsByItemId.get(item.id) || null,
  }));

  // Calculate stats
  const stats = {
    total: productionItems.length,
    needDrawing: itemsWithDrawings.filter(
      (i) => !i.drawing || i.drawing.status === "not_uploaded"
    ).length,
    awaitingClient: itemsWithDrawings.filter(
      (i) => i.drawing?.status === "sent_to_client"
    ).length,
    rejected: itemsWithDrawings.filter(
      (i) => i.drawing?.status === "rejected"
    ).length,
    approved: itemsWithDrawings.filter(
      (i) => i.drawing?.status === "approved" || i.drawing?.status === "approved_with_comments"
    ).length,
  };

  // Items needing attention
  const needsAttention = itemsWithDrawings.filter((item) => {
    if (!item.drawing || item.drawing.status === "not_uploaded") return true;
    if (item.drawing.status === "rejected") return true;
    // Awaiting client for more than 3 days
    if (item.drawing.status === "sent_to_client" && item.drawing.sent_to_client_at) {
      const sentDate = new Date(item.drawing.sent_to_client_at);
      const daysSinceSent = (Date.now() - sentDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceSent > 3;
    }
    return false;
  });

  if (productionItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileIcon className="size-5" />
            Drawings
          </CardTitle>
          <CardDescription>Manage technical drawings for production items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <FactoryIcon className="size-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              No production items in this project yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Add scope items with &quot;Production&quot; path to manage drawings.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <FactoryIcon className="size-4" />
            <span className="text-xs font-medium">Production Items</span>
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <AlertTriangleIcon className="size-4 text-orange-500" />
            <span className="text-xs font-medium">Need Drawing</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{stats.needDrawing}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ClockIcon className="size-4 text-yellow-500" />
            <span className="text-xs font-medium">Awaiting Client</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{stats.awaitingClient}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <XCircleIcon className="size-4 text-red-500" />
            <span className="text-xs font-medium">Rejected</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CheckCircleIcon className="size-4 text-green-500" />
            <span className="text-xs font-medium">Approved</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
        </Card>
      </div>

      {/* Needs Attention Section */}
      {needsAttention.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangleIcon className="size-4 text-orange-500" />
              Needs Attention ({needsAttention.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {needsAttention.slice(0, 5).map((item) => (
                <Link
                  key={item.id}
                  href={`/projects/${projectId}/scope/${item.id}`}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-muted-foreground">
                      {item.item_code}
                    </span>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!item.drawing || item.drawing.status === "not_uploaded" ? (
                      <span className="text-sm text-orange-600">No drawing uploaded</span>
                    ) : item.drawing.status === "rejected" ? (
                      <span className="text-sm text-red-600">Rejected - needs revision</span>
                    ) : item.drawing.status === "sent_to_client" && item.drawing.sent_to_client_at ? (
                      <span className="text-sm text-yellow-600">
                        Awaiting client ({formatDistanceToNow(new Date(item.drawing.sent_to_client_at), { addSuffix: false })})
                      </span>
                    ) : null}
                    <ArrowRightIcon className="size-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
              {needsAttention.length > 5 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  +{needsAttention.length - 5} more items need attention
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Production Items Table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">All Production Items</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Revision</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsWithDrawings.map((item) => {
                  const status = item.drawing?.status || "not_uploaded";
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.item_code}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        {item.drawing?.current_revision ? (
                          <Badge variant="outline" className="font-mono">
                            Rev {item.drawing.current_revision}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColors[status]}>
                          {statusLabels[status] || status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/projects/${projectId}/scope/${item.id}`}>
                            View
                            <ArrowRightIcon className="size-3 ml-1" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
