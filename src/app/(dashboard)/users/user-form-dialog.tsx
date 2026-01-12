"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon, MailIcon, CopyIcon, CheckIcon, AlertCircleIcon } from "lucide-react";
import { inviteUser, updateUser } from "./actions";

interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  is_active: boolean;
}

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editUser: User | null;
}

const roles = [
  { value: "admin", label: "Admin" },
  { value: "pm", label: "Project Manager" },
  { value: "production", label: "Production" },
  { value: "procurement", label: "Procurement" },
  { value: "management", label: "Management" },
  { value: "client", label: "Client" },
];

export function UserFormDialog({ open, onOpenChange, editUser }: UserFormDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("pm");

  const isEditing = !!editUser;

  // Sync form with editUser
  useEffect(() => {
    if (open) {
      if (editUser) {
        setEmail(editUser.email);
        setName(editUser.name);
        setPhone(editUser.phone || "");
        setRole(editUser.role);
      } else {
        setEmail("");
        setName("");
        setPhone("");
        setRole("pm");
      }
      setError(null);
      setSuccess(false);
      setTempPassword(null);
      setEmailSent(false);
      setCopied(false);
    }
  }, [open, editUser]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!email.trim() || !name.trim()) {
      setError("Email and name are required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isEditing && editUser) {
        // Update existing user
        const result = await updateUser(editUser.id, {
          name: name.trim(),
          phone: phone.trim() || null,
          role,
        });

        if (!result.success) {
          setError(result.error || "Failed to update user");
          return;
        }

        handleClose();
        router.refresh();
      } else {
        // Invite new user
        const result = await inviteUser({
          email: email.trim().toLowerCase(),
          name: name.trim(),
          phone: phone.trim() || null,
          role,
        });

        if (!result.success) {
          setError(result.error || "Failed to invite user");
          return;
        }

        setSuccess(true);
        if (result.tempPassword) {
          setTempPassword(result.tempPassword);
        }
        setEmailSent(result.emailSent || false);
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to save user:", err);
      setError(err instanceof Error ? err.message : "Failed to save user");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit User" : "Add User"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update user details and role"
              : "Create a new user with a temporary password"}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-4 space-y-4">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckIcon className="size-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium">User Created!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {emailSent
                    ? <>An email with login details has been sent to <strong>{email}</strong></>
                    : <>Share the login credentials below with <strong>{email}</strong></>
                  }
                </p>
              </div>
            </div>

            {emailSent && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                <MailIcon className="size-4 shrink-0" />
                <p className="text-sm">Welcome email sent successfully!</p>
              </div>
            )}

            {!emailSent && tempPassword && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300">
                <AlertCircleIcon className="size-4 shrink-0" />
                <p className="text-sm">Email not configured. Please share credentials manually.</p>
              </div>
            )}

            {tempPassword && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="font-mono text-sm">{email}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Temporary Password</Label>
                  <div className="flex gap-2">
                    <Input
                      value={tempPassword}
                      readOnly
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(tempPassword);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                    >
                      {copied ? (
                        <CheckIcon className="size-4 text-green-600" />
                      ) : (
                        <CopyIcon className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  The user should change this password after first login.
                </p>
              </div>
            )}

            <div className="flex justify-center pt-2">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-2">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {!isEditing && (
                <Alert>
                  <InfoIcon className="size-4" />
                  <AlertDescription>
                    A temporary password will be generated. Share it with the user to let them log in.
                  </AlertDescription>
                </Alert>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isEditing}
                />
                {isEditing && (
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                )}
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+90 555 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading || !email.trim() || !name.trim()}>
                {isLoading && <Spinner className="size-4 mr-2" />}
                {isEditing ? "Save Changes" : "Create User"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
