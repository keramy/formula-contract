"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { GlassCard } from "@/components/ui/ui-helpers";
import { ArrowLeftIcon, CheckCircle2Icon, AlertCircleIcon, ShieldAlertIcon } from "lucide-react";
import { requestPasswordResetAction } from "@/lib/actions/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsRateLimited(false);
    setIsLoading(true);

    try {
      // Call server action (includes rate limiting)
      const redirectUrl = `${window.location.origin}/auth/callback?next=/reset-password`;
      const result = await requestPasswordResetAction(email, redirectUrl);

      if (!result.success) {
        setError(result.error || "Failed to send reset link");
        if (result.resetIn && result.remaining === 0) {
          setIsRateLimited(true);
        }
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
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

      {/* Forgot Password Card */}
      <GlassCard className="w-full">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-lg">Reset password</CardTitle>
          <CardDescription>
            {isSuccess
              ? "Check your email for the reset link"
              : "Enter your email and we'll send you a reset link"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                <CheckCircle2Icon className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                We&apos;ve sent a password reset link to <strong className="text-foreground">{email}</strong>.
                Please check your inbox.
              </p>
              <Link href="/login" className="w-full">
                <Button variant="outline" className="w-full">
                  <ArrowLeftIcon className="size-4" />
                  Back to sign in
                </Button>
              </Link>
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

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full mt-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Spinner className="size-4" />
                    Sending...
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>

              {/* Back to login */}
              <Link href="/login" className="w-full">
                <Button variant="ghost" className="w-full text-muted-foreground">
                  <ArrowLeftIcon className="size-4" />
                  Back to sign in
                </Button>
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
