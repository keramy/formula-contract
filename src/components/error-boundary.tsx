"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing
 * the entire application.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 *
 * With custom fallback:
 * ```tsx
 * <ErrorBoundary fallback={<MyErrorComponent />}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    console.error("[ErrorBoundary] Caught error:", error);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);

    // TODO: Send to error tracking service (e.g., Sentry) in production
    // if (process.env.NODE_ENV === 'production') {
    //   Sentry.captureException(error, { extra: errorInfo });
    // }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 text-center">
          <div className="rounded-full bg-destructive/10 p-3 mb-4">
            <AlertTriangleIcon className="size-6 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            An unexpected error occurred. Please try again or refresh the page.
          </p>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <pre className="text-xs text-left bg-muted p-3 rounded-md mb-4 max-w-lg overflow-auto">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={this.handleRetry}>
              <RefreshCwIcon className="size-4 mr-2" />
              Try again
            </Button>
            <Button variant="default" onClick={() => window.location.reload()}>
              Refresh page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
