"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { GlassCard } from "@/components/ui/ui-helpers";
import { AlertCircleIcon } from "lucide-react";
import type { ClientInsert, ClientUpdate } from "@/types/database";

interface ClientFormProps {
  initialData?: {
    id: string;
    company_name: string;
    contact_person: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    notes: string | null;
  };
}

export function ClientForm({ initialData }: ClientFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    company_name: initialData?.company_name || "",
    contact_person: initialData?.contact_person || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    address: initialData?.address || "",
    notes: initialData?.notes || "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();

      const clientData: ClientInsert = {
        company_name: formData.company_name,
        contact_person: formData.contact_person || null,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        notes: formData.notes || null,
      };

      if (isEditing) {
        const updateData: ClientUpdate = clientData;
        const { error } = await supabase
          .from("clients")
          .update(updateData)
          .eq("id", initialData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("clients")
          .insert(clientData);
        if (error) throw error;
      }

      router.push("/clients");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <GlassCard>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
              <AlertCircleIcon className="size-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="company_name">Company Name *</Label>
            <Input
              id="company_name"
              placeholder="e.g., ABC Furniture Co."
              value={formData.company_name}
              onChange={(e) => handleChange("company_name", e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {/* Contact Person & Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input
                id="contact_person"
                placeholder="e.g., John Smith"
                value={formData.contact_person}
                onChange={(e) => handleChange("contact_person", e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g., john@company.com"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              placeholder="e.g., +90 555 123 4567"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              placeholder="Full address..."
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
              disabled={isLoading}
              rows={2}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner className="size-4" />
                  {isEditing ? "Updating..." : "Creating..."}
                </>
              ) : isEditing ? (
                "Update Client"
              ) : (
                "Create Client"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </GlassCard>
  );
}
