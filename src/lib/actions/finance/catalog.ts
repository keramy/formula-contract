"use server";

/**
 * Finance Catalog
 *
 * Setup-side resources: the access whitelist (admin-managed), categories,
 * suppliers, and recurring invoice templates. These are the "things you
 * configure once" before transactional flows (invoices, receivables) can
 * reference them.
 */

import { revalidatePath } from "next/cache";
import { sanitizeText } from "@/lib/sanitize";
import { logActivity } from "@/lib/activity-log/actions";
import { requireFinanceAccess, requireAdmin, type ActionResult } from "./_shared";
import type {
  FinanceSupplier,
  FinanceSupplierWithStats,
  FinanceCategory,
  FinanceRecurringWithSupplier,
  FinanceAccessWithUser,
} from "@/types/finance";

// ============================================================================
// Access Management (Admin only)
// ============================================================================

export async function getFinanceAccessList(): Promise<
  ActionResult<FinanceAccessWithUser[]>
> {
  const { error, supabase } = await requireAdmin();
  if (error) return { success: false, error };

  const { data, error: dbError } = await supabase!
    .from("finance_access")
    .select(
      `
      *,
      user:users!finance_access_user_id_fkey(name, email, role),
      granted_by_user:users!finance_access_granted_by_fkey(name)
    `
    )
    .order("created_at", { ascending: false });

  if (dbError) return { success: false, error: dbError.message };
  return { success: true, data: data as FinanceAccessWithUser[] };
}

export async function grantFinanceAccess(
  userId: string,
  canApprove: boolean
): Promise<ActionResult<{ id: string }>> {
  const { error, supabase, user } = await requireAdmin();
  if (error) return { success: false, error };

  const { data, error: dbError } = await supabase!
    .from("finance_access")
    .insert({
      user_id: userId,
      can_approve: canApprove,
      granted_by: user!.id,
    })
    .select("id")
    .single();

  if (dbError) {
    if (dbError.code === "23505")
      return { success: false, error: "User already has finance access" };
    return { success: false, error: dbError.message };
  }

  await logActivity({
    action: "finance_access_granted",
    entityType: "finance_access",
    entityId: data.id,
    details: { userId, canApprove },
  });

  revalidatePath("/payments");
  return { success: true, data: { id: data.id } };
}

export async function revokeFinanceAccess(
  userId: string
): Promise<ActionResult> {
  const { error, supabase } = await requireAdmin();
  if (error) return { success: false, error };

  const { error: dbError } = await supabase!
    .from("finance_access")
    .delete()
    .eq("user_id", userId);

  if (dbError) return { success: false, error: dbError.message };

  await logActivity({
    action: "finance_access_revoked",
    entityType: "finance_access",
    entityId: userId,
    details: { userId },
  });

  revalidatePath("/payments");
  return { success: true };
}

export async function updateFinanceApproval(
  userId: string,
  canApprove: boolean
): Promise<ActionResult> {
  const { error, supabase } = await requireAdmin();
  if (error) return { success: false, error };

  const { error: dbError } = await supabase!
    .from("finance_access")
    .update({ can_approve: canApprove })
    .eq("user_id", userId);

  if (dbError) return { success: false, error: dbError.message };

  revalidatePath("/payments");
  return { success: true };
}

// ============================================================================
// Categories
// ============================================================================

export async function getCategories(): Promise<
  ActionResult<FinanceCategory[]>
> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const { data, error: dbError } = await supabase!
    .from("finance_categories")
    .select("*")
    .eq("is_deleted", false)
    .order("type")
    .order("name");

  if (dbError) return { success: false, error: dbError.message };
  return { success: true, data: data as FinanceCategory[] };
}

export async function createCategory(
  input: Record<string, unknown>
): Promise<ActionResult<{ id: string }>> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const sanitized = {
    name: sanitizeText((input.name as string).trim()),
    type: input.type as string,
    color: input.color ? (input.color as string) : null,
  };

  const { data, error: dbError } = await supabase!
    .from("finance_categories")
    .insert(sanitized)
    .select("id")
    .single();

  if (dbError) return { success: false, error: dbError.message };

  revalidatePath("/payments");
  return { success: true, data: { id: data.id } };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const { error: dbError } = await supabase!
    .from("finance_categories")
    .update({ is_deleted: true })
    .eq("id", id);

  if (dbError) return { success: false, error: dbError.message };

  revalidatePath("/payments");
  return { success: true };
}

// ============================================================================
// Suppliers
// ============================================================================

