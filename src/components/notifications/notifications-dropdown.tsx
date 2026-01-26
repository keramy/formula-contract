"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GradientIcon } from "@/components/ui/ui-helpers";
import { cn } from "@/lib/utils";
import {
  BellIcon,
  CheckIcon,
  FileIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { type Notification } from "@/lib/notifications/actions";
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
} from "@/lib/react-query/notifications";

type GradientColor = "coral" | "teal" | "violet" | "amber" | "rose" | "emerald" | "sky" | "slate";

const typeConfig: Record<string, { icon: React.ReactNode; color: GradientColor }> = {
  drawing_approved: { icon: <CheckCircleIcon className="size-3.5" />, color: "emerald" },
  drawing_rejected: { icon: <AlertCircleIcon className="size-3.5" />, color: "rose" },
  drawing_uploaded: { icon: <FileIcon className="size-3.5" />, color: "sky" },
  drawing_sent: { icon: <ClockIcon className="size-3.5" />, color: "amber" },
  material_approved: { icon: <CheckCircleIcon className="size-3.5" />, color: "teal" },
  material_rejected: { icon: <AlertCircleIcon className="size-3.5" />, color: "rose" },
  project_assigned: { icon: <FileIcon className="size-3.5" />, color: "violet" },
  milestone_due: { icon: <ClockIcon className="size-3.5" />, color: "coral" },
  report_published: { icon: <FileIcon className="size-3.5" />, color: "teal" },
  default: { icon: <BellIcon className="size-3.5" />, color: "slate" },
};

export function NotificationsDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // React Query hooks for notifications
  const { data: notifications = [], isLoading, refetch } = useNotifications(20);
  const { data: unreadCount = 0 } = useUnreadCount();
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();

  // Refetch notifications when dropdown opens
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      refetch();
    }
  };

  const handleMarkAsRead = (notification: Notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate to relevant page based on notification type
    if (notification.project_id) {
      if (notification.item_id) {
        router.push(`/projects/${notification.project_id}/scope/${notification.item_id}`);
      } else if (notification.report_id || notification.type === "report_published") {
        router.push(`/projects/${notification.project_id}?tab=reports`);
      } else {
        router.push(`/projects/${notification.project_id}`);
      }
      setIsOpen(false);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const getConfig = (type: string) => {
    return typeConfig[type] || typeConfig.default;
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-violet-100/70 transition-colors"
        >
          <BellIcon className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 size-5 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white text-xs flex items-center justify-center font-bold shadow-lg shadow-violet-500/30">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[360px] bg-white/95 backdrop-blur-lg border-0 shadow-xl shadow-gray-200/50 rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100/50">
          <div className="flex items-center gap-2">
            <GradientIcon icon={<BellIcon className="size-4" />} color="violet" size="sm" />
            <h4 className="font-semibold text-sm">Notifications</h4>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs hover:bg-violet-100 text-violet-700"
              onClick={handleMarkAllAsRead}
            >
              <CheckIcon className="size-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[340px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
              <div className="size-8 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin mb-3" />
              <span>Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 mb-3">
                <BellIcon className="size-8 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                You&apos;ll see updates here
              </p>
            </div>
          ) : (
            <div className="py-1">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  config={getConfig(notification.type)}
                  onClick={() => handleMarkAsRead(notification)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Notification item component - shows title with project context
interface NotificationItemProps {
  notification: Notification;
  config: { icon: React.ReactNode; color: GradientColor };
  onClick: () => void;
}

function NotificationItem({ notification, config, onClick }: NotificationItemProps) {
  // Build display text with project context
  const projectName = notification.project?.name;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 hover:bg-gray-50/80 transition-all duration-200 border-b border-gray-100/50 last:border-0",
        !notification.is_read && "bg-violet-50/50"
      )}
    >
      <div className="flex gap-3">
        <GradientIcon
          icon={config.icon}
          color={config.color}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm leading-snug",
            !notification.is_read ? "font-medium text-foreground" : "text-muted-foreground"
          )}>
            {notification.title}
            {projectName && (
              <span className="text-violet-600 font-medium"> on {projectName}</span>
            )}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {notification.project?.project_code && (
              <span className="text-[11px] font-medium text-violet-500">
                {notification.project.project_code}
              </span>
            )}
            <span className="text-[11px] text-muted-foreground/70">
              {formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
        {!notification.is_read && (
          <div className="size-2 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 mt-1.5 shrink-0 shadow-sm shadow-violet-400/50" />
        )}
      </div>
    </button>
  );
}
