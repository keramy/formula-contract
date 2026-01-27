"use client";

import { useState, useEffect } from "react";
import { getNextProjectCode } from "@/lib/actions/projects";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardContent } from "@/components/ui/card";
import { GlassCard, StatusBadge } from "@/components/ui/ui-helpers";
import { Badge } from "@/components/ui/badge";
import {
  FormWizard,
  WizardStep,
  WizardStepIndicator,
  WizardNavigation,
  useWizard,
} from "@/components/ui/form-wizard";
import { toast } from "sonner";
import {
  AlertCircleIcon,
  FolderIcon,
  BuildingIcon,
  UsersIcon,
  CheckCircleIcon,
  PlusIcon,
} from "lucide-react";
import { sanitizeText } from "@/lib/sanitize";
import type { ProjectStatus, Currency, ProjectInsert } from "@/types/database";

interface Client {
  id: string;
  company_name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ProjectWizardProps {
  clients: Client[];
  users: User[];
}

const STEPS = [
  { title: "Project Details", description: "Basic information" },
  { title: "Client", description: "Select or create client" },
  { title: "Team", description: "Assign team members" },
  { title: "Review", description: "Confirm and create" },
];

export function ProjectWizard({ clients, users }: ProjectWizardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingCode, setIsLoadingCode] = useState(true);

  // Form data
  const [formData, setFormData] = useState({
    project_code: "",
    name: "",
    description: "",
    status: "tender",
    currency: "TRY",
    installation_date: "",
    contract_value_manual: "",
  });

  // Auto-fetch next project code on mount
  useEffect(() => {
    async function fetchNextCode() {
      try {
        const nextCode = await getNextProjectCode();
        setFormData(prev => ({ ...prev, project_code: nextCode }));
      } catch (err) {
        console.error("Failed to fetch next project code:", err);
      } finally {
        setIsLoadingCode(false);
      }
    }
    fetchNextCode();
  }, []);

  // Client selection
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [newClientData, setNewClientData] = useState({
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
  });

