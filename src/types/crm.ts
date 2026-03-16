/**
 * CRM Module Types
 *
 * Type definitions for brands, architecture firms, contacts,
 * opportunities, activities, and brand-firm links.
 */

// ============================================================================
// Enums
// ============================================================================

export type BrandTier = "luxury" | "mid_luxury" | "bridge";

export type VendorListStatus =
  | "not_applied"
  | "applied"
  | "under_review"
  | "approved"
  | "rejected";

export type ConnectionStrength = "none" | "cold" | "warm" | "hot";

export type RelationshipStatus =
  | "identified"
  | "reached_out"
  | "connected"
  | "meeting_scheduled"
  | "active_relationship";

export type OpportunityStage =
  | "researched"
  | "contacted"
  | "sample_sent"
  | "meeting"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export type CrmActivityType =
  | "email"
  | "call"
  | "meeting"
  | "linkedin_message"
  | "sample_sent"
  | "vendor_application"
  | "trade_show"
  | "site_visit"
  | "proposal_sent"
  | "follow_up"
  | "note";

export type CrmPriority = "high" | "medium" | "low";

// ============================================================================
// Base Row Types (match database columns)
// ============================================================================

export interface CrmBrand {
  id: string;
  brand_code: string;
  name: string;
  parent_group: string | null;
  tier: BrandTier;
  segment: string | null;
  store_count: number | null;
  expansion_rate: string | null;
  creative_director: string | null;
  cd_changed_recently: boolean;
  headquarters: string | null;
  website: string | null;
  annual_revenue: string | null;
  notes: string | null;
  priority: CrmPriority;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrmArchitectureFirm {
  id: string;
  firm_code: string;
  name: string;
  location: string | null;
  specialty: string | null;
  key_clients: string | null;
  vendor_list_status: VendorListStatus;
  vendor_application_date: string | null;
  website: string | null;
  connection_strength: ConnectionStrength;
  connection_notes: string | null;
  notes: string | null;
  priority: CrmPriority;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrmContact {
  id: string;
  contact_code: string;
  first_name: string;
  last_name: string;
  title: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  brand_id: string | null;
  architecture_firm_id: string | null;
  relationship_status: RelationshipStatus;
  source: string | null;
  last_interaction_date: string | null;
  notes: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrmOpportunity {
  id: string;
  opportunity_code: string;
  title: string;
  description: string | null;
  brand_id: string | null;
  architecture_firm_id: string | null;
  stage: OpportunityStage;
  estimated_value: number | null;
  currency: "TRY" | "USD" | "EUR";
  probability: number | null;
  expected_close_date: string | null;
  assigned_to: string | null;
  source: string | null;
  loss_reason: string | null;
  notes: string | null;
  priority: CrmPriority;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrmActivity {
  id: string;
  activity_type: CrmActivityType;
  title: string;
  description: string | null;
  activity_date: string;
  brand_id: string | null;
  architecture_firm_id: string | null;
  contact_id: string | null;
  opportunity_id: string | null;
  user_id: string | null;
  outcome: string | null;
  next_action: string | null;
  next_action_date: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrmBrandFirmLink {
  id: string;
  brand_id: string;
  architecture_firm_id: string;
  relationship_type: string | null;
  notes: string | null;
}

// ============================================================================
// Extended Types (with joined relations)
// ============================================================================

export interface CrmBrandWithStats extends CrmBrand {
  opportunity_count: number;
  latest_activity_date: string | null;
}

export interface CrmOpportunityWithRelations extends CrmOpportunity {
  brand?: { name: string; brand_code: string } | null;
  architecture_firm?: { name: string; firm_code: string } | null;
  assigned_user?: { name: string } | null;
}

export interface CrmActivityWithRelations extends CrmActivity {
  brand?: { name: string } | null;
  architecture_firm?: { name: string } | null;
  contact?: { first_name: string; last_name: string } | null;
  opportunity?: { title: string } | null;
  user?: { name: string } | null;
}

export interface CrmContactWithRelations extends CrmContact {
  brand?: { name: string; brand_code: string } | null;
  architecture_firm?: { name: string; firm_code: string } | null;
}

export interface CrmFirmWithLinks extends CrmArchitectureFirm {
  brand_links?: Array<{
    brand: { id: string; name: string; brand_code: string };
    relationship_type: string | null;
  }>;
}

// ============================================================================
// Pipeline Types
// ============================================================================

export interface PipelineColumn {
  stage: OpportunityStage;
  label: string;
  color: string;
  opportunities: CrmOpportunityWithRelations[];
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface CrmDashboardStats {
  brandCount: number;
  brandsByTier: { luxury: number; mid_luxury: number; bridge: number };
  firmCount: number;
  vendorApproved: number;
  activeOpportunities: number;
  totalPipelineValue: number;
  pipelineCurrency: string;
  upcomingActions: number;
  opportunitiesByStage: Record<OpportunityStage, number>;
}

// ============================================================================
// Constants
// ============================================================================

export const OPPORTUNITY_STAGES: { value: OpportunityStage; label: string; color: string }[] = [
  { value: "researched", label: "Researched", color: "#94a3b8" },
  { value: "contacted", label: "Contacted", color: "#60a5fa" },
  { value: "sample_sent", label: "Sample Sent", color: "#a78bfa" },
  { value: "meeting", label: "Meeting", color: "#f59e0b" },
  { value: "proposal", label: "Proposal", color: "#f97316" },
  { value: "negotiation", label: "Negotiation", color: "#ef4444" },
  { value: "won", label: "Won", color: "#22c55e" },
  { value: "lost", label: "Lost", color: "#6b7280" },
];

export const BRAND_TIERS: { value: BrandTier; label: string }[] = [
  { value: "luxury", label: "Luxury" },
  { value: "mid_luxury", label: "Mid-Luxury" },
  { value: "bridge", label: "Bridge" },
];

export const VENDOR_STATUSES: { value: VendorListStatus; label: string }[] = [
  { value: "not_applied", label: "Not Applied" },
  { value: "applied", label: "Applied" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export const CONNECTION_STRENGTHS: { value: ConnectionStrength; label: string }[] = [
  { value: "none", label: "None" },
  { value: "cold", label: "Cold" },
  { value: "warm", label: "Warm" },
  { value: "hot", label: "Hot" },
];

export const RELATIONSHIP_STATUSES: { value: RelationshipStatus; label: string }[] = [
  { value: "identified", label: "Identified" },
  { value: "reached_out", label: "Reached Out" },
  { value: "connected", label: "Connected" },
  { value: "meeting_scheduled", label: "Meeting Scheduled" },
  { value: "active_relationship", label: "Active Relationship" },
];

export const ACTIVITY_TYPES: { value: CrmActivityType; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "call", label: "Call" },
  { value: "meeting", label: "Meeting" },
  { value: "linkedin_message", label: "LinkedIn Message" },
  { value: "sample_sent", label: "Sample Sent" },
  { value: "vendor_application", label: "Vendor Application" },
  { value: "trade_show", label: "Trade Show" },
  { value: "site_visit", label: "Site Visit" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "follow_up", label: "Follow Up" },
  { value: "note", label: "Note" },
];

export const CRM_PRIORITIES: { value: CrmPriority; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];
