"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { GlassCard } from "@/components/ui/ui-helpers";
import { AlertCircleIcon } from "lucide-react";
import { sanitizeText } from "@/lib/sanitize";
import type { ProjectStatus, Currency, ProjectInsert, ProjectUpdate } from "@/types/database";

interface Client {
  id: string;
  company_name: string;
}

interface ProjectFormProps {
  clients: Client[];
  initialData?: {
    id: string;
    project_code: string;
    name: string;
    description: string | null;
    client_id: string | null;
    status: string;
    installation_date: string | null;
    contract_value_manual: number | null;
    currency: string;
  };
}

export function ProjectForm({ clients, initialData }: ProjectFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    project_code: initialData?.project_code || "",
    name: initialData?.name || "",
    description: initialData?.description || "",
    client_id: initialData?.client_id || "",
    status: initialData?.status || "tender",
    installation_date: initialData?.installation_date || "",
    contract_value_manual: initialData?.contract_value_manual?.toString() || "",
    currency: initialData?.currency || "TRY",
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

      // Sanitize user inputs to prevent XSS
      const projectData: ProjectInsert = {
        project_code: sanitizeText(formData.project_code),
        name: sanitizeText(formData.name),
        description: formData.description ? sanitizeText(formData.description) : null,
        client_id: formData.client_id || null,
        status: formData.status as ProjectStatus,
        installation_date: formData.installation_date || null,
        contract_value_manual: formData.contract_value_manual
          ? parseFloat(formData.contract_value_manual)
          : null,
        currency: formData.currency as Currency,
      };

      if (isEditing) {
        const updateData: ProjectUpdate = projectData;
        const { error } = await supabase
          .from("projects")
          .update(updateData)
          .eq("id", initialData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("projects")
          .insert(projectData);
        if (error) throw error;
      }

      router.push("/projects");
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

          {/* Project Code & Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project_code">Project Code *</Label>
              <Input
                id="project_code"
                placeholder="e.g., PRJ-2024-001"
                value={formData.project_code}
                onChange={(e) => handleChange("project_code", e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Hotel Lobby Furniture"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the project..."
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>

          {/* Client & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">Client</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => handleChange("client_id", value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange("status", value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tender">Tender</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="not_awarded">Not Awarded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Installation Date & Contract Value */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="installation_date">Installation Date</Label>
              <Input
                id="installation_date"
                type="date"
                value={formData.installation_date}
                onChange={(e) => handleChange("installation_date", e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract_value_manual">Contract Value</Label>
              <Input
                id="contract_value_manual"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.contract_value_manual}
                onChange={(e) => handleChange("contract_value_manual", e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => handleChange("currency", value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">TRY - Turkish Lira</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                "Update Project"
              ) : (
                "Create Project"
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
