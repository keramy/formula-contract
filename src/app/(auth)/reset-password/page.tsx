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
import { CheckCircle2Icon, AlertCircleIcon, ShieldAlertIcon } from "lucide-react";
import { updatePasswordAction } from "../actions";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsRateLimited(false);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      // Call server action (includes rate limiting)
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

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
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

      {/* Reset Password Card */}
      <GlassCard className="w-full">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-lg">Set new password</CardTitle>
          <CardDescription>
            {isSuccess
              ? "Your password has been updated"
              : "Enter your new password below"}
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

              {/* New Password Field */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={isLoading}
                />
              </div>

              {/* Confirm Password Field */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
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
                    Updating...
                  </>
                ) : (
                  "Update password"
                )}
              </Button>

              {/* Back to login */}
              <Link href="/login" className="text-center text-sm text-muted-foreground hover:text-orange-600 transition-colors">
                Back to sign in
              </Link>
            </form>
          )}
        </CardContent>
      </GlassCard>

      {/* Footer */}
      <p className="text-center text-sm text-muted-foreground">
        Project Management System for Formula Contract
      </p>
    </div>
  );
}
