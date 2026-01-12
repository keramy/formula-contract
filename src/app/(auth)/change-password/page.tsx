"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircleIcon, AlertCircleIcon, EyeIcon, EyeOffIcon } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Check if user is authenticated and needs to change password
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Check if user actually needs to change password
      const mustChangePassword = user.user_metadata?.must_change_password;
      if (!mustChangePassword) {
        // User doesn't need to change password, redirect to dashboard
        router.push("/dashboard");
        return;
      }

      setUserEmail(user.email || null);
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
      const supabase = createClient();

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          must_change_password: false, // Clear the flag
        },
      });

      if (updateError) {
        setError(updateError.message);
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
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground font-bold text-xl">
          FC
        </div>
        <h1 className="text-xl font-semibold text-foreground">Formula Contract</h1>
      </div>

      {/* Change Password Card */}
      <Card className="border-border/50 shadow-sm">
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
              <Alert variant="destructive">
                <AlertCircleIcon className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Info Alert */}
            <Alert>
              <AlertCircleIcon className="size-4" />
              <AlertDescription>
                You are using a temporary password. Please create a new secure password.
              </AlertDescription>
            </Alert>

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
              className="w-full mt-2"
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
      </Card>

      {/* Footer */}
      <p className="text-center text-sm text-muted-foreground">
        Project Management System for Formula Contract
      </p>
    </div>
  );
}
