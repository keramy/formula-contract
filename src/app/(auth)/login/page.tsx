"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { FormulaLoader } from "@/components/ui/formula-loader";
import { GlassCard } from "@/components/ui/ui-helpers";
import { AlertCircleIcon, EyeIcon, EyeOffIcon, ShieldAlertIcon, SparklesIcon } from "lucide-react";
import { loginAction } from "@/lib/actions/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);

  // Check for error query parameter
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "account_deactivated") {
      setError("Your account has been deactivated. Please contact an administrator.");
    } else if (errorParam === "auth_callback_error") {
      setError("Authentication failed. Please try again.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsRateLimited(false);
    setIsLoading(true);

    try {
      // Call server action (includes rate limiting)
      const result = await loginAction(email, password);

      if (!result.success) {
        setError(result.error || "Login failed");
        // Check if it's a rate limit error
        if (result.resetIn && result.remaining === 0) {
          setIsRateLimited(true);
        }
        setIsLoading(false);
        return;
      }

      // Check if user needs to change password
      if (result.mustChangePassword) {
        router.push("/change-password");
        router.refresh();
        return;
      }

      // Successful login - redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="pointer-events-none absolute -top-6 -left-4 h-24 w-24 rounded-full bg-primary/15 blur-2xl" />
      <div className="pointer-events-none absolute -right-6 top-20 h-20 w-20 rounded-full bg-orange-500/10 blur-2xl" />

      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-base-200 bg-card px-3 py-1.5 shadow-xs">
          <SparklesIcon className="size-3.5 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Formula Contract</span>
        </div>
      </div>

      <GlassCard className="w-full border-base-200/80 shadow-sm">
        <CardHeader className="space-y-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 text-white font-bold text-sm shadow-sm">
              FC
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Formula Contract
              </p>
              <CardTitle className="mt-0.5 text-xl tracking-tight">Welcome back</CardTitle>
            </div>
          </div>
          <CardDescription>
            Sign in to continue to your project operations dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {error && (
              <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                isRateLimited
                  ? "bg-amber-50 border border-amber-200 text-amber-700"
                  : "bg-rose-50 border border-rose-200 text-rose-700"
              }`}>
                {isRateLimited ? (
                  <ShieldAlertIcon className="size-4 shrink-0" />
                ) : (
                  <AlertCircleIcon className="size-4 shrink-0" />
                )}
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-sm font-medium">Work email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={isLoading}
                className="h-10"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                    Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="h-10 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-2 h-10 bg-primary hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner className="size-4" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>

          </form>
        </CardContent>
      </GlassCard>

      <p className="text-center text-xs text-muted-foreground">
        Formula Contract Project Management System
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center gap-6">
        <FormulaLoader />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
