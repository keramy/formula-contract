export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          project_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          project_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          project_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "client_team_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_users"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          client_code: string | null
          company_name: string
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          is_deleted: boolean | null
          notes: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          client_code?: string | null
          company_name: string
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_deleted?: boolean | null
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          client_code?: string | null
          company_name?: string
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_deleted?: boolean | null
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      drafts: {
        Row: {
          created_at: string | null
          data: Json
          entity_id: string | null
          entity_type: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "client_team_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_users"
            referencedColumns: ["id"]
          },
        ]
      }
      drawing_revisions: {
        Row: {
          cad_file_name: string | null
          cad_file_url: string | null
          client_markup_url: string | null
          created_at: string | null
          drawing_id: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          notes: string | null
          revision: string
          uploaded_by: string | null
        }
        Insert: {
          cad_file_name?: string | null
          cad_file_url?: string | null
          client_markup_url?: string | null
          created_at?: string | null
          drawing_id: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          notes?: string | null
          revision: string
          uploaded_by?: string | null
        }
        Update: {
          cad_file_name?: string | null
          cad_file_url?: string | null
          client_markup_url?: string | null
          created_at?: string | null
          drawing_id?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          notes?: string | null
          revision?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drawing_revisions_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "client_drawings_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_revisions_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "drawings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_revisions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "client_team_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "drawing_revisions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_revisions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "v_users"
            referencedColumns: ["id"]
          },
        ]
      }
      drawings: {
        Row: {
          approved_by: string | null
          client_comments: string | null
          client_response_at: string | null
          created_at: string | null
          current_revision: string | null
          id: string
          item_id: string
          not_required_at: string | null
          not_required_by: string | null
          not_required_reason: string | null
          pm_override: boolean | null
          pm_override_at: string | null
          pm_override_by: string | null
          pm_override_reason: string | null
          sent_to_client_at: string | null
          status: Database["public"]["Enums"]["drawing_status"]
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          client_comments?: string | null
          client_response_at?: string | null
          created_at?: string | null
          current_revision?: string | null
          id?: string
          item_id: string
          not_required_at?: string | null
          not_required_by?: string | null
          not_required_reason?: string | null
          pm_override?: boolean | null
          pm_override_at?: string | null
          pm_override_by?: string | null
          pm_override_reason?: string | null
          sent_to_client_at?: string | null
          status?: Database["public"]["Enums"]["drawing_status"]
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          client_comments?: string | null
          client_response_at?: string | null
          created_at?: string | null
          current_revision?: string | null
          id?: string
          item_id?: string
          not_required_at?: string | null
          not_required_by?: string | null
          not_required_reason?: string | null
          pm_override?: boolean | null
          pm_override_at?: string | null
          pm_override_by?: string | null
          pm_override_reason?: string | null
          sent_to_client_at?: string | null
          status?: Database["public"]["Enums"]["drawing_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drawings_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "client_team_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "drawings_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "client_scope_items_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "scope_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_not_required_by_fkey"
            columns: ["not_required_by"]
            isOneToOne: false
            referencedRelation: "client_team_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "drawings_not_required_by_fkey"
            columns: ["not_required_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_not_required_by_fkey"
            columns: ["not_required_by"]
            isOneToOne: false
            referencedRelation: "v_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_pm_override_by_fkey"
            columns: ["pm_override_by"]
            isOneToOne: false
            referencedRelation: "client_team_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "drawings_pm_override_by_fkey"
            columns: ["pm_override_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_pm_override_by_fkey"
            columns: ["pm_override_by"]
            isOneToOne: false
            referencedRelation: "v_users"
            referencedColumns: ["id"]
          },
        ]
      }
      gantt_dependencies: {
        Row: {
          created_at: string | null
          created_by: string | null
          dependency_type: number
          id: string
          lag_days: number
          project_id: string
          source_id: string
          target_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          dependency_type?: number
          id?: string
          lag_days?: number
          project_id: string
          source_id: string
          target_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          dependency_type?: number
          id?: string
          lag_days?: number
          project_id?: string
          source_id?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gantt_dependencies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "client_team_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gantt_dependencies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gantt_dependencies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gantt_dependencies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gantt_dependencies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gantt_dependencies_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "gantt_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gantt_dependencies_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "gantt_items"
            referencedColumns: ["id"]
          },
        ]
      }
      gantt_item_scope_items: {
        Row: {
          gantt_item_id: string
          id: string
          scope_item_id: string
        }
        Insert: {
          gantt_item_id: string
          id?: string
          scope_item_id: string
        }
        Update: {
          gantt_item_id?: string
          id?: string
          scope_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gantt_item_scope_items_gantt_item_id_fkey"
            columns: ["gantt_item_id"]
            isOneToOne: false
            referencedRelation: "gantt_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gantt_item_scope_items_scope_item_id_fkey"
            columns: ["scope_item_id"]
            isOneToOne: false
            referencedRelation: "client_scope_items_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gantt_item_scope_items_scope_item_id_fkey"
            columns: ["scope_item_id"]
            isOneToOne: false
            referencedRelation: "scope_items"
            referencedColumns: ["id"]
          },
        ]
      }
      gantt_items: {
        Row: {
          color: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          end_date: string
          id: string
          is_completed: boolean | null
          item_type: Database["public"]["Enums"]["gantt_item_type"]
          name: string
          parent_id: string | null
          phase_key: Database["public"]["Enums"]["gantt_phase_key"] | null
          priority: number
          progress_override: number | null
          project_id: string
          sort_order: number
          start_date: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date: string
          id?: string
          is_completed?: boolean | null
          item_type: Database["public"]["Enums"]["gantt_item_type"]
          name: string
          parent_id?: string | null
          phase_key?: Database["public"]["Enums"]["gantt_phase_key"] | null
          priority?: number
          progress_override?: number | null
          project_id: string
          sort_order?: number
          start_date: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string
          id?: string
          is_completed?: boolean | null
          item_type?: Database["public"]["Enums"]["gantt_item_type"]
          name?: string
          parent_id?: string | null
          phase_key?: Database["public"]["Enums"]["gantt_phase_key"] | null
          priority?: number
          progress_override?: number | null
          project_id?: string
          sort_order?: number
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gantt_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "client_team_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gantt_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gantt_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gantt_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "gantt_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gantt_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gantt_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      item_materials: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          material_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          material_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string
          material_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_materials_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "client_scope_items_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_materials_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "scope_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "client_materials_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          approved_by: string | null
          client_comments: string | null
          client_response_at: string | null
          created_at: string | null
          id: string
          images: Json | null
          is_deleted: boolean | null
          material_code: string
          name: string
          project_id: string
          sent_to_client_at: string | null
          specification: string | null
          status: Database["public"]["Enums"]["material_status"]
          supplier: string | null
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          client_comments?: string | null
          client_response_at?: string | null
          created_at?: string | null
          id?: string
          images?: Json | null
          is_deleted?: boolean | null
          material_code?: string
          name: string
          project_id: string
          sent_to_client_at?: string | null
          specification?: string | null
          status?: Database["public"]["Enums"]["material_status"]
          supplier?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          client_comments?: string | null
          client_response_at?: string | null
          created_at?: string | null
          id?: string
          images?: Json | null
          is_deleted?: boolean | null
          material_code?: string
          name?: string
          project_id?: string
          sent_to_client_at?: string | null
          specification?: string | null
          status?: Database["public"]["Enums"]["material_status"]
          supplier?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "client_team_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "materials_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          alert_days_before: number | null
          alert_sent_at: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string
          id: string
          is_completed: boolean | null
          milestone_code: string | null
          name: string
          project_id: string
          updated_at: string | null
        }
        Insert: {
          alert_days_before?: number | null
          alert_sent_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date: string
          id?: string
          is_completed?: boolean | null
          milestone_code?: string | null
          name: string
          project_id: string
          updated_at?: string | null
        }
        Update: {
          alert_days_before?: number | null
          alert_sent_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string
          id?: string
          is_completed?: boolean | null
          milestone_code?: string | null
          name?: string
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          drawing_id: string | null
          email_sent: boolean | null
          id: string
          is_read: boolean | null
          item_id: string | null
          material_id: string | null
          message: string | null
          project_id: string | null
          read_at: string | null
          report_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          drawing_id?: string | null
          email_sent?: boolean | null
          id?: string
          is_read?: boolean | null
          item_id?: string | null
          material_id?: string | null
          message?: string | null
          project_id?: string | null
          read_at?: string | null
          report_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          drawing_id?: string | null
          email_sent?: boolean | null
          id?: string
          is_read?: boolean | null
          item_id?: string | null
          material_id?: string | null
          message?: string | null
          project_id?: string | null
          read_at?: string | null
          report_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "client_drawings_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "drawings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "client_scope_items_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "scope_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "client_materials_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "client_reports_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "v_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "client_team_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "client_team_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "v_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "client_team_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string | null
          contract_value_calculated: number | null
          contract_value_manual: number | null
          created_at: string | null
          created_by: string | null
          currency: Database["public"]["Enums"]["currency"]
          description: string | null
          id: string
          installation_date: string | null
          is_deleted: boolean | null
          kickoff_requirements: string | null
          kickoff_summary: string | null
          name: string
          project_code: string
          signoff_completed_at: string | null
          signoff_notes: string | null
          signoff_requested_at: string | null
          slug: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          contract_value_calculated?: number | null
          contract_value_manual?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency"]
          description?: string | null
          id?: string
          installation_date?: string | null
          is_deleted?: boolean | null
          kickoff_requirements?: string | null
          kickoff_summary?: string | null
          name: string
          project_code: string
          signoff_completed_at?: string | null
          signoff_notes?: string | null
          signoff_requested_at?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          contract_value_calculated?: number | null
          contract_value_manual?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency"]
          description?: string | null
          id?: string
          installation_date?: string | null
          is_deleted?: boolean | null
          kickoff_requirements?: string | null
          kickoff_summary?: string | null
          name?: string
          project_code?: string
          signoff_completed_at?: string | null
          signoff_notes?: string | null
          signoff_requested_at?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "client_team_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_users"
            referencedColumns: ["id"]
          },
        ]
      }
      report_activity: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          report_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          report_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          report_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_activity_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "client_reports_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_activity_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_activity_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "v_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "client_team_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "report_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_users"
            referencedColumns: ["id"]
          },
        ]
      }
      report_lines: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          line_order: number
          photos: Json | null
          report_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          line_order: number
          photos?: Json | null
          report_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          line_order?: number
          photos?: Json | null
          report_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_lines_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "client_reports_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_lines_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_lines_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "v_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_shares: {
        Row: {
          created_at: string | null
          id: string
          report_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          report_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_shares_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "client_reports_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_shares_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_shares_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "v_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "client_team_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "report_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_users"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_published: boolean | null
          pdf_url: string | null
          project_id: string
          published_at: string | null
          report_code: string | null
          report_type: string
          share_internal: boolean | null
          share_with_client: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_published?: boolean | null
          pdf_url?: string | null
          project_id: string
          published_at?: string | null
          report_code?: string | null
          report_type?: string
          share_internal?: boolean | null
          share_with_client?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_published?: boolean | null
          pdf_url?: string | null
          project_id?: string
          published_at?: string | null
          report_code?: string | null
          report_type?: string
          share_internal?: boolean | null
          share_with_client?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "client_team_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "client_team_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_users"
            referencedColumns: ["id"]
          },
        ]
      }
      scope_items: {
        Row: {
          actual_total_cost: number | null
          actual_unit_cost: number | null
          created_at: string | null
          depth: number | null
          description: string | null
          drawing_receival_date: string | null
          height: number | null
          id: string
          images: Json | null
          initial_total_cost: number | null
          initial_unit_cost: number | null
          installation_started_at: string | null
          installed_at: string | null
          is_deleted: boolean | null
          is_installation_started: boolean | null
          is_installed: boolean | null
          is_shipped: boolean | null
          item_code: string
          item_path: Database["public"]["Enums"]["item_path"]
          name: string
          notes: string | null
          parent_id: string | null
          planned_completion_date: string | null
          procurement_status:
            | Database["public"]["Enums"]["procurement_status"]
            | null
          production_percentage: number | null
          project_id: string
          quantity: number | null
          shipped_at: string | null
          status: Database["public"]["Enums"]["item_status"]
          total_sales_price: number | null
          unit: string | null
          unit_sales_price: number | null
          updated_at: string | null
          width: number | null
        }
        Insert: {
          actual_total_cost?: number | null
          actual_unit_cost?: number | null
          created_at?: string | null
          depth?: number | null
          description?: string | null
          drawing_receival_date?: string | null
          height?: number | null
          id?: string
          images?: Json | null
          initial_total_cost?: number | null
          initial_unit_cost?: number | null
          installation_started_at?: string | null
          installed_at?: string | null
          is_deleted?: boolean | null
          is_installation_started?: boolean | null
          is_installed?: boolean | null
          is_shipped?: boolean | null
          item_code: string
          item_path?: Database["public"]["Enums"]["item_path"]
          name: string
          notes?: string | null
          parent_id?: string | null
          planned_completion_date?: string | null
          procurement_status?:
            | Database["public"]["Enums"]["procurement_status"]
            | null
          production_percentage?: number | null
          project_id: string
          quantity?: number | null
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["item_status"]
          total_sales_price?: number | null
          unit?: string | null
          unit_sales_price?: number | null
          updated_at?: string | null
          width?: number | null
        }
        Update: {
          actual_total_cost?: number | null
          actual_unit_cost?: number | null
          created_at?: string | null
          depth?: number | null
          description?: string | null
          drawing_receival_date?: string | null
          height?: number | null
          id?: string
          images?: Json | null
          initial_total_cost?: number | null
          initial_unit_cost?: number | null
          installation_started_at?: string | null
          installed_at?: string | null
          is_deleted?: boolean | null
          is_installation_started?: boolean | null
          is_installed?: boolean | null
          is_shipped?: boolean | null
          item_code?: string
          item_path?: Database["public"]["Enums"]["item_path"]
          name?: string
          notes?: string | null
          parent_id?: string | null
          planned_completion_date?: string | null
          procurement_status?:
            | Database["public"]["Enums"]["procurement_status"]
            | null
          production_percentage?: number | null
          project_id?: string
          quantity?: number | null
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["item_status"]
          total_sales_price?: number | null
          unit?: string | null
          unit_sales_price?: number | null
          updated_at?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scope_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "client_scope_items_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scope_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "scope_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scope_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scope_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_metadata: {
        Row: {
          created_at: string | null
          entity_type: string
          is_year_based: boolean | null
          padding_length: number | null
          prefix: string
        }
        Insert: {
          created_at?: string | null
          entity_type: string
          is_year_based?: boolean | null
          padding_length?: number | null
          prefix: string
        }
        Update: {
          created_at?: string | null
          entity_type?: string
          is_year_based?: boolean | null
          padding_length?: number | null
          prefix?: string
        }
        Relationships: []
      }
      snagging: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          is_resolved: boolean | null
          item_id: string | null
          photos: Json | null
          project_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          is_resolved?: boolean | null
          item_id?: string | null
          photos?: Json | null
          project_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          is_resolved?: boolean | null
          item_id?: string | null
          photos?: Json | null
          project_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "snagging_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "client_team_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "snagging_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snagging_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snagging_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "client_scope_items_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snagging_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "scope_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snagging_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snagging_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snagging_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "client_team_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "snagging_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snagging_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "v_users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          email_notifications: boolean | null
          employee_code: string | null
          id: string
          is_active: boolean | null
          language: string | null
          last_active_at: string | null
          last_login_at: string | null
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          email_notifications?: boolean | null
          employee_code?: string | null
          id: string
          is_active?: boolean | null
          language?: string | null
          last_active_at?: string | null
          last_login_at?: string | null
          name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          email_notifications?: boolean | null
          employee_code?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          last_active_at?: string | null
          last_login_at?: string | null
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      client_drawing_revisions_view: {
        Row: {
          created_at: string | null
          drawing_id: string | null
          file_name: string | null
          file_url: string | null
          id: string | null
          revision: string | null
          uploader_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drawing_revisions_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "client_drawings_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_revisions_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "drawings"
            referencedColumns: ["id"]
          },
        ]
      }
      client_drawings_view: {
        Row: {
          client_response_at: string | null
          created_at: string | null
          current_revision: string | null
          id: string | null
          item_id: string | null
          sent_to_client_at: string | null
          status: Database["public"]["Enums"]["drawing_status"] | null
          updated_at: string | null
        }
        Insert: {
          client_response_at?: string | null
          created_at?: string | null
          current_revision?: string | null
          id?: string | null
          item_id?: string | null
          sent_to_client_at?: string | null
          status?: Database["public"]["Enums"]["drawing_status"] | null
          updated_at?: string | null
        }
        Update: {
          client_response_at?: string | null
          created_at?: string | null
          current_revision?: string | null
          id?: string | null
          item_id?: string | null
          sent_to_client_at?: string | null
          status?: Database["public"]["Enums"]["drawing_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drawings_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "client_scope_items_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "scope_items"
            referencedColumns: ["id"]
          },
        ]
      }
      client_materials_view: {
        Row: {
          client_response_at: string | null
          created_at: string | null
          id: string | null
          images: Json | null
          name: string | null
          project_id: string | null
          sent_to_client_at: string | null
          specification: string | null
          status: Database["public"]["Enums"]["material_status"] | null
          updated_at: string | null
        }
        Insert: {
          client_response_at?: string | null
          created_at?: string | null
          id?: string | null
          images?: Json | null
          name?: string | null
          project_id?: string | null
          sent_to_client_at?: string | null
          specification?: string | null
          status?: Database["public"]["Enums"]["material_status"] | null
          updated_at?: string | null
        }
        Update: {
          client_response_at?: string | null
          created_at?: string | null
          id?: string | null
          images?: Json | null
          name?: string | null
          project_id?: string | null
          sent_to_client_at?: string | null
          specification?: string | null
          status?: Database["public"]["Enums"]["material_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      client_milestones_view: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string | null
          is_completed: boolean | null
          name: string | null
          project_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string | null
          is_completed?: boolean | null
          name?: string | null
          project_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string | null
          is_completed?: boolean | null
          name?: string | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      client_projects_view: {
        Row: {
          client_name: string | null
          created_at: string | null
          description: string | null
          id: string | null
          installation_date: string | null
          name: string | null
          project_code: string | null
          status: Database["public"]["Enums"]["project_status"] | null
          updated_at: string | null
        }
        Relationships: []
      }
      client_reports_view: {
        Row: {
          created_at: string | null
          creator_name: string | null
          id: string | null
          project_id: string | null
          published_at: string | null
          report_code: string | null
          report_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      client_scope_items_view: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          installed_at: string | null
          is_installed: boolean | null
          item_code: string | null
          item_path: Database["public"]["Enums"]["item_path"] | null
          name: string | null
          production_percentage: number | null
          project_id: string | null
          status: Database["public"]["Enums"]["item_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          installed_at?: string | null
          is_installed?: boolean | null
          item_code?: string | null
          item_path?: Database["public"]["Enums"]["item_path"] | null
          name?: string | null
          production_percentage?: number | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["item_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          installed_at?: string | null
          is_installed?: boolean | null
          item_code?: string | null
          item_path?: Database["public"]["Enums"]["item_path"] | null
          name?: string | null
          production_percentage?: number | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["item_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scope_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scope_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      client_team_view: {
        Row: {
          member_name: string | null
          member_role: Database["public"]["Enums"]["user_role"] | null
          project_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      v_activity_logs: {
        Row: {
          action: string | null
          created_at: string | null
          details: string | null
          employee_code: string | null
          entity_type: string | null
          id: string | null
          project_code: string | null
          project_name: string | null
          user_name: string | null
        }
        Relationships: []
      }
      v_clients: {
        Row: {
          client_code: string | null
          company_name: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string | null
          phone: string | null
          project_count: number | null
        }
        Insert: {
          client_code?: never
          company_name?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          phone?: string | null
          project_count?: never
        }
        Update: {
          client_code?: never
          company_name?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          phone?: string | null
          project_count?: never
        }
        Relationships: []
      }
      v_notifications: {
        Row: {
          created_at: string | null
          email: string | null
          employee_code: string | null
          id: string | null
          is_read: boolean | null
          message_preview: string | null
          project_code: string | null
          project_name: string | null
          report_code: string | null
          title: string | null
          type: string | null
          user_name: string | null
        }
        Relationships: []
      }
      v_project_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          email: string | null
          employee_code: string | null
          id: string | null
          project_code: string | null
          project_name: string | null
          project_status: Database["public"]["Enums"]["project_status"] | null
          user_name: string | null
          user_role: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: []
      }
      v_report_lines: {
        Row: {
          created_at: string | null
          description_preview: string | null
          id: string | null
          line_order: number | null
          photo_count: number | null
          project_code: string | null
          project_name: string | null
          report_code: string | null
          report_type: string | null
          title: string | null
        }
        Relationships: []
      }
      v_reports: {
        Row: {
          created_at: string | null
          created_by_name: string | null
          creator_code: string | null
          id: string | null
          is_published: boolean | null
          line_count: number | null
          project_code: string | null
          project_name: string | null
          published_at: string | null
          report_code: string | null
          report_type: string | null
          share_internal: boolean | null
          share_with_client: boolean | null
          status: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_users: {
        Row: {
          assigned_projects: number | null
          created_at: string | null
          email: string | null
          employee_code: string | null
          id: string | null
          is_active: boolean | null
          last_active_at: string | null
          last_login_at: string | null
          name: string | null
          role: Database["public"]["Enums"]["user_role"] | null
        }
        Insert: {
          assigned_projects?: never
          created_at?: string | null
          email?: string | null
          employee_code?: never
          id?: string | null
          is_active?: boolean | null
          last_active_at?: string | null
          last_login_at?: string | null
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Update: {
          assigned_projects?: never
          created_at?: string | null
          email?: string | null
          employee_code?: never
          id?: string | null
          is_active?: boolean | null
          last_active_at?: string | null
          last_login_at?: string | null
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_entity_code: { Args: { p_entity_type: string }; Returns: string }
      generate_report_code: { Args: { p_project_id: string }; Returns: string }
      generate_slug: { Args: { input_text: string }; Returns: string }
      get_next_project_code: { Args: never; Returns: string }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_year_sequence: {
        Args: { p_entity_type: string; p_year: number }
        Returns: string
      }
      is_assigned_to_project: {
        Args: { project_uuid: string }
        Returns: boolean
      }
      is_client_for_project: {
        Args: { project_uuid: string }
        Returns: boolean
      }
      preview_next_project_code: { Args: never; Returns: string }
      storage_project_id: { Args: { object_name: string }; Returns: string }
    }
    Enums: {
      currency: "TRY" | "USD" | "EUR"
      drawing_status:
        | "not_uploaded"
        | "uploaded"
        | "sent_to_client"
        | "approved"
        | "rejected"
        | "approved_with_comments"
        | "not_required"
      gantt_item_type: "phase" | "task" | "milestone"
      gantt_phase_key: "design" | "production" | "shipping" | "installation"
      item_path: "production" | "procurement"
      item_status:
        | "pending"
        | "in_design"
        | "awaiting_approval"
        | "approved"
        | "in_production"
        | "complete"
        | "on_hold"
        | "cancelled"
      material_status: "pending" | "sent_to_client" | "approved" | "rejected"
      procurement_status: "pm_approval" | "not_ordered" | "ordered" | "received"
      project_status:
        | "tender"
        | "active"
        | "on_hold"
        | "completed"
        | "cancelled"
        | "not_awarded"
      timeline_item_type: "phase" | "task"
      user_role:
        | "admin"
        | "pm"
        | "production"
        | "procurement"
        | "management"
        | "client"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      currency: ["TRY", "USD", "EUR"],
      drawing_status: [
        "not_uploaded",
        "uploaded",
        "sent_to_client",
        "approved",
        "rejected",
        "approved_with_comments",
        "not_required",
      ],
      gantt_item_type: ["phase", "task", "milestone"],
      gantt_phase_key: ["design", "production", "shipping", "installation"],
      item_path: ["production", "procurement"],
      item_status: [
        "pending",
        "in_design",
        "awaiting_approval",
        "approved",
        "in_production",
        "complete",
        "on_hold",
        "cancelled",
      ],
      material_status: ["pending", "sent_to_client", "approved", "rejected"],
      procurement_status: ["pm_approval", "not_ordered", "ordered", "received"],
      project_status: [
        "tender",
        "active",
        "on_hold",
        "completed",
        "cancelled",
        "not_awarded",
      ],
      timeline_item_type: ["phase", "task"],
      user_role: [
        "admin",
        "pm",
        "production",
        "procurement",
        "management",
        "client",
      ],
    },
  },
} as const

// ============================================================================
// Convenience Type Aliases
// ============================================================================

// Enum aliases
export type ProjectStatus = Enums<"project_status">;
export type Currency = Enums<"currency">;
export type DrawingStatus = Enums<"drawing_status">;
export type ProcurementStatus = Enums<"procurement_status">;
export type ItemPath = Enums<"item_path">;
export type ItemStatus = Enums<"item_status">;
export type UserRole = Enums<"user_role">;

// Table Insert/Update aliases
export type ClientInsert = TablesInsert<"clients">;
export type ClientUpdate = TablesUpdate<"clients">;
export type ProjectInsert = TablesInsert<"projects">;
export type ProjectUpdate = TablesUpdate<"projects">;
export type ScopeItemInsert = TablesInsert<"scope_items">;
export type ScopeItemUpdate = TablesUpdate<"scope_items">;
export type DrawingInsert = TablesInsert<"drawings">;
export type DrawingUpdate = TablesUpdate<"drawings">;
export type DrawingRevisionInsert = TablesInsert<"drawing_revisions">;
