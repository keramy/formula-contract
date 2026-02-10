"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { GlassCard } from "@/components/ui/ui-helpers";
import { CheckCircle2Icon, AlertCircleIcon, ShieldAlertIcon, EyeIcon, EyeOffIcon, SparklesIcon } from "lucide-react";
import { updatePasswordAction } from "@/lib/actions/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsRateLimited(false);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const result = await updatePasswordAction(password, false);

      if (!result.success) {
        setError(result.error || "Failed to update password");
        if (result.resetIn && result.remaining === 0) {
          setIsRateLimited(true);
        }
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);

      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
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
            <img src="/icons/icon-192x192.png" alt="Formula Contract" className="h-11 w-11 rounded-xl" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Account Recovery
              </p>
              <CardTitle className="mt-0.5 text-xl tracking-tight">Set new password</CardTitle>
            </div>
          </div>
          <CardDescription>
            {isSuccess ? "Your password has been updated" : "Create a new password for your account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                <CheckCircle2Icon className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Your password has been successfully updated. Redirecting to dashboard...
              </p>
            </div>
          ) : (
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
                <Label htmlFor="password" className="text-sm font-medium">New password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
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

              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={isLoading}
                  className="h-10"
                />
              </div>

              <Button
                type="submit"
                className="w-full mt-2 h-10 bg-primary hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Spinner className="size-4" />
                    Updating...
                  </>
                ) : (
                  "Update password"
                )}
              </Button>

              <Link href="/login" className="text-center text-sm text-muted-foreground hover:text-primary transition-colors">
                Back to sign in
              </Link>
            </form>
          )}
        </CardContent>
      </GlassCard>

      <p className="text-center text-xs text-muted-foreground">
        Formula Contract Project Management System
      </p>
    </div>
  );
}
