"use client";

import * as React from "react";
import Image from "next/image";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react";

// ============================================================================
// GLASS CARD - Card with glassmorphism effect
// ============================================================================

const glassCardVariants = cva(
  "overflow-hidden rounded-xl transition-all duration-200",
  {
    variants: {
      variant: {
        // Default: Clean border, no shadow (per design handbook)
        default: "border border-base-200 bg-card",
        // Elevated: For dropdowns, popovers that float above content
        elevated: "border border-base-200 bg-card shadow-md",
        // Subtle: Very light background for nested cards
        subtle: "border border-base-100 bg-base-50/50",
        // Outline: Stronger border, transparent background
        outline: "border-2 border-base-200 bg-transparent",
      },
      hover: {
        none: "",
        // Subtle border color change on hover
        subtle: "hover:border-base-300",
        // Primary accent on hover (for clickable cards)
        primary: "hover:border-primary/30 hover:bg-primary/[0.02]",
      },
    },
    defaultVariants: {
      variant: "default",
      hover: "none",
    },
  }
);

interface GlassCardProps
  extends Omit<React.ComponentProps<typeof Card>, "hover" | "shadow">,
    VariantProps<typeof glassCardVariants> {}

function GlassCard({ className, variant, hover, ...props }: GlassCardProps) {
  return (
    <Card
      className={cn(glassCardVariants({ variant, hover }), className)}
      hover="none" // GlassCard manages its own hover through glassCardVariants
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
        primary: "bg-primary-100 text-primary-700",
        coral: "bg-orange-100 text-orange-600",
        teal: "bg-primary-100 text-primary-700",
        amber: "bg-amber-100 text-amber-600",
        violet: "bg-violet-100 text-violet-600",
        rose: "bg-rose-100 text-rose-600",
        emerald: "bg-emerald-100 text-emerald-600",
        blue: "bg-blue-100 text-blue-600",
        gray: "bg-base-100 text-base-600",
        sky: "bg-sky-100 text-sky-600",
        slate: "bg-secondary-100 text-secondary-600",
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
  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
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

const statusDotColors: Record<string, string> = {
  default: "bg-gray-500",
  primary: "bg-primary",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  info: "bg-blue-500",
  coral: "bg-orange-500",
  teal: "bg-teal-500",
  violet: "bg-violet-500",
};

interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  dot?: boolean;
}

function StatusBadge({ className, variant, dot, children, ...props }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span className={cn("size-1.5 rounded-full", statusDotColors[variant || "default"])} />
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
        <Image
          src={image}
          alt={name}
          fill
          unoptimized
          sizes="40px"
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
  StatCard,
  StatusBadge,
  statusBadgeVariants,
  GradientAvatar,
  avatarColors,
  SectionHeader,
  EmptyState,
};
