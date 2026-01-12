"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BellIcon,
  CheckIcon,
  FileIcon,
  PackageIcon,
  FolderIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  type Notification,
} from "@/lib/notifications/actions";

const typeIcons: Record<string, React.ReactNode> = {
  drawing_approved: <CheckCircleIcon className="size-4 text-green-500" />,
  drawing_rejected: <AlertCircleIcon className="size-4 text-red-500" />,
  drawing_uploaded: <FileIcon className="size-4 text-blue-500" />,
  drawing_sent: <ClockIcon className="size-4 text-yellow-500" />,
  material_approved: <CheckCircleIcon className="size-4 text-green-500" />,
  material_rejected: <AlertCircleIcon className="size-4 text-red-500" />,
  project_assigned: <FolderIcon className="size-4 text-purple-500" />,
  milestone_due: <ClockIcon className="size-4 text-orange-500" />,
  default: <BellIcon className="size-4 text-muted-foreground" />,
};

export function NotificationsDropdown() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  // Initial load of unread count
  useEffect(() => {
    loadUnreadCount();
    // Refresh count every minute
    const interval = setInterval(loadUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    setIsLoading(true);
    const data = await getNotifications(20);
    setNotifications(data);
    setIsLoading(false);
  };

  const loadUnreadCount = async () => {
    const count = await getUnreadCount();
    setUnreadCount(count);
  };

  const handleMarkAsRead = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    // Navigate to relevant page if there's a link
    if (notification.project_id) {
      if (notification.item_id) {
        router.push(`/projects/${notification.project_id}/scope/${notification.item_id}`);
      } else {
        router.push(`/projects/${notification.project_id}`);
      }
      setIsOpen(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const getIcon = (type: string) => {
    return typeIcons[type] || typeIcons.default;
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <BellIcon className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 size-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs"
              onClick={handleMarkAllAsRead}
            >
              <CheckIcon className="size-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BellIcon className="size-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="py-1">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleMarkAsRead(notification)}
                  className={`w-full text-left px-3 py-2 hover:bg-muted transition-colors ${
                    !notification.is_read ? "bg-muted/50" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5">{getIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.is_read ? "font-medium" : ""}`}>
                        {notification.title}
                      </p>
                      {notification.message && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {notification.project && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {notification.project.project_code}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                    {!notification.is_read && (
                      <div className="size-2 rounded-full bg-primary mt-2" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
