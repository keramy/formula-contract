"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

const roleLabels: Record<string, string> = {
  admin: "Administrator",
  pm: "Project Manager",
  production: "Production",
  procurement: "Procurement",
  management: "Management",
  client: "Client",
};

const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  pm: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  production: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  procurement: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  management: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  client: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserIcon className="size-5 text-muted-foreground" />
          <CardTitle>Profile Information</CardTitle>
        </div>
        <CardDescription>Update your personal information</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
              <CheckIcon className="size-4" />
              <AlertDescription>Profile updated successfully!</AlertDescription>
            </Alert>
          )}

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={initialData.email}
              disabled
              className="bg-muted"
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
              <Badge variant="secondary" className={roleColors[initialData.role]}>
                {roleLabels[initialData.role] || initialData.role}
              </Badge>
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
            <Button type="submit" disabled={isLoading || !hasChanges}>
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
    </Card>
  );
}
