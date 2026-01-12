import { createClient } from "@/lib/supabase/server";
import { UsersTable } from "./users-table";

interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
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
    .select("id, email, name, phone, role, is_active, last_login_at, created_at")
    .order("name");

  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
  }

  if (params.role) {
    query = query.eq("role", params.role);
  }

  const { data: users, error } = await query;

  if (error) {
    console.error("Error fetching users:", error);
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Users</h1>
        <p className="text-muted-foreground">Manage team members and permissions</p>
      </div>

      {/* Users Table */}
      <UsersTable users={(users || []) as User[]} />
    </div>
  );
}
