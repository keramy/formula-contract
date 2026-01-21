"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Input } from "./input";
import { PanelLeftIcon, SearchIcon, BellIcon, PlusIcon, TrendingUpIcon, TrendingDownIcon } from "lucide-react";
import { useSidebar } from "./sidebar";

// ============================================================================
// GLASS CARD - Card with glassmorphism effect
// ============================================================================

const glassCardVariants = cva(
  "overflow-hidden rounded-xl transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border-0 shadow-lg shadow-gray-200/50 bg-white/80 backdrop-blur",
        solid: "border shadow-sm bg-card",
        outline: "border-2 bg-transparent",
        gradient: "border-0 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur shadow-lg shadow-gray-200/50",
      },
      hover: {
        none: "",
        lift: "hover:shadow-xl hover:-translate-y-0.5",
        glow: "hover:shadow-xl hover:shadow-primary/10",
      },
    },
    defaultVariants: {
      variant: "default",
      hover: "none",
    },
  }
);

interface GlassCardProps
  extends React.ComponentProps<typeof Card>,
    VariantProps<typeof glassCardVariants> {}

function GlassCard({ className, variant, hover, ...props }: GlassCardProps) {
  return (
    <Card
      className={cn(glassCardVariants({ variant, hover }), className)}
      {...props}
    />
  );
}

// ============================================================================
// GRADIENT ICON - Icon with gradient background
// ============================================================================

const gradientIconVariants = cva(
  "flex items-center justify-center rounded-xl transition-all duration-200",
  {
    variants: {
      size: {
        xs: "p-1 size-6",
        sm: "p-1.5 size-8",
        default: "p-2 size-10",
        lg: "p-3 size-12",
        xl: "p-4 size-16",
      },
      color: {
        primary: "bg-gradient-to-br from-primary/10 to-violet-500/10 text-primary",
        coral: "bg-gradient-to-br from-orange-500/10 to-rose-500/10 text-orange-600",
        teal: "bg-gradient-to-br from-teal-500/10 to-cyan-500/10 text-teal-600",
        amber: "bg-gradient-to-br from-amber-500/10 to-orange-500/10 text-amber-600",
        violet: "bg-gradient-to-br from-violet-500/10 to-purple-500/10 text-violet-600",
        rose: "bg-gradient-to-br from-rose-500/10 to-pink-500/10 text-rose-600",
        emerald: "bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-600",
        blue: "bg-gradient-to-br from-blue-500/10 to-indigo-500/10 text-blue-600",
        gray: "bg-gradient-to-br from-gray-500/10 to-slate-500/10 text-gray-600",
        sky: "bg-gradient-to-br from-sky-500/10 to-blue-500/10 text-sky-600",
        slate: "bg-gradient-to-br from-slate-500/10 to-gray-500/10 text-slate-600",
      },
    },
    defaultVariants: {
      size: "default",
      color: "primary",
    },
  }
);

interface GradientIconProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "color">,
    VariantProps<typeof gradientIconVariants> {
  icon: React.ReactNode;
}

function GradientIcon({ className, size, color, icon, ...props }: GradientIconProps) {
  return (
    <div className={cn(gradientIconVariants({ size, color }), className)} {...props}>
      {icon}
    </div>
  );
}

// ============================================================================
// PAGE HEADER - Compact header with sidebar toggle and actions
// ============================================================================

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showNotifications?: boolean;
  notificationCount?: number;
  actions?: React.ReactNode;
  className?: string;
}

function PageHeader({
  title,
  subtitle,
  showSearch = false,
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  showNotifications = false,
  notificationCount = 0,
  actions,
  className,
}: PageHeaderProps) {
  const { toggleSidebar } = useSidebar();

  return (
    <div className={cn("flex items-center justify-between gap-4 mb-6", className)}>
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="size-9 shrink-0"
        >
          <PanelLeftIcon className="size-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {showSearch && (
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-9 w-64 bg-white/50"
            />
          </div>
        )}
        {showNotifications && (
          <Button variant="ghost" size="icon" className="relative">
            <BellIcon className="size-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 size-5 rounded-full bg-rose-500 text-xs text-white flex items-center justify-center">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </Button>
        )}
        {actions}
      </div>
    </div>
  );
}

