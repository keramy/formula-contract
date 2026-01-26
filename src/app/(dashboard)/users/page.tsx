import { createClient } from "@/lib/supabase/server";
import { UsersTable } from "./users-table";
import { UsersPageHeader } from "./users-page-header";

interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  last_active_at: string | null;
  created_at: string;
  employee_code: string | null; // Human-readable code (EMP-NNNN)
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; role?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // Build query
  let query = supabase
    .from("users")
    .select("id, email, name, phone, role, is_active, last_login_at, last_active_at, created_at, employee_code")
    .order("name");

  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
  }

  if (params.role) {
    query = query.eq("role", params.role as "admin" | "pm" | "production" | "procurement" | "management" | "client");
  }

  const { data: users, error } = await query;

  if (error) {
    console.error("Error fetching users:", error);
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <UsersPageHeader />

      {/* Users Table */}
      <UsersTable users={(users || []) as User[]} />
    </div>
  );
}
