// Formula Contract Database Types
// Generated from schema documentation

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Enum Types
export type UserRole = "admin" | "pm" | "production" | "procurement" | "management" | "client";
export type ProjectStatus = "tender" | "active" | "on_hold" | "completed" | "cancelled";
export type ItemPath = "production" | "procurement";
export type ItemStatus = "pending" | "in_design" | "awaiting_approval" | "approved" | "in_production" | "complete" | "on_hold" | "cancelled";
export type ProcurementStatus = "pm_approval" | "not_ordered" | "ordered" | "received";
export type DrawingStatus = "not_uploaded" | "uploaded" | "sent_to_client" | "approved" | "rejected" | "approved_with_comments";
export type MaterialStatus = "pending" | "sent_to_client" | "approved" | "rejected";
export type Currency = "TRY" | "USD" | "EUR";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          phone: string | null;
          role: UserRole;
          language: string;
          email_notifications: boolean;
          is_active: boolean;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          phone?: string | null;
          role?: UserRole;
          language?: string;
          email_notifications?: boolean;
          is_active?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          phone?: string | null;
          role?: UserRole;
          language?: string;
          email_notifications?: boolean;
          is_active?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          company_name: string;
          contact_person: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          notes: string | null;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_name: string;
          contact_person?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          notes?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_name?: string;
          contact_person?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          notes?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          project_code: string;
          name: string;
          client_id: string | null;
          status: ProjectStatus;
          currency: Currency;
          description: string | null;
          installation_date: string | null;
          contract_value_manual: number | null;
          contract_value_calculated: number | null;
          kickoff_summary: string | null;
          kickoff_requirements: string | null;
          signoff_requested_at: string | null;
          signoff_completed_at: string | null;
          signoff_notes: string | null;
          is_deleted: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_code: string;
          name: string;
          client_id?: string | null;
          status?: ProjectStatus;
          currency?: Currency;
          description?: string | null;
          installation_date?: string | null;
          contract_value_manual?: number | null;
          contract_value_calculated?: number | null;
          kickoff_summary?: string | null;
          kickoff_requirements?: string | null;
          signoff_requested_at?: string | null;
          signoff_completed_at?: string | null;
          signoff_notes?: string | null;
          is_deleted?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_code?: string;
          name?: string;
          client_id?: string | null;
          status?: ProjectStatus;
          currency?: Currency;
          description?: string | null;
          installation_date?: string | null;
          contract_value_manual?: number | null;
          contract_value_calculated?: number | null;
          kickoff_summary?: string | null;
          kickoff_requirements?: string | null;
          signoff_requested_at?: string | null;
          signoff_completed_at?: string | null;
          signoff_notes?: string | null;
          is_deleted?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_assignments: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          assigned_at: string;
          assigned_by: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          assigned_at?: string;
          assigned_by?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          assigned_at?: string;
          assigned_by?: string | null;
        };
        Relationships: [];
      };
      milestones: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          description: string | null;
          due_date: string;
          is_completed: boolean;
          completed_at: string | null;
          alert_days_before: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          description?: string | null;
          due_date: string;
          is_completed?: boolean;
          completed_at?: string | null;
          alert_days_before?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          description?: string | null;
          due_date?: string;
          is_completed?: boolean;
          completed_at?: string | null;
          alert_days_before?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      scope_items: {
        Row: {
          id: string;
          project_id: string;
          item_code: string;
          name: string;
          description: string | null;
          width: number | null;
          depth: number | null;
          height: number | null;
          unit: string;
          quantity: number;
          unit_price: number | null;
          total_price: number | null;
          item_path: ItemPath;
          status: ItemStatus;
          procurement_status: ProcurementStatus | null;
          production_percentage: number;
          drawing_receival_date: string | null;
          planned_completion_date: string | null;
          is_installed: boolean;
          installed_at: string | null;
          notes: string | null;
          images: string[] | null;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          item_code: string;
          name: string;
          description?: string | null;
          width?: number | null;
          depth?: number | null;
          height?: number | null;
          unit?: string;
          quantity?: number;
          unit_price?: number | null;
          total_price?: number | null;
          item_path?: ItemPath;
          status?: ItemStatus;
          procurement_status?: ProcurementStatus | null;
          production_percentage?: number;
          drawing_receival_date?: string | null;
          planned_completion_date?: string | null;
          is_installed?: boolean;
          installed_at?: string | null;
          notes?: string | null;
          images?: string[] | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          item_code?: string;
          name?: string;
          description?: string | null;
          width?: number | null;
          depth?: number | null;
          height?: number | null;
          unit?: string;
          quantity?: number;
          unit_price?: number | null;
          total_price?: number | null;
          item_path?: ItemPath;
          status?: ItemStatus;
          procurement_status?: ProcurementStatus | null;
          production_percentage?: number;
          drawing_receival_date?: string | null;
          planned_completion_date?: string | null;
          is_installed?: boolean;
          installed_at?: string | null;
          notes?: string | null;
          images?: string[] | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      drawings: {
        Row: {
          id: string;
          item_id: string;
          status: DrawingStatus;
          current_revision: string | null;
          sent_to_client_at: string | null;
          client_response_at: string | null;
          client_comments: string | null;
          approved_by: string | null;
          pm_override: boolean;
          pm_override_reason: string | null;
          pm_override_at: string | null;
          pm_override_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          status?: DrawingStatus;
          current_revision?: string | null;
          sent_to_client_at?: string | null;
          client_response_at?: string | null;
          client_comments?: string | null;
          approved_by?: string | null;
          pm_override?: boolean;
          pm_override_reason?: string | null;
          pm_override_at?: string | null;
          pm_override_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          status?: DrawingStatus;
          current_revision?: string | null;
          sent_to_client_at?: string | null;
          client_response_at?: string | null;
          client_comments?: string | null;
          approved_by?: string | null;
          pm_override?: boolean;
          pm_override_reason?: string | null;
          pm_override_at?: string | null;
          pm_override_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      drawing_revisions: {
        Row: {
          id: string;
          drawing_id: string;
          revision: string;
          file_url: string;
          file_name: string;
          file_size: number | null;
          cad_file_url: string | null;
          cad_file_name: string | null;
          client_markup_url: string | null;
          notes: string | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          drawing_id: string;
          revision: string;
          file_url: string;
          file_name: string;
          file_size?: number | null;
          cad_file_url?: string | null;
          cad_file_name?: string | null;
          client_markup_url?: string | null;
          notes?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          drawing_id?: string;
          revision?: string;
          file_url?: string;
          file_name?: string;
          file_size?: number | null;
          cad_file_url?: string | null;
          cad_file_name?: string | null;
          client_markup_url?: string | null;
          notes?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      materials: {
        Row: {
          id: string;
          project_id: string;
          material_code: string;
          name: string;
          specification: string | null;
          supplier: string | null;
          images: Json | null;
          status: MaterialStatus;
          sent_to_client_at: string | null;
          client_response_at: string | null;
          client_comments: string | null;
          approved_by: string | null;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          material_code: string;
          name: string;
          specification?: string | null;
          supplier?: string | null;
          images?: Json | null;
          status?: MaterialStatus;
          sent_to_client_at?: string | null;
          client_response_at?: string | null;
          client_comments?: string | null;
          approved_by?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          material_code?: string;
          name?: string;
          specification?: string | null;
          supplier?: string | null;
          images?: Json | null;
          status?: MaterialStatus;
          sent_to_client_at?: string | null;
          client_response_at?: string | null;
          client_comments?: string | null;
          approved_by?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      item_materials: {
        Row: {
          id: string;
          item_id: string;
          material_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          material_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          material_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      snagging: {
        Row: {
          id: string;
          project_id: string;
          item_id: string | null;
          description: string;
          photos: Json | null;
          is_resolved: boolean;
          resolved_at: string | null;
          resolved_by: string | null;
          resolution_notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          item_id?: string | null;
          description: string;
          photos?: Json | null;
          is_resolved?: boolean;
          resolved_at?: string | null;
          resolved_by?: string | null;
          resolution_notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          item_id?: string | null;
          description?: string;
          photos?: Json | null;
          is_resolved?: boolean;
          resolved_at?: string | null;
          resolved_by?: string | null;
          resolution_notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          project_id: string;
          report_type: string;
          is_published: boolean;
          published_at: string | null;
          share_with_client: boolean;
          share_internal: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          report_type: string;
          is_published?: boolean;
          published_at?: string | null;
          share_with_client?: boolean;
          share_internal?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          report_type?: string;
          is_published?: boolean;
          published_at?: string | null;
          share_with_client?: boolean;
          share_internal?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      report_lines: {
        Row: {
          id: string;
          report_id: string;
          line_order: number;
          title: string;
          description: string | null;
          photos: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          line_order: number;
          title: string;
          description?: string | null;
          photos?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          line_order?: number;
          title?: string;
          description?: string | null;
          photos?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      report_shares: {
        Row: {
          id: string;
          report_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string | null;
          project_id: string | null;
          item_id: string | null;
          drawing_id: string | null;
          material_id: string | null;
          report_id: string | null;
          is_read: boolean;
          read_at: string | null;
          email_sent: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          message?: string | null;
          project_id?: string | null;
          item_id?: string | null;
          drawing_id?: string | null;
          material_id?: string | null;
          report_id?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          email_sent?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          message?: string | null;
          project_id?: string | null;
          item_id?: string | null;
          drawing_id?: string | null;
          material_id?: string | null;
          report_id?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          email_sent?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      activity_log: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          project_id: string | null;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          project_id?: string | null;
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          project_id?: string | null;
          details?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      user_role: UserRole;
      project_status: ProjectStatus;
      item_path: ItemPath;
      item_status: ItemStatus;
      procurement_status: ProcurementStatus;
      drawing_status: DrawingStatus;
      material_status: MaterialStatus;
      currency: Currency;
    };
  };
}

// Convenience type aliases
export type User = Database["public"]["Tables"]["users"]["Row"];
export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectAssignment = Database["public"]["Tables"]["project_assignments"]["Row"];
export type Milestone = Database["public"]["Tables"]["milestones"]["Row"];
export type ScopeItem = Database["public"]["Tables"]["scope_items"]["Row"];
export type Drawing = Database["public"]["Tables"]["drawings"]["Row"];
export type DrawingRevision = Database["public"]["Tables"]["drawing_revisions"]["Row"];
export type Material = Database["public"]["Tables"]["materials"]["Row"];
export type ItemMaterial = Database["public"]["Tables"]["item_materials"]["Row"];
export type Snagging = Database["public"]["Tables"]["snagging"]["Row"];
export type Report = Database["public"]["Tables"]["reports"]["Row"];
export type ReportLine = Database["public"]["Tables"]["report_lines"]["Row"];
export type ReportShare = Database["public"]["Tables"]["report_shares"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type ActivityLog = Database["public"]["Tables"]["activity_log"]["Row"];

// Insert types
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
export type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
export type ScopeItemInsert = Database["public"]["Tables"]["scope_items"]["Insert"];
export type DrawingInsert = Database["public"]["Tables"]["drawings"]["Insert"];
export type DrawingRevisionInsert = Database["public"]["Tables"]["drawing_revisions"]["Insert"];
export type MaterialInsert = Database["public"]["Tables"]["materials"]["Insert"];
export type ReportInsert = Database["public"]["Tables"]["reports"]["Insert"];

// Update types
export type UserUpdate = Database["public"]["Tables"]["users"]["Update"];
export type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];
export type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];
export type ScopeItemUpdate = Database["public"]["Tables"]["scope_items"]["Update"];
export type DrawingUpdate = Database["public"]["Tables"]["drawings"]["Update"];
export type MaterialUpdate = Database["public"]["Tables"]["materials"]["Update"];
