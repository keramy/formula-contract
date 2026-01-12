"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle2Icon, PartyPopperIcon } from "lucide-react";

export default function SetupPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

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
      const supabase = createClient();

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        setIsLoading(false);
        return;
      }

      // Get current user and activate their account
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("users")
          .update({ is_active: true, last_login_at: new Date().toISOString() })
          .eq("id", user.id);
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
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground font-bold text-xl">
          FC
        </div>
        <h1 className="text-xl font-semibold text-foreground">Formula Contract</h1>
      </div>

      {/* Setup Password Card */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-lg">
            {isSuccess ? "You're all set!" : "Welcome to the team!"}
          </CardTitle>
          <CardDescription>
            {isSuccess
              ? "Your account is ready to use"
              : "Set up your password to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-success/10">
                <CheckCircle2Icon className="w-6 h-6 text-success" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Your password has been set successfully. Redirecting to dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Welcome Message */}
              <div className="flex items-center gap-3 p-3 rounded-md bg-primary/5 border border-primary/10">
                <PartyPopperIcon className="size-5 text-primary shrink-0" />
                <p className="text-sm text-muted-foreground">
                  You&apos;ve been invited to join Formula Contract. Create a password to activate your account.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              {/* Password Field */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters
                </p>
              </div>

              {/* Confirm Password Field */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={isLoading}
                />
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full mt-2" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Spinner className="size-4" />
                    Setting up...
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-center text-sm text-muted-foreground">
        Project Management System for Formula Contract
      </p>
    </div>
  );
}
