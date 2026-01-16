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
import { AlertCircleIcon, ShieldAlertIcon } from "lucide-react";
import { loginAction } from "@/lib/actions/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="flex flex-col gap-8">
      {/* Logo */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-white font-bold text-xl shadow-lg shadow-orange-500/30">
          FC
        </div>
        <h1 className="text-xl font-semibold bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent">
          Formula Contract
        </h1>
      </div>

      {/* Login Card */}
      <GlassCard className="w-full">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-lg">Welcome back</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Error Message */}
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

            {/* Email Field */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full mt-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600"
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

      {/* Footer */}
      <p className="text-center text-sm text-muted-foreground">
        Project Management System for Formula Contract
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center gap-8">
        <FormulaLoader />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
