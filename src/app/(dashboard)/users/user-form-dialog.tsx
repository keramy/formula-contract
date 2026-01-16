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
import { GradientIcon } from "@/components/ui/ui-helpers";
import { InfoIcon, MailIcon, CopyIcon, CheckIcon, AlertCircleIcon, UserPlusIcon, UserIcon } from "lucide-react";
import { inviteUser, updateUser } from "@/lib/actions/users";

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
          <div className="flex items-center gap-2">
            <GradientIcon
              icon={isEditing ? <UserIcon className="size-4" /> : <UserPlusIcon className="size-4" />}
              color="violet"
              size="sm"
            />
            <DialogTitle>{isEditing ? "Edit User" : "Add User"}</DialogTitle>
          </div>
          <DialogDescription>
            {isEditing
              ? "Update user details and role"
              : "Create a new user with a temporary password"}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-4 space-y-4">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                <CheckIcon className="size-6 text-emerald-600" />
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
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
                <MailIcon className="size-4 shrink-0" />
                <p className="text-sm">Welcome email sent successfully!</p>
              </div>
            )}

            {!emailSent && tempPassword && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
                <AlertCircleIcon className="size-4 shrink-0" />
                <p className="text-sm">Email not configured. Please share credentials manually.</p>
              </div>
            )}

            {tempPassword && (
              <div className="space-y-3 p-4 bg-gray-50/80 rounded-lg border">
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
                      className="font-mono bg-white"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(tempPassword);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="hover:bg-violet-50 hover:border-violet-200"
                    >
                      {copied ? (
                        <CheckIcon className="size-4 text-emerald-600" />
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
              <Button
                onClick={handleClose}
                className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-2">
              {error && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
                  <AlertCircleIcon className="size-4 shrink-0" />
                  {error}
                </div>
              )}

              {!isEditing && (
                <div className="p-3 rounded-lg bg-violet-50 border border-violet-200 text-violet-700 text-sm flex items-center gap-2">
                  <InfoIcon className="size-4 shrink-0" />
                  A temporary password will be generated. Share it with the user to let them log in.
                </div>
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
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !email.trim() || !name.trim()}
                className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
              >
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
