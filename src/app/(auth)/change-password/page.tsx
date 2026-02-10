"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { GlassCard } from "@/components/ui/ui-helpers";
import {
  CheckCircleIcon,
  AlertCircleIcon,
  EyeIcon,
  EyeOffIcon,
  InfoIcon,
  ShieldAlertIcon,
  SparklesIcon,
} from "lucide-react";
import { checkAuthStatusAction, updatePasswordAction } from "@/lib/actions/auth";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const status = await checkAuthStatusAction();

      if (!status.isAuthenticated) {
        router.push("/login");
        return;
      }

      if (!status.mustChangePassword) {
        router.push("/dashboard");
        return;
      }

      setUserEmail(status.email || null);
      setIsCheckingAuth(false);
    }

    checkAuth();
  }, [router]);

  const isPasswordValid =
    newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) && /[0-9]/.test(newPassword);

  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsRateLimited(false);

    if (!isPasswordValid) {
      setError("Please enter a valid password that meets all requirements");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const result = await updatePasswordAction(newPassword, true);

      if (!result.success) {
        setError(result.error || "Failed to update password");
        if (result.resetIn && result.remaining === 0) {
          setIsRateLimited(true);
        }
        setIsLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <Spinner className="size-8" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
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
                Security Setup
              </p>
              <CardTitle className="mt-0.5 text-xl tracking-tight">Change password</CardTitle>
            </div>
          </div>
          <CardDescription>
            {userEmail && <span className="block mb-1">Signed in as <strong>{userEmail}</strong></span>}
            Set a new password to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {error && (
              <div
                className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                  isRateLimited
                    ? "bg-amber-50 border border-amber-200 text-amber-700"
                    : "bg-rose-50 border border-rose-200 text-rose-700"
                }`}
              >
                {isRateLimited ? (
                  <ShieldAlertIcon className="size-4 shrink-0" />
                ) : (
                  <AlertCircleIcon className="size-4 shrink-0" />
                )}
                {error}
              </div>
            )}

            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm flex items-center gap-2">
              <InfoIcon className="size-4 shrink-0" />
              You are using a temporary password. Please create a new secure password.
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="newPassword" className="text-sm font-medium">New password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-10 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </Button>
              </div>

              <div className="space-y-1 text-xs">
                <div className={`flex items-center gap-1.5 ${newPassword.length >= 8 ? "text-green-600" : "text-muted-foreground"}`}>
                  <CheckCircleIcon className="size-3" />
                  At least 8 characters
                </div>
                <div className={`flex items-center gap-1.5 ${/[A-Z]/.test(newPassword) ? "text-green-600" : "text-muted-foreground"}`}>
                  <CheckCircleIcon className="size-3" />
                  One uppercase letter
                </div>
                <div className={`flex items-center gap-1.5 ${/[a-z]/.test(newPassword) ? "text-green-600" : "text-muted-foreground"}`}>
                  <CheckCircleIcon className="size-3" />
                  One lowercase letter
                </div>
                <div className={`flex items-center gap-1.5 ${/[0-9]/.test(newPassword) ? "text-green-600" : "text-muted-foreground"}`}>
                  <CheckCircleIcon className="size-3" />
                  One number
                </div>
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
                disabled={isLoading}
                className="h-10"
              />
              {confirmPassword.length > 0 && (
                <div className={`flex items-center gap-1.5 text-xs ${passwordsMatch ? "text-green-600" : "text-destructive"}`}>
                  {passwordsMatch ? (
                    <>
                      <CheckCircleIcon className="size-3" />
                      Passwords match
                    </>
                  ) : (
                    <>
                      <AlertCircleIcon className="size-3" />
                      Passwords do not match
                    </>
                  )}
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full mt-2 h-10 bg-primary hover:bg-primary/90"
              disabled={isLoading || !isPasswordValid || !passwordsMatch}
            >
              {isLoading ? (
                <>
                  <Spinner className="size-4" />
                  Updating password...
                </>
              ) : (
                "Set new password"
              )}
            </Button>
          </form>
        </CardContent>
      </GlassCard>

      <p className="text-center text-xs text-muted-foreground">Formula Contract Project Management System</p>
    </div>
  );
}
