"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { GlassCard } from "@/components/ui/ui-helpers";
import { CheckCircleIcon, AlertCircleIcon, EyeIcon, EyeOffIcon, InfoIcon, ShieldAlertIcon } from "lucide-react";
import { checkAuthStatusAction, updatePasswordAction } from "../actions";

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

  // Check if user is authenticated and needs to change password
  useEffect(() => {
    async function checkAuth() {
      const status = await checkAuthStatusAction();

      if (!status.isAuthenticated) {
        router.push("/login");
        return;
      }

      // Check if user actually needs to change password
      if (!status.mustChangePassword) {
        // User doesn't need to change password, redirect to dashboard
        router.push("/dashboard");
        return;
      }

      setUserEmail(status.email || null);
      setIsCheckingAuth(false);
    }

    checkAuth();
  }, [router]);

  // Password validation
  const passwordErrors = [];
  if (newPassword.length > 0 && newPassword.length < 8) {
    passwordErrors.push("Password must be at least 8 characters");
  }
  if (newPassword.length > 0 && !/[A-Z]/.test(newPassword)) {
    passwordErrors.push("Password must contain at least one uppercase letter");
  }
  if (newPassword.length > 0 && !/[a-z]/.test(newPassword)) {
    passwordErrors.push("Password must contain at least one lowercase letter");
  }
  if (newPassword.length > 0 && !/[0-9]/.test(newPassword)) {
    passwordErrors.push("Password must contain at least one number");
  }

  const isPasswordValid = newPassword.length >= 8 &&
    /[A-Z]/.test(newPassword) &&
    /[a-z]/.test(newPassword) &&
    /[0-9]/.test(newPassword);

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
      // Call server action (includes rate limiting)
      const result = await updatePasswordAction(newPassword, true);

      if (!result.success) {
        setError(result.error || "Failed to update password");
        if (result.resetIn && result.remaining === 0) {
          setIsRateLimited(true);
        }
        setIsLoading(false);
        return;
      }

      // Success - redirect to dashboard
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

      {/* Change Password Card */}
      <GlassCard className="w-full">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-lg">Change Your Password</CardTitle>
          <CardDescription>
            {userEmail && (
              <span className="block mb-1">Logged in as <strong>{userEmail}</strong></span>
            )}
            Please set a new password to continue
          </CardDescription>
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

            {/* Info Alert */}
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm flex items-center gap-2">
              <InfoIcon className="size-4 shrink-0" />
              You are using a temporary password. Please create a new secure password.
            </div>

            {/* New Password Field */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOffIcon className="size-4 text-muted-foreground" />
                  ) : (
                    <EyeIcon className="size-4 text-muted-foreground" />
                  )}
                </Button>
              </div>

              {/* Password Requirements */}
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

            {/* Confirm Password Field */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
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

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full mt-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600"
              disabled={isLoading || !isPasswordValid || !passwordsMatch}
            >
              {isLoading ? (
                <>
                  <Spinner className="size-4" />
                  Updating password...
                </>
              ) : (
                "Set New Password"
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
