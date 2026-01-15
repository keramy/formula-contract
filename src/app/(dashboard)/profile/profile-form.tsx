"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GlassCard, GradientIcon, StatusBadge } from "@/components/ui/ui-helpers";
import { UserIcon, CheckIcon } from "lucide-react";
import { format } from "date-fns";

interface ProfileFormProps {
  userId: string;
  initialData: {
    name: string;
    email: string;
    phone: string;
    role: string;
    createdAt: string;
    lastLoginAt: string | null;
  };
}

type StatusVariant = "info" | "success" | "warning" | "default" | "danger";

const roleConfig: Record<string, { variant: StatusVariant; label: string }> = {
  admin: { variant: "danger", label: "Administrator" },
  pm: { variant: "info", label: "Project Manager" },
  production: { variant: "info", label: "Production" },
  procurement: { variant: "warning", label: "Procurement" },
  management: { variant: "default", label: "Management" },
  client: { variant: "success", label: "Client" },
};

export function ProfileForm({ userId, initialData }: ProfileFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState(initialData.name);
  const [phone, setPhone] = useState(initialData.phone);

  const hasChanges = name !== initialData.name || phone !== initialData.phone;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from("users")
        .update({
          name: name.trim(),
          phone: phone.trim() || null,
        })
        .eq("id", userId);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(true);
      router.refresh();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const config = roleConfig[initialData.role] || { variant: "default" as StatusVariant, label: initialData.role };

  return (
    <GlassCard>
      <CardHeader>
        <div className="flex items-center gap-2">
          <GradientIcon icon={<UserIcon className="size-4" />} color="coral" size="sm" />
          <CardTitle className="text-base">Profile Information</CardTitle>
        </div>
        <CardDescription>Update your personal information</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
              <CheckIcon className="size-4" />
              Profile updated successfully!
            </div>
          )}

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={initialData.email}
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed. Contact an administrator if needed.
            </p>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              disabled={isLoading}
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+90 555 123 4567"
              disabled={isLoading}
            />
          </div>

          {/* Role (read-only) */}
          <div className="space-y-2">
            <Label>Role</Label>
            <div>
              <StatusBadge variant={config.variant}>
                {config.label}
              </StatusBadge>
            </div>
            <p className="text-xs text-muted-foreground">
              Your role is assigned by an administrator.
            </p>
          </div>

          {/* Account Info */}
          <div className="pt-4 border-t space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium">Member since:</span>{" "}
              {format(new Date(initialData.createdAt), "MMMM d, yyyy")}
            </p>
            {initialData.lastLoginAt && (
              <p>
                <span className="font-medium">Last login:</span>{" "}
                {format(new Date(initialData.lastLoginAt), "MMMM d, yyyy 'at' h:mm a")}
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="pt-4">
            <Button
              type="submit"
              disabled={isLoading || !hasChanges}
              className="bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600"
            >
              {isLoading ? (
                <>
                  <Spinner className="size-4" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </GlassCard>
  );
}
