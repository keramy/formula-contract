"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { GlassCard, GradientIcon } from "@/components/ui/ui-helpers";
import { KeyIcon, CheckCircleIcon, AlertCircleIcon, EyeIcon, EyeOffIcon } from "lucide-react";

export function ChangePasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Password validation
  const isPasswordValid = newPassword.length >= 8 &&
    /[A-Z]/.test(newPassword) &&
    /[a-z]/.test(newPassword) &&
    /[0-9]/.test(newPassword);

  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const canSubmit = currentPassword.length > 0 && isPasswordValid && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!currentPassword) {
      setError("Please enter your current password");
      return;
    }

    if (!isPasswordValid) {
      setError("New password does not meet requirements");
      return;
    }

    if (!passwordsMatch) {
      setError("New passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      // First verify current password by signing in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setError("Unable to verify user");
        setIsLoading(false);
        return;
      }

      // Try to sign in with current password to verify it
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        setError("Current password is incorrect");
        setIsLoading(false);
        return;
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        setIsLoading(false);
        return;
      }

      // Success
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GlassCard>
      <CardHeader>
        <div className="flex items-center gap-2">
          <GradientIcon icon={<KeyIcon className="size-4" />} color="amber" size="sm" />
          <CardTitle className="text-base">Change Password</CardTitle>
        </div>
        <CardDescription>Update your password to keep your account secure</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
              <AlertCircleIcon className="size-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
              <CheckCircleIcon className="size-4" />
              Password changed successfully!
            </div>
          )}

          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                disabled={isLoading}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPasswords(!showPasswords)}
              >
                {showPasswords ? (
                  <EyeOffIcon className="size-4 text-muted-foreground" />
                ) : (
                  <EyeIcon className="size-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type={showPasswords ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              disabled={isLoading}
            />

            {/* Password Requirements */}
            {newPassword.length > 0 && (
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
            )}
          </div>

          {/* Confirm New Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type={showPasswords ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
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

          {/* Submit */}
          <div className="pt-4">
            <Button type="submit" disabled={isLoading || !canSubmit}>
              {isLoading ? (
                <>
                  <Spinner className="size-4" />
                  Updating...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </GlassCard>
  );
}
