"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { GlassCard } from "@/components/ui/ui-helpers";
import { ArrowLeftIcon, CheckCircle2Icon, AlertCircleIcon, ShieldAlertIcon, SparklesIcon } from "lucide-react";
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
            <Image src="/icons/icon-192x192.png" alt="Formula Contract" width={44} height={44} className="h-11 w-11 rounded-xl" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Account Recovery
              </p>
              <CardTitle className="mt-0.5 text-xl tracking-tight">Reset password</CardTitle>
            </div>
          </div>
          <CardDescription>
            {isSuccess
              ? "Check your email for the reset link"
              : "Enter your email and we will send you a reset link."}
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
                <Button variant="outline" className="w-full h-10">
                  <ArrowLeftIcon className="size-4" />
                  Back to sign in
                </Button>
              </Link>
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

              <Button
                type="submit"
                className="w-full mt-2 h-10 bg-primary hover:bg-primary/90"
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

              <Link href="/login" className="w-full">
                <Button variant="ghost" className="w-full h-10 text-muted-foreground">
                  <ArrowLeftIcon className="size-4" />
                  Back to sign in
                </Button>
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