  // Team assignment
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNewClientChange = (field: string, value: string) => {
    setNewClientData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();

      // If creating new client, do that first
      // Handle "none" value as no client selected
      let clientId = (selectedClientId && selectedClientId !== "none") ? selectedClientId : null;

      if (clientMode === "new" && newClientData.company_name) {
        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert({
            company_name: sanitizeText(newClientData.company_name),
            contact_person: newClientData.contact_person
              ? sanitizeText(newClientData.contact_person)
              : null,
            email: newClientData.email || null,
            phone: newClientData.phone || null,
          })
          .select("id")
          .single();

        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      // Create project
      const projectData: ProjectInsert = {
        project_code: sanitizeText(formData.project_code),
        name: sanitizeText(formData.name),
        description: formData.description ? sanitizeText(formData.description) : null,
        client_id: clientId,
        status: formData.status as ProjectStatus,
        installation_date: formData.installation_date || null,
        contract_value_manual: formData.contract_value_manual
          ? parseFloat(formData.contract_value_manual)
          : null,
        currency: formData.currency as Currency,
      };

      const { data: newProject, error: projectError } = await supabase
        .from("projects")
        .insert(projectData)
        .select("id")
        .single();

      if (projectError) throw projectError;

      // Assign team members
      if (selectedUserIds.length > 0) {
        const assignments = selectedUserIds.map((userId) => ({
          project_id: newProject.id,
          user_id: userId,
        }));

        const { error: assignmentError } = await supabase
          .from("project_assignments")
          .insert(assignments);

        if (assignmentError) {
          console.error("Failed to assign team members:", assignmentError);
          // Don't throw - project was created successfully
        }
      }

      toast.success("Project created successfully!");
      router.push(`/projects/${newProject.id}`);
      router.refresh();
    } catch (err) {
      console.error("Project creation error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  // Filter users to show only PMs and admins for team assignment
  const assignableUsers = users.filter((u) =>
    ["admin", "pm", "production", "procurement", "management"].includes(u.role)
  );

  return (
    <FormWizard totalSteps={4}>
      <WizardStepIndicator steps={STEPS} allowNavigation />

      <GlassCard>
        <CardContent className="pt-6">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2 mb-6">
              <AlertCircleIcon className="size-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Step 1: Project Details */}
          <WizardStep step={0}>
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-md bg-violet-100">
                  <FolderIcon className="size-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Project Details</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter the basic project information
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="project_code">Project Code *</Label>
                    <span className="text-xs text-muted-foreground">Auto-generated</span>
                  </div>
                  <Input
                    id="project_code"
                    placeholder={isLoadingCode ? "Loading..." : "e.g., 2605"}
                    value={formData.project_code}
                    onChange={(e) => handleChange("project_code", e.target.value)}
                    required
                    disabled={isLoadingCode}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Sequential number assigned automatically. You can modify if needed.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Hotel Lobby Furniture"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the project..."
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleChange("status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tender">Tender</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => handleChange("currency", value)}
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
                <div className="space-y-2">
                  <Label htmlFor="installation_date">Installation Date</Label>
                  <Input
                    id="installation_date"
                    type="date"
                    value={formData.installation_date}
                    onChange={(e) => handleChange("installation_date", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2 max-w-xs">
                <Label htmlFor="contract_value_manual">Contract Value</Label>
                <Input
                  id="contract_value_manual"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.contract_value_manual}
                  onChange={(e) => handleChange("contract_value_manual", e.target.value)}
                />
              </div>
            </div>
          </WizardStep>

          {/* Step 2: Client Selection */}
          <WizardStep step={1}>
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-md bg-teal-100">
                  <BuildingIcon className="size-5 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Client Selection</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose an existing client or create a new one
                  </p>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={clientMode === "existing" ? "default" : "outline"}
                  onClick={() => setClientMode("existing")}
                >
                  Existing Client
                </Button>
                <Button
                  type="button"
                  variant={clientMode === "new" ? "default" : "outline"}
                  onClick={() => setClientMode("new")}
                >
                  <PlusIcon className="size-4 mr-1" />
                  New Client
                </Button>
              </div>

              {clientMode === "existing" ? (
                <div className="space-y-2">
                  <Label htmlFor="client_id">Select Client</Label>
                  <Select
                    value={selectedClientId}
                    onValueChange={setSelectedClientId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No client</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_name">Company Name *</Label>
                      <Input
                        id="company_name"
                        placeholder="e.g., Acme Hotels"
                        value={newClientData.company_name}
                        onChange={(e) =>
                          handleNewClientChange("company_name", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_person">Contact Person</Label>
                      <Input
                        id="contact_person"
                        placeholder="e.g., John Smith"
                        value={newClientData.contact_person}
                        onChange={(e) =>
                          handleNewClientChange("contact_person", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="contact@company.com"
                        value={newClientData.email}
                        onChange={(e) =>
                          handleNewClientChange("email", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        placeholder="+1 234 567 8900"
                        value={newClientData.phone}
                        onChange={(e) =>
                          handleNewClientChange("phone", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </WizardStep>

          {/* Step 3: Team Assignment */}
          <WizardStep step={2}>
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-md bg-coral-100 bg-orange-100">
                  <UsersIcon className="size-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Team Assignment</h3>
                  <p className="text-sm text-muted-foreground">
                    Select team members to assign to this project
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {assignableUsers.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    No team members available to assign
                  </p>
                ) : (
                  assignableUsers.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedUserIds.includes(user.id)}
                        onCheckedChange={() => toggleUserSelection(user.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {user.role}
                      </Badge>
                    </label>
                  ))
                )}
              </div>

              {selectedUserIds.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedUserIds.length} team member
                  {selectedUserIds.length > 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          </WizardStep>

          {/* Step 4: Review */}
          <WizardStep step={3}>
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-md bg-green-100">
                  <CheckCircleIcon className="size-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Review & Create</h3>
                  <p className="text-sm text-muted-foreground">
                    Review the project details before creating
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Project Info */}
                <div className="p-4 rounded-lg border bg-gray-50">
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <FolderIcon className="size-4" />
                    Project Details
                  </h4>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">Code:</dt>
                    <dd className="font-medium">{formData.project_code || "—"}</dd>
                    <dt className="text-muted-foreground">Name:</dt>
                    <dd className="font-medium">{formData.name || "—"}</dd>
                    <dt className="text-muted-foreground">Status:</dt>
                    <dd>
                      <StatusBadge
                        variant={
                          formData.status === "active"
                            ? "success"
                            : formData.status === "tender"
                            ? "info"
                            : "warning"
                        }
                      >
                        {formData.status}
                      </StatusBadge>
                    </dd>
                    <dt className="text-muted-foreground">Currency:</dt>
                    <dd>{formData.currency}</dd>
                    {formData.installation_date && (
                      <>
                        <dt className="text-muted-foreground">Installation:</dt>
                        <dd>{formData.installation_date}</dd>
                      </>
                    )}
                    {formData.contract_value_manual && (
                      <>
                        <dt className="text-muted-foreground">Contract Value:</dt>
                        <dd>
                          {parseFloat(formData.contract_value_manual).toLocaleString()}{" "}
                          {formData.currency}
                        </dd>
                      </>
                    )}
                  </dl>
                </div>

                {/* Client Info */}
                <div className="p-4 rounded-lg border bg-gray-50">
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <BuildingIcon className="size-4" />
                    Client
                  </h4>
                  {clientMode === "new" && newClientData.company_name ? (
                    <p className="text-sm">
                      <Badge variant="secondary" className="mr-2">
                        New
                      </Badge>
                      {newClientData.company_name}
                    </p>
                  ) : selectedClientId && selectedClientId !== "none" ? (
                    <p className="text-sm">
                      {clients.find((c) => c.id === selectedClientId)?.company_name}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No client selected</p>
                  )}
                </div>

                {/* Team Info */}
                <div className="p-4 rounded-lg border bg-gray-50">
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <UsersIcon className="size-4" />
                    Team Members
                  </h4>
                  {selectedUserIds.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedUserIds.map((userId) => {
                        const user = assignableUsers.find((u) => u.id === userId);
                        return user ? (
                          <Badge key={userId} variant="secondary">
                            {user.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No team members assigned
                    </p>
                  )}
                </div>
              </div>
            </div>
          </WizardStep>

          <WizardNavigation
            onSubmit={handleSubmit}
            submitLabel="Create Project"
            isSubmitting={isLoading}
          />
        </CardContent>
      </GlassCard>
    </FormWizard>
  );
}