export async function getSuppliers(): Promise<
  ActionResult<FinanceSupplierWithStats[]>
> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const { data: suppliers, error: dbError } = await supabase!
    .from("finance_suppliers")
    .select("*")
    .eq("is_deleted", false)
    .order("name");

  if (dbError) return { success: false, error: dbError.message };

  const { data: invoiceCounts } = await supabase!
    .from("finance_invoices")
    .select("supplier_id")
    .eq("is_deleted", false)
    .not("status", "in", '("paid","cancelled")');

  const countMap: Record<string, number> = {};
  invoiceCounts?.forEach((i) => {
    countMap[i.supplier_id] = (countMap[i.supplier_id] || 0) + 1;
  });

  const result = (suppliers as FinanceSupplier[]).map((s) => ({
    ...s,
    invoice_count: countMap[s.id] || 0,
    total_outstanding: 0,
  }));

  return { success: true, data: result };
}

export async function getSupplier(
  id: string
): Promise<ActionResult<FinanceSupplier>> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const { data, error: dbError } = await supabase!
    .from("finance_suppliers")
    .select("*")
    .eq("id", id)
    .eq("is_deleted", false)
    .single();

  if (dbError) return { success: false, error: dbError.message };
  return { success: true, data: data as FinanceSupplier };
}

export async function createSupplier(
  input: Record<string, unknown>
): Promise<ActionResult<{ id: string }>> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const sanitized = {
    name: sanitizeText((input.name as string).trim()),
    contact_person: input.contact_person
      ? sanitizeText((input.contact_person as string).trim())
      : null,
    phone: input.phone ? (input.phone as string).trim() : null,
    email: input.email ? (input.email as string).trim() : null,
    category: input.category ? (input.category as string) : null,
    tax_id: input.tax_id ? (input.tax_id as string).trim() : null,
    iban: input.iban ? (input.iban as string).trim() : null,
    bank_name: input.bank_name
      ? sanitizeText((input.bank_name as string).trim())
      : null,
    address: input.address
      ? sanitizeText((input.address as string).trim())
      : null,
    notes: input.notes
      ? sanitizeText((input.notes as string).trim())
      : null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error: dbError } = await supabase!
    .from("finance_suppliers")
    .insert(sanitized as any)
    .select("id")
    .single();

  if (dbError) return { success: false, error: dbError.message };

  await logActivity({
    action: "finance_supplier_created",
    entityType: "finance_supplier",
    entityId: data.id,
    details: { name: sanitized.name },
  });

  revalidatePath("/payments");
  return { success: true, data: { id: data.id } };
}

export async function updateSupplier(
  id: string,
  input: Record<string, unknown>
): Promise<ActionResult> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const sanitized = {
    name: sanitizeText((input.name as string).trim()),
    contact_person: input.contact_person
      ? sanitizeText((input.contact_person as string).trim())
      : null,
    phone: input.phone ? (input.phone as string).trim() : null,
    email: input.email ? (input.email as string).trim() : null,
    category: input.category ? (input.category as string) : null,
    tax_id: input.tax_id ? (input.tax_id as string).trim() : null,
    iban: input.iban ? (input.iban as string).trim() : null,
    bank_name: input.bank_name
      ? sanitizeText((input.bank_name as string).trim())
      : null,
    address: input.address
      ? sanitizeText((input.address as string).trim())
      : null,
    notes: input.notes
      ? sanitizeText((input.notes as string).trim())
      : null,
  };

  const { error: dbError } = await supabase!
    .from("finance_suppliers")
    .update(sanitized)
    .eq("id", id);

  if (dbError) return { success: false, error: dbError.message };

  await logActivity({
    action: "finance_supplier_updated",
    entityType: "finance_supplier",
    entityId: id,
    details: { name: sanitized.name },
  });

  revalidatePath("/payments");
  return { success: true };
}

export async function deleteSupplier(id: string): Promise<ActionResult> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const { error: dbError } = await supabase!
    .from("finance_suppliers")
    .update({ is_deleted: true })
    .eq("id", id);

  if (dbError) return { success: false, error: dbError.message };

  await logActivity({
    action: "finance_supplier_deleted",
    entityType: "finance_supplier",
    entityId: id,
  });

  revalidatePath("/payments");
  return { success: true };
}
// ============================================================================
// Recurring Templates
// ============================================================================

export async function getRecurringTemplates(): Promise<
  ActionResult<FinanceRecurringWithSupplier[]>
> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const { data, error: dbError } = await supabase!
    .from("finance_recurring_templates")
    .select(
      `
      *,
      supplier:finance_suppliers!finance_recurring_templates_supplier_id_fkey(name, supplier_code),
      category:finance_categories!finance_recurring_templates_category_id_fkey(name, color)
    `
    )
    .eq("is_deleted", false)
    .order("next_due_date");

  if (dbError) return { success: false, error: dbError.message };
  return { success: true, data: data as FinanceRecurringWithSupplier[] };
}

export async function createRecurringTemplate(
  input: Record<string, unknown>
): Promise<ActionResult<{ id: string }>> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const sanitized = {
    supplier_id: input.supplier_id as string,
    category_id: input.category_id ? (input.category_id as string) : null,
    description: sanitizeText((input.description as string).trim()),
    amount: input.amount as number,
    currency: input.currency as string,
    frequency: input.frequency as string,
    day_of_month: input.day_of_month as number,
    next_due_date: input.next_due_date as string,
    requires_approval: (input.requires_approval as boolean) || false,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error: dbError } = await supabase!
    .from("finance_recurring_templates")
    .insert(sanitized as any)
    .select("id")
    .single();

  if (dbError) return { success: false, error: dbError.message };

  await logActivity({
    action: "finance_recurring_created",
    entityType: "finance_recurring_template",
    entityId: data.id,
    details: { description: sanitized.description },
  });

  revalidatePath("/payments");
  return { success: true, data: { id: data.id } };
}

export async function updateRecurringTemplate(
  id: string,
  input: Record<string, unknown>
): Promise<ActionResult> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const sanitized = {
    supplier_id: input.supplier_id as string,
    category_id: input.category_id ? (input.category_id as string) : null,
    description: sanitizeText((input.description as string).trim()),
    amount: input.amount as number,
    currency: input.currency as string,
    frequency: input.frequency as string,
    day_of_month: input.day_of_month as number,
    next_due_date: input.next_due_date as string,
    requires_approval: (input.requires_approval as boolean) || false,
    is_active: input.is_active !== undefined ? (input.is_active as boolean) : true,
  };

  const { error: dbError } = await supabase!
    .from("finance_recurring_templates")
    .update(sanitized)
    .eq("id", id);

  if (dbError) return { success: false, error: dbError.message };

  revalidatePath("/payments");
  return { success: true };
}

export async function deleteRecurringTemplate(id: string): Promise<ActionResult> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const { error: dbError } = await supabase!
    .from("finance_recurring_templates")
    .update({ is_deleted: true })
    .eq("id", id);

  if (dbError) return { success: false, error: dbError.message };

  revalidatePath("/payments");
  return { success: true };
}

export async function processRecurringTemplates(): Promise<
  ActionResult<{ created: number }>
> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const today = new Date().toISOString().split("T")[0];
  const { data: templates, error: dbError } = await supabase!
    .from("finance_recurring_templates")
    .select("*")
    .eq("is_active", true)
    .eq("is_deleted", false)
    .lte("next_due_date", today);

  if (dbError) return { success: false, error: dbError.message };
  if (!templates || templates.length === 0) {
    return { success: true, data: { created: 0 } };
  }

  let created = 0;
  for (const template of templates) {
    const invoiceData = {
      supplier_id: template.supplier_id,
      category_id: template.category_id,
      invoice_date: template.next_due_date,
      due_date: template.next_due_date,
      total_amount: template.amount,
      currency: template.currency,
      description: template.description,
      requires_approval: template.requires_approval,
      status: template.requires_approval ? "awaiting_approval" : "pending",
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await supabase!
      .from("finance_invoices")
      .insert(invoiceData as any);

    if (!insertError) {
      created++;
      const nextDate = new Date(template.next_due_date);
      if (template.frequency === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);
      else if (template.frequency === "quarterly") nextDate.setMonth(nextDate.getMonth() + 3);
      else if (template.frequency === "yearly") nextDate.setFullYear(nextDate.getFullYear() + 1);
      nextDate.setDate(Math.min(template.day_of_month, 28));

      await supabase!
        .from("finance_recurring_templates")
        .update({ next_due_date: nextDate.toISOString().split("T")[0] })
        .eq("id", template.id);
    }
  }

  await logActivity({
    action: "finance_recurring_processed",
    entityType: "finance_recurring_template",
    entityId: "batch",
    details: { created, templates: templates.length },
  });

  revalidatePath("/payments");
  return { success: true, data: { created } };
}

