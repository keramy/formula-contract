/**
 * CRM Validation Schemas
 *
 * Zod schemas for all CRM entity forms.
 */

import { z } from "zod";

// ============================================================================
// Enum Schemas
// ============================================================================

export const brandTierSchema = z.enum(["luxury", "mid_luxury", "bridge"]);

export const vendorListStatusSchema = z.enum([
  "not_applied",
  "applied",
  "under_review",
  "approved",
  "rejected",
]);

export const connectionStrengthSchema = z.enum(["none", "cold", "warm", "hot"]);

export const relationshipStatusSchema = z.enum([
  "identified",
  "reached_out",
  "connected",
  "meeting_scheduled",
  "active_relationship",
]);

export const opportunityStageSchema = z.enum([
  "researched",
  "contacted",
  "sample_sent",
  "meeting",
  "proposal",
  "negotiation",
  "won",
  "lost",
]);

export const activityTypeSchema = z.enum([
  "email",
  "call",
  "meeting",
  "linkedin_message",
  "sample_sent",
  "vendor_application",
  "trade_show",
  "site_visit",
  "proposal_sent",
  "follow_up",
  "note",
]);

export const crmPrioritySchema = z.enum(["high", "medium", "low"]);

// ============================================================================
// Brand Schema
// ============================================================================

export const brandSchema = z.object({
  name: z.string().min(1, "Brand name is required").max(100, "Name too long"),
  parent_group: z.string().optional().nullable(),
  tier: brandTierSchema.default("mid_luxury"),
  segment: z.string().optional().nullable(),
  store_count: z.number().int().min(0).optional().nullable(),
  expansion_rate: z.string().optional().nullable(),
  creative_director: z.string().optional().nullable(),
  cd_changed_recently: z.boolean().default(false),
  headquarters: z.string().optional().nullable(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")).nullable(),
  annual_revenue: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  priority: crmPrioritySchema.default("medium"),
});

export type BrandFormData = z.input<typeof brandSchema>;

// ============================================================================
// Architecture Firm Schema
// ============================================================================

export const firmSchema = z.object({
  name: z.string().min(1, "Firm name is required").max(100, "Name too long"),
  location: z.string().optional().nullable(),
  specialty: z.string().optional().nullable(),
  key_clients: z.string().optional().nullable(),
  vendor_list_status: vendorListStatusSchema.default("not_applied"),
  vendor_application_date: z.string().optional().nullable(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")).nullable(),
  connection_strength: connectionStrengthSchema.default("none"),
  connection_notes: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  priority: crmPrioritySchema.default("medium"),
});

export type FirmFormData = z.input<typeof firmSchema>;

// ============================================================================
// Contact Schema
// ============================================================================

export const contactSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(50, "Name too long"),
  last_name: z.string().min(1, "Last name is required").max(50, "Name too long"),
  title: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  linkedin_url: z.string().url("Invalid URL").optional().or(z.literal("")).nullable(),
  brand_id: z.string().uuid().optional().nullable(),
  architecture_firm_id: z.string().uuid().optional().nullable(),
  relationship_status: relationshipStatusSchema.default("identified"),
  source: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type ContactFormData = z.input<typeof contactSchema>;

// ============================================================================
// Opportunity Schema
// ============================================================================

export const opportunitySchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().optional().nullable(),
  brand_id: z.string().uuid().optional().nullable(),
  architecture_firm_id: z.string().uuid().optional().nullable(),
  stage: opportunityStageSchema.default("researched"),
  estimated_value: z.number().min(0, "Value must be positive").optional().nullable(),
  currency: z.enum(["TRY", "USD", "EUR"]).default("USD"),
  probability: z.number().int().min(0).max(100).optional().nullable(),
  expected_close_date: z.string().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  source: z.string().optional().nullable(),
  loss_reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  priority: crmPrioritySchema.default("medium"),
});

export type OpportunityFormData = z.input<typeof opportunitySchema>;

// ============================================================================
// Activity Schema
// ============================================================================

export const activitySchema = z.object({
  activity_type: activityTypeSchema,
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().optional().nullable(),
  activity_date: z.string().min(1, "Date is required"),
  brand_id: z.string().uuid().optional().nullable(),
  architecture_firm_id: z.string().uuid().optional().nullable(),
  contact_id: z.string().uuid().optional().nullable(),
  opportunity_id: z.string().uuid().optional().nullable(),
  outcome: z.string().optional().nullable(),
  next_action: z.string().optional().nullable(),
  next_action_date: z.string().optional().nullable(),
});

export type ActivityFormData = z.input<typeof activitySchema>;
