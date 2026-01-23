"use client";

import { useState, useEffect } from "react";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircleIcon, PencilIcon } from "lucide-react";
import { sanitizeText } from "@/lib/sanitize";
import { toast } from "sonner";
import type { ProjectStatus, Currency, ProjectUpdate } from "@/types/database";

interface Client {
  id: string;
  company_name: string;
}

interface ProjectData {
  id: string;
  project_code: string;
  name: string;
  description: string | null;
  client_id: string | null;
  status: string;
  installation_date: string | null;
  contract_value_manual: number | null;
  currency: string;
}

interface ProjectEditSheetProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectEditSheet({ projectId, open, onOpenChange }: ProjectEditSheetProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState({
    project_code: "",
    name: "",
    description: "",
    client_id: "",
    status: "tender",
    installation_date: "",
    contract_value_manual: "",
    currency: "TRY",
  });

  // Fetch project data and clients when sheet opens
  useEffect(() => {
    if (open && projectId) {
      fetchData();
    }
  }, [open, projectId]);

  const fetchData = async () => {
    setIsFetching(true);
    setError(null);
    const supabase = createClient();

    try {
      // Fetch project and clients in parallel
      const [projectResult, clientsResult] = await Promise.all([
        supabase
          .from("projects")
          .select("id, project_code, name, description, client_id, status, installation_date, contract_value_manual, currency")
          .eq("id", projectId)
          .single(),
        supabase
          .from("clients")
          .select("id, company_name")
          .eq("is_deleted", false)
          .order("company_name"),
      ]);

      if (projectResult.error) throw projectResult.error;

      const project = projectResult.data as ProjectData;
      setFormData({
        project_code: project.project_code || "",
        name: project.name || "",
        description: project.description || "",
        client_id: project.client_id || "",
        status: project.status || "tender",
        installation_date: project.installation_date || "",
        contract_value_manual: project.contract_value_manual?.toString() || "",
        currency: project.currency || "TRY",
      });

      setClients(clientsResult.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setIsFetching(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();

      const updateData: ProjectUpdate = {
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

      const { error } = await supabase
        .from("projects")
        .update(updateData)
        .eq("id", projectId);

      if (error) throw error;

      toast.success("Project updated successfully");
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-violet-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-100">
              <PencilIcon className="size-5 text-violet-600" />
            </div>
            <div>
              <SheetTitle className="text-lg">Edit Project</SheetTitle>
              <SheetDescription>
                Update project details
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {isFetching ? (
          <div className="flex items-center justify-center py-12 px-6">
            <Spinner className="size-6" />
            <span className="ml-2 text-muted-foreground">Loading project...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
                <AlertCircleIcon className="size-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Project Code & Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_project_code">Project Code *</Label>
                <Input
                  id="edit_project_code"
                  placeholder="e.g., PRJ-2024-001"
                  value={formData.project_code}
                  onChange={(e) => handleChange("project_code", e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_name">Project Name *</Label>
                <Input
                  id="edit_name"
                  placeholder="e.g., Hotel Lobby"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                placeholder="Brief description..."
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                disabled={isLoading}
                rows={2}
              />
            </div>

            {/* Client & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_client_id">Client</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => handleChange("client_id", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
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
                <Label htmlFor="edit_status">Status</Label>
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
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Installation Date */}
            <div className="space-y-2">
              <Label htmlFor="edit_installation_date">Installation Date</Label>
              <Input
                id="edit_installation_date"
                type="date"
                value={formData.installation_date}
                onChange={(e) => handleChange("installation_date", e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* Contract Value & Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_contract_value">Contract Value</Label>
                <Input
                  id="edit_contract_value"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.contract_value_manual}
                  onChange={(e) => handleChange("contract_value_manual", e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => handleChange("currency", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">TRY</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
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
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
