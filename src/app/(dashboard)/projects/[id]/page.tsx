import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeftIcon,
  PencilIcon,
  CalendarIcon,
  BuildingIcon,
  BanknoteIcon,
  ClipboardListIcon,
  FileIcon,
  PackageIcon,
  PlusIcon,
} from "lucide-react";
import { format } from "date-fns";
import { ScopeItemsTable } from "./scope-items-table";
import { DownloadTemplateButton } from "@/components/scope-items";

interface ProjectClient {
  id: string;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
}

interface Project {
  id: string;
  project_code: string;
  name: string;
  description: string | null;
  status: string;
  installation_date: string | null;
  contract_value_manual: number | null;
  currency: string;
  client: ProjectClient | null;
}

interface ScopeItem {
  id: string;
  item_code: string;
  name: string;
  item_path: "production" | "procurement";
  status: string;
  quantity: number;
  unit: string;
  unit_price: number | null;
  total_price: number | null;
  production_percentage: number;
  images: string[] | null;
}

const statusColors: Record<string, string> = {
  tender: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusLabels: Record<string, string> = {
  tender: "Tender",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch project
  const { data, error } = await supabase
    .from("projects")
    .select(`
      id, project_code, name, description, status, installation_date, contract_value_manual, currency,
      client:clients(id, company_name, contact_person, email, phone)
    `)
    .eq("id", id)
    .single();

  const project = data as Project | null;

  if (error || !project) {
    notFound();
  }

  // Fetch scope items
  const { data: scopeItemsData } = await supabase
    .from("scope_items")
    .select("id, item_code, name, item_path, status, quantity, unit, unit_price, total_price, production_percentage, images")
    .eq("project_id", id)
    .eq("is_deleted", false)
    .order("item_code");

  const scopeItems = (scopeItemsData || []) as ScopeItem[];

  const formatCurrency = (value: number | null, currency: string) => {
    if (!value) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(value);
  };

  // Calculate totals
  const totalValue = scopeItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
  const productionItems = scopeItems.filter((item) => item.item_path === "production");
  const procurementItems = scopeItems.filter((item) => item.item_path === "procurement");

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link href="/projects">
            <ArrowLeftIcon className="size-4" />
            Back to Projects
          </Link>
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold text-foreground">{project.name}</h1>
              <Badge variant="secondary" className={statusColors[project.status]}>
                {statusLabels[project.status] || project.status}
              </Badge>
            </div>
            <p className="text-muted-foreground font-mono">{project.project_code}</p>
          </div>
          <Button asChild>
            <Link href={`/projects/${id}/edit`}>
              <PencilIcon className="size-4" />
              Edit Project
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scope">
            Scope Items
            {scopeItems.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {scopeItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="drawings">Drawings</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Client Info */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <BuildingIcon className="size-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Client</CardTitle>
              </CardHeader>
              <CardContent>
                {project.client ? (
                  <div className="space-y-1">
                    <p className="font-medium">{project.client.company_name}</p>
                    {project.client.contact_person && (
                      <p className="text-sm text-muted-foreground">{project.client.contact_person}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No client assigned</p>
                )}
              </CardContent>
            </Card>

            {/* Installation Date */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <CalendarIcon className="size-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Installation Date</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">
                  {project.installation_date
                    ? format(new Date(project.installation_date), "MMM d, yyyy")
                    : "Not set"}
                </p>
              </CardContent>
            </Card>

            {/* Contract Value */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <BanknoteIcon className="size-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Contract Value</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">
                  {formatCurrency(project.contract_value_manual, project.currency)}
                </p>
              </CardContent>
            </Card>

            {/* Scope Summary */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <ClipboardListIcon className="size-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Scope Items</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{scopeItems.length} items</p>
                <p className="text-sm text-muted-foreground">
                  {productionItems.length} production, {procurementItems.length} procurement
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          {project.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{project.description}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Scope Items Tab */}
        <TabsContent value="scope" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Scope Items</h3>
              <p className="text-sm text-muted-foreground">
                {scopeItems.length} items totaling {formatCurrency(totalValue, project.currency)}
              </p>
            </div>
            <div className="flex gap-2">
              <DownloadTemplateButton projectCode={project.project_code} />
              <Button asChild>
                <Link href={`/projects/${id}/scope/new`}>
                  <PlusIcon className="size-4" />
                  Add Item
                </Link>
              </Button>
            </div>
          </div>
          <ScopeItemsTable projectId={id} items={scopeItems} currency={project.currency} />
        </TabsContent>

        {/* Drawings Tab */}
        <TabsContent value="drawings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileIcon className="size-5" />
                Drawings
              </CardTitle>
              <CardDescription>Upload and manage project drawings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-muted-foreground">
                  Add scope items first, then upload drawings for each production item.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackageIcon className="size-5" />
                Materials
              </CardTitle>
              <CardDescription>Track material selections and approvals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-muted-foreground">
                  Material management will be available here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