// ============================================================================
// STAT CARD - Stats display with icon and trend
// ============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconColor?: VariantProps<typeof gradientIconVariants>["color"];
  trend?: {
    value: number;
    label?: string;
  };
  className?: string;
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconColor = "primary",
  trend,
  className,
}: StatCardProps) {
  const isPositiveTrend = trend && trend.value >= 0;

  return (
    <GlassCard className={className}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1">
                {isPositiveTrend ? (
                  <TrendingUpIcon className="size-4 text-emerald-600" />
                ) : (
                  <TrendingDownIcon className="size-4 text-rose-600" />
                )}
                <span
                  className={cn(
                    "text-sm font-medium",
                    isPositiveTrend ? "text-emerald-600" : "text-rose-600"
                  )}
                >
                  {isPositiveTrend && "+"}
                  {trend.value}%
                </span>
                {trend.label && (
                  <span className="text-sm text-muted-foreground">
                    {trend.label}
                  </span>
                )}
              </div>
            )}
          </div>
          <GradientIcon icon={icon} color={iconColor} />
        </div>
      </CardContent>
    </GlassCard>
  );
}

// ============================================================================
// STATUS BADGE - Colored status indicators
// ============================================================================

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-gray-700",
        primary: "bg-primary/10 text-primary",
        success: "bg-emerald-100 text-emerald-700",
        warning: "bg-amber-100 text-amber-700",
        danger: "bg-rose-100 text-rose-700",
        info: "bg-blue-100 text-blue-700",
        coral: "bg-orange-100 text-orange-700",
        teal: "bg-teal-100 text-teal-700",
        violet: "bg-violet-100 text-violet-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  dot?: boolean;
}

function StatusBadge({ className, variant, dot, children, ...props }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            "size-1.5 rounded-full",
            variant === "success" && "bg-emerald-500",
            variant === "warning" && "bg-amber-500",
            variant === "danger" && "bg-rose-500",
            variant === "info" && "bg-blue-500",
            variant === "coral" && "bg-orange-500",
            variant === "teal" && "bg-teal-500",
            variant === "violet" && "bg-violet-500",
            variant === "primary" && "bg-primary",
            (!variant || variant === "default") && "bg-gray-500"
          )}
        />
      )}
      {children}
    </span>
  );
}

// ============================================================================
// AVATAR WITH GRADIENT - Avatar with gradient border/background
// ============================================================================

const avatarColors = [
  "from-rose-400 to-orange-400",
  "from-violet-400 to-purple-400",
  "from-teal-400 to-cyan-400",
  "from-amber-400 to-yellow-400",
  "from-emerald-400 to-teal-400",
  "from-blue-400 to-indigo-400",
  "from-pink-400 to-rose-400",
  "from-orange-400 to-amber-400",
] as const;

interface GradientAvatarProps {
  name: string;
  image?: string | null;
  size?: "sm" | "default" | "lg" | "xl";
  colorIndex?: number;
  className?: string;
}

function GradientAvatar({ name, image, size = "default", colorIndex, className }: GradientAvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const color = avatarColors[colorIndex ?? (name.charCodeAt(0) % avatarColors.length)];

  const sizeClasses = {
    sm: "size-8 text-xs",
    default: "size-10 text-sm",
    lg: "size-12 text-base",
    xl: "size-16 text-lg",
  };

  return (
    <div
      className={cn(
        "relative rounded-full flex items-center justify-center font-medium text-white bg-gradient-to-br",
        color,
        sizeClasses[size],
        className
      )}
    >
      {image ? (
        <img
          src={image}
          alt={name}
          className="absolute inset-0 rounded-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );
}

// ============================================================================
// SECTION HEADER - Section title with optional action
// ============================================================================

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

function SectionHeader({ title, description, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

// ============================================================================
// EMPTY STATE - Placeholder for empty content
// ============================================================================

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
      <GradientIcon icon={icon} size="xl" color="gray" className="mb-4" />
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>
      )}
      {action}
    </div>
  );
}

export {
  GlassCard,
  glassCardVariants,
  GradientIcon,
  gradientIconVariants,
  PageHeader,
  StatCard,
  StatusBadge,
  statusBadgeVariants,
  GradientAvatar,
  avatarColors,
  SectionHeader,
  EmptyState,
};
