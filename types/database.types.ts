Initialising login role...
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
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          badge_color: string | null
          category: string | null
          code: string | null
          created_at: string
          criteria: Json | null
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          name: string
          points: number | null
          updated_at: string
        }
        Insert: {
          badge_color?: string | null
          category?: string | null
          code?: string | null
          created_at?: string
          criteria?: Json | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          points?: number | null
          updated_at?: string
        }
        Update: {
          badge_color?: string | null
          category?: string | null
          code?: string | null
          created_at?: string
          criteria?: Json | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          points?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_parsed_documents: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          document_type: string | null
          extracted_certifications: Json | null
          extracted_education: Json | null
          extracted_experience: Json | null
          extracted_person: Json | null
          extracted_skills: Json | null
          file_type: string | null
          id: string
          linked_to_candidate_id: string | null
          linked_to_employee_id: string | null
          original_filename: string | null
          parsed_by: string | null
          raw_text_preview: string | null
          storage_path: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          document_type?: string | null
          extracted_certifications?: Json | null
          extracted_education?: Json | null
          extracted_experience?: Json | null
          extracted_person?: Json | null
          extracted_skills?: Json | null
          file_type?: string | null
          id?: string
          linked_to_candidate_id?: string | null
          linked_to_employee_id?: string | null
          original_filename?: string | null
          parsed_by?: string | null
          raw_text_preview?: string | null
          storage_path?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          document_type?: string | null
          extracted_certifications?: Json | null
          extracted_education?: Json | null
          extracted_experience?: Json | null
          extracted_person?: Json | null
          extracted_skills?: Json | null
          file_type?: string | null
          id?: string
          linked_to_candidate_id?: string | null
          linked_to_employee_id?: string | null
          original_filename?: string | null
          parsed_by?: string | null
          raw_text_preview?: string | null
          storage_path?: string | null
        }
        Relationships: []
      }
      ai_schedule_suggestions: {
        Row: {
          applied_at: string | null
          confidence_score: number | null
          coverage_analysis: Json | null
          created_at: string | null
          department_id: string | null
          id: string
          location_id: string | null
          requested_by: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          suggested_shifts: Json
          warnings: string[] | null
          week_start: string
        }
        Insert: {
          applied_at?: string | null
          confidence_score?: number | null
          coverage_analysis?: Json | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          location_id?: string | null
          requested_by?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          suggested_shifts: Json
          warnings?: string[] | null
          week_start: string
        }
        Update: {
          applied_at?: string | null
          confidence_score?: number | null
          coverage_analysis?: Json | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          location_id?: string | null
          requested_by?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          suggested_shifts?: Json
          warnings?: string[] | null
          week_start?: string
        }
        Relationships: []
      }
      ai_scheduling_log: {
        Row: {
          accepted_suggestions: Json | null
          action: string
          created_at: string | null
          created_by: string | null
          feedback: string | null
          id: string
          input_context: Json | null
          location_id: string | null
          model_version: string | null
          processing_time_ms: number | null
          rejected_suggestions: Json | null
          suggestions: Json | null
          week_start: string
        }
        Insert: {
          accepted_suggestions?: Json | null
          action: string
          created_at?: string | null
          created_by?: string | null
          feedback?: string | null
          id?: string
          input_context?: Json | null
          location_id?: string | null
          model_version?: string | null
          processing_time_ms?: number | null
          rejected_suggestions?: Json | null
          suggestions?: Json | null
          week_start: string
        }
        Update: {
          accepted_suggestions?: Json | null
          action?: string
          created_at?: string | null
          created_by?: string | null
          feedback?: string | null
          id?: string
          input_context?: Json | null
          location_id?: string | null
          model_version?: string | null
          processing_time_ms?: number | null
          rejected_suggestions?: Json | null
          suggestions?: Json | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_scheduling_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "ai_scheduling_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_scheduling_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_scheduling_log_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_log: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          estimated_cost_usd: number | null
          feature: string
          id: string
          input_tokens: number | null
          model: string
          output_tokens: number | null
          profile_id: string | null
          request_metadata: Json | null
          response_summary: string | null
          success: boolean | null
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost_usd?: number | null
          feature: string
          id?: string
          input_tokens?: number | null
          model: string
          output_tokens?: number | null
          profile_id?: string | null
          request_metadata?: Json | null
          response_summary?: string | null
          success?: boolean | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          estimated_cost_usd?: number | null
          feature?: string
          id?: string
          input_tokens?: number | null
          model?: string
          output_tokens?: number | null
          profile_id?: string | null
          request_metadata?: Json | null
          response_summary?: string | null
          success?: boolean | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          audience_filter: Json | null
          audience_type: string | null
          body: string | null
          created_at: string
          id: string
          published_at: string | null
          published_by_employee_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audience_filter?: Json | null
          audience_type?: string | null
          body?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          published_by_employee_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audience_filter?: Json | null
          audience_type?: string | null
          body?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          published_by_employee_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_published_by_employee_id_fkey"
            columns: ["published_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_published_by_employee_id_fkey"
            columns: ["published_by_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "announcements_published_by_employee_id_fkey"
            columns: ["published_by_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      appointment_participants: {
        Row: {
          appointment_id: string
          created_at: string
          email: string | null
          id: string
          is_internal: boolean
          name: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_internal?: boolean
          name?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_internal?: boolean
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_participants_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          created_at: string
          created_by_profile_id: string | null
          description: string | null
          employee_id: string | null
          end_at: string
          id: string
          location_detail: string | null
          location_type: string | null
          start_at: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_profile_id?: string | null
          description?: string | null
          employee_id?: string | null
          end_at: string
          id?: string
          location_detail?: string | null
          location_type?: string | null
          start_at: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_profile_id?: string | null
          description?: string | null
          employee_id?: string | null
          end_at?: string
          id?: string
          location_detail?: string | null
          location_type?: string | null
          start_at?: string
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "appointments_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "appointments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      attendance: {
        Row: {
          actual_start: string | null
          created_at: string
          employee_id: string
          excuse_reason: string | null
          excused_at: string | null
          excused_by_employee_id: string | null
          id: string
          minutes_late: number | null
          notes: string | null
          penalty_weight: number | null
          scheduled_start: string | null
          shift_date: string
          shift_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          actual_start?: string | null
          created_at?: string
          employee_id: string
          excuse_reason?: string | null
          excused_at?: string | null
          excused_by_employee_id?: string | null
          id?: string
          minutes_late?: number | null
          notes?: string | null
          penalty_weight?: number | null
          scheduled_start?: string | null
          shift_date: string
          shift_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          actual_start?: string | null
          created_at?: string
          employee_id?: string
          excuse_reason?: string | null
          excused_at?: string | null
          excused_by_employee_id?: string | null
          id?: string
          minutes_late?: number | null
          notes?: string | null
          penalty_weight?: number | null
          scheduled_start?: string | null
          shift_date?: string
          shift_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "attendance_excused_by_employee_id_fkey"
            columns: ["excused_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_excused_by_employee_id_fkey"
            columns: ["excused_by_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "attendance_excused_by_employee_id_fkey"
            columns: ["excused_by_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "attendance_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shift_builder_details"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "attendance_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          action_category: string | null
          actor_email: string | null
          actor_id: string | null
          actor_ip: unknown
          changes: Json | null
          created_at: string
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          new_values: Json | null
          old_values: Json | null
          request_path: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          action_category?: string | null
          actor_email?: string | null
          actor_id?: string | null
          actor_ip?: unknown
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          request_path?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          action_category?: string | null
          actor_email?: string | null
          actor_id?: string | null
          actor_ip?: unknown
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          request_path?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_log_archive: {
        Row: {
          action: string
          action_category: string | null
          actor_email: string | null
          actor_id: string | null
          actor_ip: unknown
          changes: Json | null
          created_at: string
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          new_values: Json | null
          old_values: Json | null
          request_path: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          action_category?: string | null
          actor_email?: string | null
          actor_id?: string | null
          actor_ip?: unknown
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          request_path?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          action_category?: string | null
          actor_email?: string | null
          actor_id?: string | null
          actor_ip?: unknown
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          request_path?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_profile_id: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          occurred_at: string
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          occurred_at?: string
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "audit_logs_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_documents: {
        Row: {
          candidate_id: string
          category: string | null
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          updated_at: string
          uploader_id: string | null
        }
        Insert: {
          candidate_id: string
          category?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          updated_at?: string
          uploader_id?: string | null
        }
        Update: {
          candidate_id?: string
          category?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          updated_at?: string
          uploader_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_documents_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_forwards: {
        Row: {
          candidate_id: string
          created_at: string
          forwarded_at: string
          forwarded_by_employee_id: string
          forwarded_to_employee_id: string
          id: string
          notes: string | null
          reviewed_at: string | null
          status: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          forwarded_at?: string
          forwarded_by_employee_id: string
          forwarded_to_employee_id: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          status?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          forwarded_at?: string
          forwarded_by_employee_id?: string
          forwarded_to_employee_id?: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_forwards_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_forwards_forwarded_by_employee_id_fkey"
            columns: ["forwarded_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_forwards_forwarded_by_employee_id_fkey"
            columns: ["forwarded_by_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "candidate_forwards_forwarded_by_employee_id_fkey"
            columns: ["forwarded_by_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "candidate_forwards_forwarded_to_employee_id_fkey"
            columns: ["forwarded_to_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_forwards_forwarded_to_employee_id_fkey"
            columns: ["forwarded_to_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "candidate_forwards_forwarded_to_employee_id_fkey"
            columns: ["forwarded_to_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      candidate_interviews: {
        Row: {
          candidate_id: string
          communication_score: number | null
          completed_at: string | null
          concerns: string | null
          created_at: string
          cultural_fit_score: number | null
          duration_minutes: number | null
          id: string
          interview_type: string
          interviewer_employee_id: string | null
          location: string | null
          notes: string | null
          overall_score: number | null
          recommendation: string | null
          round_number: number
          scheduled_at: string | null
          status: string
          strengths: string | null
          technical_score: number | null
          updated_at: string
          video_link: string | null
        }
        Insert: {
          candidate_id: string
          communication_score?: number | null
          completed_at?: string | null
          concerns?: string | null
          created_at?: string
          cultural_fit_score?: number | null
          duration_minutes?: number | null
          id?: string
          interview_type?: string
          interviewer_employee_id?: string | null
          location?: string | null
          notes?: string | null
          overall_score?: number | null
          recommendation?: string | null
          round_number?: number
          scheduled_at?: string | null
          status?: string
          strengths?: string | null
          technical_score?: number | null
          updated_at?: string
          video_link?: string | null
        }
        Update: {
          candidate_id?: string
          communication_score?: number | null
          completed_at?: string | null
          concerns?: string | null
          created_at?: string
          cultural_fit_score?: number | null
          duration_minutes?: number | null
          id?: string
          interview_type?: string
          interviewer_employee_id?: string | null
          location?: string | null
          notes?: string | null
          overall_score?: number | null
          recommendation?: string | null
          round_number?: number
          scheduled_at?: string | null
          status?: string
          strengths?: string | null
          technical_score?: number | null
          updated_at?: string
          video_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_interviews_interviewer_employee_id_fkey"
            columns: ["interviewer_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_interviews_interviewer_employee_id_fkey"
            columns: ["interviewer_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "candidate_interviews_interviewer_employee_id_fkey"
            columns: ["interviewer_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      candidate_notes: {
        Row: {
          author_id: string | null
          author_initials: string | null
          candidate_id: string
          created_at: string
          edited_at: string | null
          edited_by_initials: string | null
          id: string
          is_pinned: boolean | null
          note: string
          note_type: string | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_initials?: string | null
          candidate_id: string
          created_at?: string
          edited_at?: string | null
          edited_by_initials?: string | null
          id?: string
          is_pinned?: boolean | null
          note: string
          note_type?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_initials?: string | null
          candidate_id?: string
          created_at?: string
          edited_at?: string | null
          edited_by_initials?: string | null
          id?: string
          is_pinned?: boolean | null
          note?: string
          note_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "candidate_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_notes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_onboarding: {
        Row: {
          actual_start_date: string | null
          assigned_to: string | null
          candidate_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          current_stage_id: string | null
          id: string
          notes: string | null
          started_at: string | null
          status: string
          target_start_date: string | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          actual_start_date?: string | null
          assigned_to?: string | null
          candidate_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_stage_id?: string | null
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: string
          target_start_date?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          actual_start_date?: string | null
          assigned_to?: string | null
          candidate_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_stage_id?: string | null
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: string
          target_start_date?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_onboarding_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "candidate_onboarding_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_onboarding_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_onboarding_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_onboarding_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "candidate_onboarding_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_onboarding_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_onboarding_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "onboarding_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_onboarding_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_onboarding_tasks: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          document_id: string | null
          id: string
          is_completed: boolean | null
          is_required: boolean | null
          name: string
          notes: string | null
          onboarding_id: string
          sort_order: number
          stage_id: string
          task_template_id: string | null
          task_type: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          document_id?: string | null
          id?: string
          is_completed?: boolean | null
          is_required?: boolean | null
          name: string
          notes?: string | null
          onboarding_id: string
          sort_order?: number
          stage_id: string
          task_template_id?: string | null
          task_type?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          document_id?: string | null
          id?: string
          is_completed?: boolean | null
          is_required?: boolean | null
          name?: string
          notes?: string | null
          onboarding_id?: string
          sort_order?: number
          stage_id?: string
          task_template_id?: string | null
          task_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_onboarding_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "candidate_onboarding_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_onboarding_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_onboarding_tasks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "candidate_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_onboarding_tasks_onboarding_id_fkey"
            columns: ["onboarding_id"]
            isOneToOne: false
            referencedRelation: "candidate_onboarding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_onboarding_tasks_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "onboarding_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_onboarding_tasks_task_template_id_fkey"
            columns: ["task_template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_shadow_visits: {
        Row: {
          areas_for_development: string | null
          areas_of_strength: string | null
          candidate_id: string
          candidate_questions: string | null
          created_at: string
          end_time: string | null
          engagement_score: number | null
          host_employee_id: string | null
          id: string
          location_id: string | null
          observer_notes: string | null
          overall_impression: string | null
          punctuality_score: number | null
          skill_demonstration_score: number | null
          start_time: string | null
          status: string
          teamwork_score: number | null
          updated_at: string
          visit_date: string
        }
        Insert: {
          areas_for_development?: string | null
          areas_of_strength?: string | null
          candidate_id: string
          candidate_questions?: string | null
          created_at?: string
          end_time?: string | null
          engagement_score?: number | null
          host_employee_id?: string | null
          id?: string
          location_id?: string | null
          observer_notes?: string | null
          overall_impression?: string | null
          punctuality_score?: number | null
          skill_demonstration_score?: number | null
          start_time?: string | null
          status?: string
          teamwork_score?: number | null
          updated_at?: string
          visit_date: string
        }
        Update: {
          areas_for_development?: string | null
          areas_of_strength?: string | null
          candidate_id?: string
          candidate_questions?: string | null
          created_at?: string
          end_time?: string | null
          engagement_score?: number | null
          host_employee_id?: string | null
          id?: string
          location_id?: string | null
          observer_notes?: string | null
          overall_impression?: string | null
          punctuality_score?: number | null
          skill_demonstration_score?: number | null
          start_time?: string | null
          status?: string
          teamwork_score?: number | null
          updated_at?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_shadow_visits_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_shadow_visits_host_employee_id_fkey"
            columns: ["host_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_shadow_visits_host_employee_id_fkey"
            columns: ["host_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "candidate_shadow_visits_host_employee_id_fkey"
            columns: ["host_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "candidate_shadow_visits_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_skills: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          notes: string | null
          rated_at: string
          rated_by: string | null
          rating: number
          skill_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          notes?: string | null
          rated_at?: string
          rated_by?: string | null
          rating?: number
          skill_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          rated_at?: string
          rated_by?: string | null
          rating?: number
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_skills_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_skills_rated_by_fkey"
            columns: ["rated_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "candidate_skills_rated_by_fkey"
            columns: ["rated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_skills_rated_by_fkey"
            columns: ["rated_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_library"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          applied_at: string
          avatar_url: string | null
          candidate_type: string | null
          city: string | null
          conversion_source: string | null
          created_at: string
          date_of_birth: string | null
          department_id: string | null
          email: string
          email_personal: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          expected_hourly_rate: number | null
          expected_salary: number | null
          experience_years: number | null
          first_name: string
          id: string
          interview_date: string | null
          interview_status: string | null
          interviewed_by: string | null
          last_name: string
          license_expiration: string | null
          license_number: string | null
          license_state: string | null
          license_type: string | null
          location_id: string | null
          notes: string | null
          onboarding_complete: boolean
          overall_score: number | null
          pay_type_preference: string | null
          phone: string | null
          phone_mobile: string | null
          phone_work: string | null
          postal_code: string | null
          preferred_name: string | null
          referral_source: string | null
          resume_url: string | null
          salary_expectation: number | null
          source: string | null
          source_enrollment_id: string | null
          source_person_id: string | null
          state: string | null
          status: string
          target_position_id: string | null
          updated_at: string
          working_interview_completed: boolean | null
          working_interview_date: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          applied_at?: string
          avatar_url?: string | null
          candidate_type?: string | null
          city?: string | null
          conversion_source?: string | null
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          email: string
          email_personal?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          expected_hourly_rate?: number | null
          expected_salary?: number | null
          experience_years?: number | null
          first_name: string
          id?: string
          interview_date?: string | null
          interview_status?: string | null
          interviewed_by?: string | null
          last_name: string
          license_expiration?: string | null
          license_number?: string | null
          license_state?: string | null
          license_type?: string | null
          location_id?: string | null
          notes?: string | null
          onboarding_complete?: boolean
          overall_score?: number | null
          pay_type_preference?: string | null
          phone?: string | null
          phone_mobile?: string | null
          phone_work?: string | null
          postal_code?: string | null
          preferred_name?: string | null
          referral_source?: string | null
          resume_url?: string | null
          salary_expectation?: number | null
          source?: string | null
          source_enrollment_id?: string | null
          source_person_id?: string | null
          state?: string | null
          status?: string
          target_position_id?: string | null
          updated_at?: string
          working_interview_completed?: boolean | null
          working_interview_date?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          applied_at?: string
          avatar_url?: string | null
          candidate_type?: string | null
          city?: string | null
          conversion_source?: string | null
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          email?: string
          email_personal?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          expected_hourly_rate?: number | null
          expected_salary?: number | null
          experience_years?: number | null
          first_name?: string
          id?: string
          interview_date?: string | null
          interview_status?: string | null
          interviewed_by?: string | null
          last_name?: string
          license_expiration?: string | null
          license_number?: string | null
          license_state?: string | null
          license_type?: string | null
          location_id?: string | null
          notes?: string | null
          onboarding_complete?: boolean
          overall_score?: number | null
          pay_type_preference?: string | null
          phone?: string | null
          phone_mobile?: string | null
          phone_work?: string | null
          postal_code?: string | null
          preferred_name?: string | null
          referral_source?: string | null
          resume_url?: string | null
          salary_expectation?: number | null
          source?: string | null
          source_enrollment_id?: string | null
          source_person_id?: string | null
          state?: string | null
          status?: string
          target_position_id?: string | null
          updated_at?: string
          working_interview_completed?: boolean | null
          working_interview_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_interviewed_by_fkey"
            columns: ["interviewed_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "candidates_interviewed_by_fkey"
            columns: ["interviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_interviewed_by_fkey"
            columns: ["interviewed_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_target_position_id_fkey"
            columns: ["target_position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_event_attendees: {
        Row: {
          ce_event_id: string
          certificate_issued: boolean | null
          certificate_issued_at: string | null
          certificate_number: string | null
          check_in_time: string | null
          checked_in: boolean | null
          created_at: string | null
          email: string | null
          feedback_comments: string | null
          feedback_rating: number | null
          feedback_submitted: boolean | null
          first_name: string | null
          id: string
          last_name: string | null
          license_number: string | null
          license_type: string | null
          phone: string | null
          visitor_id: string | null
        }
        Insert: {
          ce_event_id: string
          certificate_issued?: boolean | null
          certificate_issued_at?: string | null
          certificate_number?: string | null
          check_in_time?: string | null
          checked_in?: boolean | null
          created_at?: string | null
          email?: string | null
          feedback_comments?: string | null
          feedback_rating?: number | null
          feedback_submitted?: boolean | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          license_number?: string | null
          license_type?: string | null
          phone?: string | null
          visitor_id?: string | null
        }
        Update: {
          ce_event_id?: string
          certificate_issued?: boolean | null
          certificate_issued_at?: string | null
          certificate_number?: string | null
          check_in_time?: string | null
          checked_in?: boolean | null
          created_at?: string | null
          email?: string | null
          feedback_comments?: string | null
          feedback_rating?: number | null
          feedback_submitted?: boolean | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          license_number?: string | null
          license_type?: string | null
          phone?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_event_attendees_ce_event_id_fkey"
            columns: ["ce_event_id"]
            isOneToOne: false
            referencedRelation: "ce_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_event_attendees_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "education_visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_event_tasks: {
        Row: {
          backup_assignee_id: string | null
          category: Database["public"]["Enums"]["ce_task_category"]
          ce_event_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          id: string
          notes: string | null
          primary_assignee_id: string | null
          sort_order: number | null
          status: Database["public"]["Enums"]["ce_task_status"]
          task_description: string | null
          task_name: string
          updated_at: string | null
        }
        Insert: {
          backup_assignee_id?: string | null
          category: Database["public"]["Enums"]["ce_task_category"]
          ce_event_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          primary_assignee_id?: string | null
          sort_order?: number | null
          status?: Database["public"]["Enums"]["ce_task_status"]
          task_description?: string | null
          task_name: string
          updated_at?: string | null
        }
        Update: {
          backup_assignee_id?: string | null
          category?: Database["public"]["Enums"]["ce_task_category"]
          ce_event_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          primary_assignee_id?: string | null
          sort_order?: number | null
          status?: Database["public"]["Enums"]["ce_task_status"]
          task_description?: string | null
          task_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_event_tasks_backup_assignee_id_fkey"
            columns: ["backup_assignee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "ce_event_tasks_backup_assignee_id_fkey"
            columns: ["backup_assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_event_tasks_backup_assignee_id_fkey"
            columns: ["backup_assignee_id"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_event_tasks_ce_event_id_fkey"
            columns: ["ce_event_id"]
            isOneToOne: false
            referencedRelation: "ce_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_event_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "ce_event_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_event_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_event_tasks_primary_assignee_id_fkey"
            columns: ["primary_assignee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "ce_event_tasks_primary_assignee_id_fkey"
            columns: ["primary_assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_event_tasks_primary_assignee_id_fkey"
            columns: ["primary_assignee_id"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_events: {
        Row: {
          additional_speakers: Json | null
          attendance_tracking_method: string | null
          ce_hours_lab: number | null
          ce_hours_lecture: number | null
          ce_hours_offered: number
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          course_outline: Json | null
          created_at: string | null
          created_by: string | null
          current_attendees: number | null
          description: string | null
          event_date_end: string | null
          event_date_start: string
          format: Database["public"]["Enums"]["ce_event_format"]
          has_exam: boolean | null
          has_quiz: boolean | null
          id: string
          instructional_methods: string[] | null
          learning_objectives: string[] | null
          location_address: string | null
          location_name: string | null
          marketing_event_id: string | null
          max_attendees: number | null
          organization_type: string | null
          organizer_id: string | null
          provider_name: string | null
          provides_certificate: boolean | null
          race_approval_date: string | null
          race_course_number: string | null
          race_provider_number: string | null
          race_provider_status:
            | Database["public"]["Enums"]["race_approval_status"]
            | null
          registration_fee: number | null
          registration_url: string | null
          speaker_biography: string | null
          speaker_credentials: string | null
          speaker_cv_url: string | null
          speaker_honorarium: number | null
          speaker_lodging_confirmed: boolean | null
          speaker_name: string | null
          speaker_travel_confirmed: boolean | null
          sponsors: Json | null
          status: Database["public"]["Enums"]["ce_event_status"]
          title: string
          updated_at: string | null
          vmb_approval_number: string | null
          vmb_approval_status:
            | Database["public"]["Enums"]["race_approval_status"]
            | null
          website: string | null
        }
        Insert: {
          additional_speakers?: Json | null
          attendance_tracking_method?: string | null
          ce_hours_lab?: number | null
          ce_hours_lecture?: number | null
          ce_hours_offered?: number
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          course_outline?: Json | null
          created_at?: string | null
          created_by?: string | null
          current_attendees?: number | null
          description?: string | null
          event_date_end?: string | null
          event_date_start: string
          format?: Database["public"]["Enums"]["ce_event_format"]
          has_exam?: boolean | null
          has_quiz?: boolean | null
          id?: string
          instructional_methods?: string[] | null
          learning_objectives?: string[] | null
          location_address?: string | null
          location_name?: string | null
          marketing_event_id?: string | null
          max_attendees?: number | null
          organization_type?: string | null
          organizer_id?: string | null
          provider_name?: string | null
          provides_certificate?: boolean | null
          race_approval_date?: string | null
          race_course_number?: string | null
          race_provider_number?: string | null
          race_provider_status?:
            | Database["public"]["Enums"]["race_approval_status"]
            | null
          registration_fee?: number | null
          registration_url?: string | null
          speaker_biography?: string | null
          speaker_credentials?: string | null
          speaker_cv_url?: string | null
          speaker_honorarium?: number | null
          speaker_lodging_confirmed?: boolean | null
          speaker_name?: string | null
          speaker_travel_confirmed?: boolean | null
          sponsors?: Json | null
          status?: Database["public"]["Enums"]["ce_event_status"]
          title: string
          updated_at?: string | null
          vmb_approval_number?: string | null
          vmb_approval_status?:
            | Database["public"]["Enums"]["race_approval_status"]
            | null
          website?: string | null
        }
        Update: {
          additional_speakers?: Json | null
          attendance_tracking_method?: string | null
          ce_hours_lab?: number | null
          ce_hours_lecture?: number | null
          ce_hours_offered?: number
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          course_outline?: Json | null
          created_at?: string | null
          created_by?: string | null
          current_attendees?: number | null
          description?: string | null
          event_date_end?: string | null
          event_date_start?: string
          format?: Database["public"]["Enums"]["ce_event_format"]
          has_exam?: boolean | null
          has_quiz?: boolean | null
          id?: string
          instructional_methods?: string[] | null
          learning_objectives?: string[] | null
          location_address?: string | null
          location_name?: string | null
          marketing_event_id?: string | null
          max_attendees?: number | null
          organization_type?: string | null
          organizer_id?: string | null
          provider_name?: string | null
          provides_certificate?: boolean | null
          race_approval_date?: string | null
          race_course_number?: string | null
          race_provider_number?: string | null
          race_provider_status?:
            | Database["public"]["Enums"]["race_approval_status"]
            | null
          registration_fee?: number | null
          registration_url?: string | null
          speaker_biography?: string | null
          speaker_credentials?: string | null
          speaker_cv_url?: string | null
          speaker_honorarium?: number | null
          speaker_lodging_confirmed?: boolean | null
          speaker_name?: string | null
          speaker_travel_confirmed?: boolean | null
          sponsors?: Json | null
          status?: Database["public"]["Enums"]["ce_event_status"]
          title?: string
          updated_at?: string | null
          vmb_approval_number?: string | null
          vmb_approval_status?:
            | Database["public"]["Enums"]["race_approval_status"]
            | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "ce_events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
        ]
      }
      certifications: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          is_required: boolean
          issuing_authority: string | null
          name: string
          required_for_position_ids: Json | null
          updated_at: string
          validity_months: number | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          issuing_authority?: string | null
          name: string
          required_for_position_ids?: Json | null
          updated_at?: string
          validity_months?: number | null
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          issuing_authority?: string | null
          name?: string
          required_for_position_ids?: Json | null
          updated_at?: string
          validity_months?: number | null
        }
        Relationships: []
      }
      clinic_visits: {
        Row: {
          clinic_name: string
          created_at: string
          id: string
          is_archived: boolean | null
          items_discussed: string[] | null
          logged_via: string | null
          next_visit_date: string | null
          partner_id: string | null
          profile_id: string | null
          spoke_to: string | null
          updated_at: string
          user_id: string
          visit_date: string
          visit_notes: string | null
        }
        Insert: {
          clinic_name: string
          created_at?: string
          id?: string
          is_archived?: boolean | null
          items_discussed?: string[] | null
          logged_via?: string | null
          next_visit_date?: string | null
          partner_id?: string | null
          profile_id?: string | null
          spoke_to?: string | null
          updated_at?: string
          user_id: string
          visit_date?: string
          visit_notes?: string | null
        }
        Update: {
          clinic_name?: string
          created_at?: string
          id?: string
          is_archived?: boolean | null
          items_discussed?: string[] | null
          logged_via?: string | null
          next_visit_date?: string | null
          partner_id?: string | null
          profile_id?: string | null
          spoke_to?: string | null
          updated_at?: string
          user_id?: string
          visit_date?: string
          visit_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_visits_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_visits_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "referral_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_visits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "clinic_visits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_visits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
        ]
      }
      clock_devices: {
        Row: {
          created_at: string
          device_type: string | null
          id: string
          identifier: string | null
          is_active: boolean
          location_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          id?: string
          identifier?: string | null
          is_active?: boolean
          location_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          device_type?: string | null
          id?: string
          identifier?: string | null
          is_active?: boolean
          location_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clock_devices_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string | null
          company_name: string | null
          contact_email: string | null
          created_at: string
          default_workweek_start: number | null
          display_name: string | null
          id: string
          industry: string | null
          legal_name: string | null
          locale: string | null
          logo_url: string | null
          phone: string | null
          primary_address: Json | null
          timezone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          contact_email?: string | null
          created_at?: string
          default_workweek_start?: number | null
          display_name?: string | null
          id?: string
          industry?: string | null
          legal_name?: string | null
          locale?: string | null
          logo_url?: string | null
          phone?: string | null
          primary_address?: Json | null
          timezone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string | null
          contact_email?: string | null
          created_at?: string
          default_workweek_start?: number | null
          display_name?: string | null
          id?: string
          industry?: string | null
          legal_name?: string | null
          locale?: string | null
          logo_url?: string | null
          phone?: string | null
          primary_address?: Json | null
          timezone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      compliance_alerts: {
        Row: {
          alert_type: string
          auto_generated: boolean | null
          created_at: string | null
          days_until_due: number | null
          description: string | null
          due_date: string | null
          entity_id: string
          entity_name: string | null
          entity_type: string
          id: string
          last_notified_at: string | null
          notified_users: string[] | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          title: string
        }
        Insert: {
          alert_type: string
          auto_generated?: boolean | null
          created_at?: string | null
          days_until_due?: number | null
          description?: string | null
          due_date?: string | null
          entity_id: string
          entity_name?: string | null
          entity_type: string
          id?: string
          last_notified_at?: string | null
          notified_users?: string[] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          title: string
        }
        Update: {
          alert_type?: string
          auto_generated?: boolean | null
          created_at?: string | null
          days_until_due?: number | null
          description?: string | null
          due_date?: string | null
          entity_id?: string
          entity_name?: string | null
          entity_type?: string
          id?: string
          last_notified_at?: string | null
          notified_users?: string[] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          title?: string
        }
        Relationships: []
      }
      contact_notes: {
        Row: {
          author_id: string | null
          author_initials: string | null
          contact_id: string
          contact_type: string
          created_at: string
          edited_at: string | null
          edited_by_id: string | null
          edited_by_initials: string | null
          enrollment_id: string | null
          id: string
          is_archived: boolean | null
          is_pinned: boolean | null
          note: string
          note_type: string | null
          source_note_id: string | null
          transferred_at: string | null
          transferred_from: string | null
          updated_at: string
          visibility: string | null
        }
        Insert: {
          author_id?: string | null
          author_initials?: string | null
          contact_id: string
          contact_type: string
          created_at?: string
          edited_at?: string | null
          edited_by_id?: string | null
          edited_by_initials?: string | null
          enrollment_id?: string | null
          id?: string
          is_archived?: boolean | null
          is_pinned?: boolean | null
          note: string
          note_type?: string | null
          source_note_id?: string | null
          transferred_at?: string | null
          transferred_from?: string | null
          updated_at?: string
          visibility?: string | null
        }
        Update: {
          author_id?: string | null
          author_initials?: string | null
          contact_id?: string
          contact_type?: string
          created_at?: string
          edited_at?: string | null
          edited_by_id?: string | null
          edited_by_initials?: string | null
          enrollment_id?: string | null
          id?: string
          is_archived?: boolean | null
          is_pinned?: boolean | null
          note?: string
          note_type?: string | null
          source_note_id?: string | null
          transferred_at?: string | null
          transferred_from?: string | null
          updated_at?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "contact_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_edited_by_id_fkey"
            columns: ["edited_by_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "contact_notes_edited_by_id_fkey"
            columns: ["edited_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_edited_by_id_fkey"
            columns: ["edited_by_id"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_safety_log_types: {
        Row: {
          id: string
          key: string
          label: string
          icon: string
          color: string
          description: string
          fields: Json
          has_osha_toggle: boolean | null
          compliance_standards: string[] | null
          is_active: boolean | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          label: string
          icon?: string
          color?: string
          description?: string
          fields?: Json
          has_osha_toggle?: boolean | null
          compliance_standards?: string[] | null
          is_active?: boolean | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          label?: string
          icon?: string
          color?: string
          description?: string
          fields?: Json
          has_osha_toggle?: boolean | null
          compliance_standards?: string[] | null
          is_active?: boolean | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_safety_log_types_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_department_id: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_department_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_department_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_parent_department_id_fkey"
            columns: ["parent_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_slots: {
        Row: {
          ai_confidence: number | null
          ai_reasoning: string | null
          ai_suggested_employee_id: string | null
          assigned_at: string | null
          assigned_by: string | null
          conflict_reason: string | null
          created_at: string | null
          draft_id: string
          employee_id: string | null
          end_time: string
          has_conflict: boolean | null
          id: string
          is_filled: boolean | null
          is_required: boolean | null
          priority: number | null
          role_category: string
          role_label: string
          service_id: string
          slot_date: string
          staffing_requirement_id: string | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_reasoning?: string | null
          ai_suggested_employee_id?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          conflict_reason?: string | null
          created_at?: string | null
          draft_id: string
          employee_id?: string | null
          end_time?: string
          has_conflict?: boolean | null
          id?: string
          is_filled?: boolean | null
          is_required?: boolean | null
          priority?: number | null
          role_category: string
          role_label: string
          service_id: string
          slot_date: string
          staffing_requirement_id?: string | null
          start_time?: string
          updated_at?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_reasoning?: string | null
          ai_suggested_employee_id?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          conflict_reason?: string | null
          created_at?: string | null
          draft_id?: string
          employee_id?: string | null
          end_time?: string
          has_conflict?: boolean | null
          id?: string
          is_filled?: boolean | null
          is_required?: boolean | null
          priority?: number | null
          role_category?: string
          role_label?: string
          service_id?: string
          slot_date?: string
          staffing_requirement_id?: string | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "draft_slots_ai_suggested_employee_id_fkey"
            columns: ["ai_suggested_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_slots_ai_suggested_employee_id_fkey"
            columns: ["ai_suggested_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "draft_slots_ai_suggested_employee_id_fkey"
            columns: ["ai_suggested_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "draft_slots_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "draft_slots_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_slots_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_slots_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "schedule_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_slots_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_slots_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "draft_slots_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "draft_slots_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service_coverage_summary"
            referencedColumns: ["service_id"]
          },
          {
            foreignKeyName: "draft_slots_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_slots_staffing_requirement_id_fkey"
            columns: ["staffing_requirement_id"]
            isOneToOne: false
            referencedRelation: "service_staffing_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      education_visitors: {
        Row: {
          ce_event_id: string | null
          coordinator: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          file_link: string | null
          first_greeter: string | null
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          lead_source: string | null
          location: string | null
          mentor: string | null
          notes: string | null
          organization_name: string | null
          phone: string | null
          program_name: string | null
          reason_for_visit: string | null
          recruitment_announced: boolean | null
          recruitment_channel: string | null
          referral_name: string | null
          school_of_origin: string | null
          updated_at: string | null
          visit_end_date: string | null
          visit_start_date: string | null
          visit_status: string | null
          visitor_type: Database["public"]["Enums"]["education_visitor_type"]
        }
        Insert: {
          ce_event_id?: string | null
          coordinator?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          file_link?: string | null
          first_greeter?: string | null
          first_name: string
          id?: string
          is_active?: boolean | null
          last_name: string
          lead_source?: string | null
          location?: string | null
          mentor?: string | null
          notes?: string | null
          organization_name?: string | null
          phone?: string | null
          program_name?: string | null
          reason_for_visit?: string | null
          recruitment_announced?: boolean | null
          recruitment_channel?: string | null
          referral_name?: string | null
          school_of_origin?: string | null
          updated_at?: string | null
          visit_end_date?: string | null
          visit_start_date?: string | null
          visit_status?: string | null
          visitor_type?: Database["public"]["Enums"]["education_visitor_type"]
        }
        Update: {
          ce_event_id?: string | null
          coordinator?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          file_link?: string | null
          first_greeter?: string | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          lead_source?: string | null
          location?: string | null
          mentor?: string | null
          notes?: string | null
          organization_name?: string | null
          phone?: string | null
          program_name?: string | null
          reason_for_visit?: string | null
          recruitment_announced?: boolean | null
          recruitment_channel?: string | null
          referral_name?: string | null
          school_of_origin?: string | null
          updated_at?: string | null
          visit_end_date?: string | null
          visit_start_date?: string | null
          visit_status?: string | null
          visitor_type?: Database["public"]["Enums"]["education_visitor_type"]
        }
        Relationships: [
          {
            foreignKeyName: "fk_education_visitors_ce_event"
            columns: ["ce_event_id"]
            isOneToOne: false
            referencedRelation: "ce_events"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          category: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          body: string
          category: string
          created_at?: string | null
          id: string
          is_active?: boolean | null
          name: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      employee_achievements: {
        Row: {
          achievement_id: string
          awarded_by_employee_id: string | null
          created_at: string
          earned_at: string
          employee_id: string
          id: string
          notes: string | null
        }
        Insert: {
          achievement_id: string
          awarded_by_employee_id?: string | null
          created_at?: string
          earned_at?: string
          employee_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          achievement_id?: string
          awarded_by_employee_id?: string | null
          created_at?: string
          earned_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_achievements_awarded_by_employee_id_fkey"
            columns: ["awarded_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_achievements_awarded_by_employee_id_fkey"
            columns: ["awarded_by_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_achievements_awarded_by_employee_id_fkey"
            columns: ["awarded_by_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_achievements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_achievements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_achievements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employee_assets: {
        Row: {
          asset_description: string | null
          asset_name: string
          asset_type: string | null
          assigned_by: string | null
          candidate_id: string | null
          checked_out_at: string | null
          condition: string | null
          created_at: string
          employee_id: string
          expected_return_date: string | null
          id: string
          notes: string | null
          returned_at: string | null
          returned_date: string | null
          serial_number: string | null
        }
        Insert: {
          asset_description?: string | null
          asset_name: string
          asset_type?: string | null
          assigned_by?: string | null
          candidate_id?: string | null
          checked_out_at?: string | null
          condition?: string | null
          created_at?: string
          employee_id: string
          expected_return_date?: string | null
          id?: string
          notes?: string | null
          returned_at?: string | null
          returned_date?: string | null
          serial_number?: string | null
        }
        Update: {
          asset_description?: string | null
          asset_name?: string
          asset_type?: string | null
          assigned_by?: string | null
          candidate_id?: string | null
          checked_out_at?: string | null
          condition?: string | null
          created_at?: string
          employee_id?: string
          expected_return_date?: string | null
          id?: string
          notes?: string | null
          returned_at?: string | null
          returned_date?: string | null
          serial_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_assets_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "employee_assets_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_assets_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_assets_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_assets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_assets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_assets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employee_availability: {
        Row: {
          availability_type: string | null
          created_at: string | null
          created_by: string | null
          day_of_week: number
          effective_from: string | null
          effective_until: string | null
          employee_id: string
          end_time: string
          id: string
          is_recurring: boolean | null
          location_id: string | null
          preference_level: number | null
          reason: string | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          availability_type?: string | null
          created_at?: string | null
          created_by?: string | null
          day_of_week: number
          effective_from?: string | null
          effective_until?: string | null
          employee_id: string
          end_time: string
          id?: string
          is_recurring?: boolean | null
          location_id?: string | null
          preference_level?: number | null
          reason?: string | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          availability_type?: string | null
          created_at?: string | null
          created_by?: string | null
          day_of_week?: number
          effective_from?: string | null
          effective_until?: string | null
          employee_id?: string
          end_time?: string
          id?: string
          is_recurring?: boolean | null
          location_id?: string | null
          preference_level?: number | null
          reason?: string | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_availability_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "employee_availability_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_availability_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_availability_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_availability_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_availability_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_availability_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_ce_credits: {
        Row: {
          budget_amount: number
          created_at: string
          currency: string | null
          employee_id: string
          id: string
          period_year: number
          updated_at: string
        }
        Insert: {
          budget_amount?: number
          created_at?: string
          currency?: string | null
          employee_id: string
          id?: string
          period_year?: number
          updated_at?: string
        }
        Update: {
          budget_amount?: number
          created_at?: string
          currency?: string | null
          employee_id?: string
          id?: string
          period_year?: number
          updated_at?: string
        }
        Relationships: []
      }
      employee_ce_transactions: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          category: string | null
          ce_credit_id: string
          created_at: string
          description: string
          document_id: string | null
          id: string
          transaction_date: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          ce_credit_id: string
          created_at?: string
          description: string
          document_id?: string | null
          id?: string
          transaction_date?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          ce_credit_id?: string
          created_at?: string
          description?: string
          document_id?: string | null
          id?: string
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_ce_transactions_ce_credit_id_fkey"
            columns: ["ce_credit_id"]
            isOneToOne: false
            referencedRelation: "employee_ce_credits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_ce_transactions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "employee_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_ce_transactions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "employee_documents_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_certifications: {
        Row: {
          certification_id: string
          certification_number: string | null
          created_at: string
          document_file_id: string | null
          employee_id: string
          expiration_date: string | null
          id: string
          issued_date: string | null
          notes: string | null
          status: string
          updated_at: string
          verified_at: string | null
          verified_by_employee_id: string | null
        }
        Insert: {
          certification_id: string
          certification_number?: string | null
          created_at?: string
          document_file_id?: string | null
          employee_id: string
          expiration_date?: string | null
          id?: string
          issued_date?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by_employee_id?: string | null
        }
        Update: {
          certification_id?: string
          certification_number?: string | null
          created_at?: string
          document_file_id?: string | null
          employee_id?: string
          expiration_date?: string | null
          id?: string
          issued_date?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by_employee_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_certifications_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "certifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_certifications_document_file_id_fkey"
            columns: ["document_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_certifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_certifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_certifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_certifications_verified_by_employee_id_fkey"
            columns: ["verified_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_certifications_verified_by_employee_id_fkey"
            columns: ["verified_by_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_certifications_verified_by_employee_id_fkey"
            columns: ["verified_by_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employee_change_log: {
        Row: {
          change_note: string | null
          change_source: string | null
          changed_by_name: string | null
          changed_by_profile_id: string | null
          changed_by_user_id: string
          created_at: string
          employee_id: string
          employee_name: string
          field_label: string | null
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          table_name: string
        }
        Insert: {
          change_note?: string | null
          change_source?: string | null
          changed_by_name?: string | null
          changed_by_profile_id?: string | null
          changed_by_user_id: string
          created_at?: string
          employee_id: string
          employee_name: string
          field_label?: string | null
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          table_name: string
        }
        Update: {
          change_note?: string | null
          change_source?: string | null
          changed_by_name?: string | null
          changed_by_profile_id?: string | null
          changed_by_user_id?: string
          created_at?: string
          employee_id?: string
          employee_name?: string
          field_label?: string | null
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_change_log_changed_by_profile_id_fkey"
            columns: ["changed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "employee_change_log_changed_by_profile_id_fkey"
            columns: ["changed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_change_log_changed_by_profile_id_fkey"
            columns: ["changed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_change_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_change_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_change_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employee_compensation: {
        Row: {
          benefits_enrolled: boolean | null
          bonus_plan_details: string | null
          ce_budget_total: number | null
          ce_budget_used: number | null
          created_at: string
          effective_date: string | null
          employee_id: string
          employment_status: string | null
          id: string
          pay_rate: number | null
          pay_type: string | null
          updated_at: string
        }
        Insert: {
          benefits_enrolled?: boolean | null
          bonus_plan_details?: string | null
          ce_budget_total?: number | null
          ce_budget_used?: number | null
          created_at?: string
          effective_date?: string | null
          employee_id: string
          employment_status?: string | null
          id?: string
          pay_rate?: number | null
          pay_type?: string | null
          updated_at?: string
        }
        Update: {
          benefits_enrolled?: boolean | null
          bonus_plan_details?: string | null
          ce_budget_total?: number | null
          ce_budget_used?: number | null
          created_at?: string
          effective_date?: string | null
          employee_id?: string
          employment_status?: string | null
          id?: string
          pay_rate?: number | null
          pay_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_compensation_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_compensation_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_compensation_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          employee_id: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          updated_at: string
          uploader_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          employee_id: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          updated_at?: string
          uploader_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          employee_id?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          updated_at?: string
          uploader_id?: string | null
        }
        Relationships: []
      }
      employee_goals: {
        Row: {
          category: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          employee_id: string
          id: string
          progress: number | null
          target_date: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          employee_id: string
          id?: string
          progress?: number | null
          target_date?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          employee_id?: string
          id?: string
          progress?: number | null
          target_date?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      employee_licenses: {
        Row: {
          created_at: string
          employee_id: string
          expiration_date: string | null
          id: string
          is_verified: boolean | null
          issue_date: string | null
          issuing_authority: string | null
          license_number: string
          license_type: string
          state_code: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          employee_id: string
          expiration_date?: string | null
          id?: string
          is_verified?: boolean | null
          issue_date?: string | null
          issuing_authority?: string | null
          license_number: string
          license_type: string
          state_code?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          employee_id?: string
          expiration_date?: string | null
          id?: string
          is_verified?: boolean | null
          issue_date?: string | null
          issuing_authority?: string | null
          license_number?: string
          license_type?: string
          state_code?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      employee_locations: {
        Row: {
          assigned_at: string
          created_at: string
          employee_id: string
          id: string
          is_primary: boolean
          location_id: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          created_at?: string
          employee_id: string
          id?: string
          is_primary?: boolean
          location_id: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          created_at?: string
          employee_id?: string
          id?: string
          is_primary?: boolean
          location_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      employee_notes: {
        Row: {
          author_employee_id: string | null
          author_initials: string | null
          created_at: string
          edited_at: string | null
          edited_by_initials: string | null
          employee_id: string
          hr_only: boolean | null
          id: string
          is_pinned: boolean | null
          note: string | null
          note_type: string | null
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          author_employee_id?: string | null
          author_initials?: string | null
          created_at?: string
          edited_at?: string | null
          edited_by_initials?: string | null
          employee_id: string
          hr_only?: boolean | null
          id?: string
          is_pinned?: boolean | null
          note?: string | null
          note_type?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          author_employee_id?: string | null
          author_initials?: string | null
          created_at?: string
          edited_at?: string | null
          edited_by_initials?: string | null
          employee_id?: string
          hr_only?: boolean | null
          id?: string
          is_pinned?: boolean | null
          note?: string | null
          note_type?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_notes_author_employee_id_fkey"
            columns: ["author_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_notes_author_employee_id_fkey"
            columns: ["author_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_notes_author_employee_id_fkey"
            columns: ["author_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_notes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_notes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_notes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employee_pay_settings: {
        Row: {
          annual_salary: number | null
          created_at: string
          currency: string | null
          effective_from: string | null
          effective_to: string | null
          employee_id: string
          hourly_rate: number | null
          id: string
          overtime_multiplier: number | null
          pay_type: string | null
          updated_at: string
        }
        Insert: {
          annual_salary?: number | null
          created_at?: string
          currency?: string | null
          effective_from?: string | null
          effective_to?: string | null
          employee_id: string
          hourly_rate?: number | null
          id?: string
          overtime_multiplier?: number | null
          pay_type?: string | null
          updated_at?: string
        }
        Update: {
          annual_salary?: number | null
          created_at?: string
          currency?: string | null
          effective_from?: string | null
          effective_to?: string | null
          employee_id?: string
          hourly_rate?: number | null
          id?: string
          overtime_multiplier?: number | null
          pay_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_pay_settings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_pay_settings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_pay_settings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employee_skills: {
        Row: {
          certified_at: string | null
          certified_by_employee_id: string | null
          created_at: string
          employee_id: string
          id: string
          is_goal: boolean | null
          level: number | null
          notes: string | null
          skill_id: string
          updated_at: string
        }
        Insert: {
          certified_at?: string | null
          certified_by_employee_id?: string | null
          created_at?: string
          employee_id: string
          id?: string
          is_goal?: boolean | null
          level?: number | null
          notes?: string | null
          skill_id: string
          updated_at?: string
        }
        Update: {
          certified_at?: string | null
          certified_by_employee_id?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          is_goal?: boolean | null
          level?: number | null
          notes?: string | null
          skill_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_skills_certified_by_employee_id_fkey"
            columns: ["certified_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skills_certified_by_employee_id_fkey"
            columns: ["certified_by_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_skills_certified_by_employee_id_fkey"
            columns: ["certified_by_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_skills_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skills_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_skills_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_library"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_teams: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          role_in_team: string | null
          team_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          role_in_team?: string | null
          team_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          role_in_team?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_teams_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_teams_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_teams_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_time_off_balances: {
        Row: {
          accrued_hours: number
          carryover_hours: number
          created_at: string
          employee_id: string
          id: string
          max_accrual_hours: number | null
          max_carryover_hours: number | null
          pending_hours: number
          period_year: number
          time_off_type_id: string
          updated_at: string
          used_hours: number
        }
        Insert: {
          accrued_hours?: number
          carryover_hours?: number
          created_at?: string
          employee_id: string
          id?: string
          max_accrual_hours?: number | null
          max_carryover_hours?: number | null
          pending_hours?: number
          period_year?: number
          time_off_type_id: string
          updated_at?: string
          used_hours?: number
        }
        Update: {
          accrued_hours?: number
          carryover_hours?: number
          created_at?: string
          employee_id?: string
          id?: string
          max_accrual_hours?: number | null
          max_carryover_hours?: number | null
          pending_hours?: number
          period_year?: number
          time_off_type_id?: string
          updated_at?: string
          used_hours?: number
        }
        Relationships: []
      }
      employee_wallets: {
        Row: {
          created_at: string
          current_balance: number
          employee_id: string
          id: string
          lifetime_earned: number
          lifetime_spent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_balance?: number
          employee_id: string
          id?: string
          lifetime_earned?: number
          lifetime_spent?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_balance?: number
          employee_id?: string
          id?: string
          lifetime_earned?: number
          lifetime_spent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_wallets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_wallets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_wallets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employees: {
        Row: {
          address_city: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          created_at: string
          date_of_birth: string | null
          deleted_at: string | null
          department_id: string | null
          email_personal: string | null
          email_work: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          employee_number: string | null
          employment_status: string | null
          employment_type: string | null
          first_name: string
          geo_lock_enabled: boolean | null
          geo_lock_location_ids: string[] | null
          hire_date: string | null
          id: string
          last_name: string
          last_slack_sync: string | null
          location_id: string | null
          manager_employee_id: string | null
          needs_user_account: boolean | null
          notes_internal: string | null
          onboarding_status: string | null
          phone_mobile: string | null
          phone_work: string | null
          position_id: string | null
          preferred_name: string | null
          profile_id: string | null
          slack_status: string | null
          slack_user_id: string | null
          termination_date: string | null
          termination_reason: string | null
          updated_at: string
          user_created_at: string | null
          user_created_by: string | null
        }
        Insert: {
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          department_id?: string | null
          email_personal?: string | null
          email_work?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employee_number?: string | null
          employment_status?: string | null
          employment_type?: string | null
          first_name: string
          geo_lock_enabled?: boolean | null
          geo_lock_location_ids?: string[] | null
          hire_date?: string | null
          id?: string
          last_name: string
          last_slack_sync?: string | null
          location_id?: string | null
          manager_employee_id?: string | null
          needs_user_account?: boolean | null
          notes_internal?: string | null
          onboarding_status?: string | null
          phone_mobile?: string | null
          phone_work?: string | null
          position_id?: string | null
          preferred_name?: string | null
          profile_id?: string | null
          slack_status?: string | null
          slack_user_id?: string | null
          termination_date?: string | null
          termination_reason?: string | null
          updated_at?: string
          user_created_at?: string | null
          user_created_by?: string | null
        }
        Update: {
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          department_id?: string | null
          email_personal?: string | null
          email_work?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employee_number?: string | null
          employment_status?: string | null
          employment_type?: string | null
          first_name?: string
          geo_lock_enabled?: boolean | null
          geo_lock_location_ids?: string[] | null
          hire_date?: string | null
          id?: string
          last_name?: string
          last_slack_sync?: string | null
          location_id?: string | null
          manager_employee_id?: string | null
          needs_user_account?: boolean | null
          notes_internal?: string | null
          onboarding_status?: string | null
          phone_mobile?: string | null
          phone_work?: string | null
          position_id?: string | null
          preferred_name?: string | null
          profile_id?: string | null
          slack_status?: string | null
          slack_user_id?: string | null
          termination_date?: string | null
          termination_reason?: string | null
          updated_at?: string
          user_created_at?: string | null
          user_created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_employee_id_fkey"
            columns: ["manager_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_employee_id_fkey"
            columns: ["manager_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employees_manager_employee_id_fkey"
            columns: ["manager_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employees_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
        ]
      }
      event_inventory_usage: {
        Row: {
          created_at: string | null
          created_by: string | null
          event_id: string
          id: string
          inventory_item_id: string
          location_deducted_from: string
          notes: string | null
          quantity_used: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          event_id: string
          id?: string
          inventory_item_id: string
          location_deducted_from: string
          notes?: string | null
          quantity_used?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          event_id?: string
          id?: string
          inventory_item_id?: string
          location_deducted_from?: string
          notes?: string | null
          quantity_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_inventory_usage_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "event_inventory_usage_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_inventory_usage_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_inventory_usage_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "marketing_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_inventory_usage_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "marketing_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      event_supplies: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          notes: string | null
          quantity_allocated: number
          quantity_used: number | null
          supply_id: string
          total_cost: number | null
          unit_cost_at_time: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          notes?: string | null
          quantity_allocated?: number
          quantity_used?: number | null
          supply_id: string
          total_cost?: number | null
          unit_cost_at_time?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          notes?: string | null
          quantity_allocated?: number
          quantity_used?: number | null
          supply_id?: string
          total_cost?: number | null
          unit_cost_at_time?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_supplies_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "marketing_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_supplies_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "marketing_supplies"
            referencedColumns: ["id"]
          },
        ]
      }
      ezyvet_contacts: {
        Row: {
          created_at: string
          email: string | null
          ezyvet_id: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          synced_at: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          ezyvet_id?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          synced_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          ezyvet_id?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          synced_at?: string | null
        }
        Relationships: []
      }
      ezyvet_crm_contacts: {
        Row: {
          address_city: string | null
          address_zip: string | null
          breed: string | null
          created_at: string | null
          department: string | null
          division: string | null
          email: string | null
          ezyvet_contact_code: string
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          last_sync_at: string | null
          last_visit: string | null
          phone_mobile: string | null
          referral_source: string | null
          revenue_ytd: number | null
          updated_at: string | null
        }
        Insert: {
          address_city?: string | null
          address_zip?: string | null
          breed?: string | null
          created_at?: string | null
          department?: string | null
          division?: string | null
          email?: string | null
          ezyvet_contact_code: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          last_sync_at?: string | null
          last_visit?: string | null
          phone_mobile?: string | null
          referral_source?: string | null
          revenue_ytd?: number | null
          updated_at?: string | null
        }
        Update: {
          address_city?: string | null
          address_zip?: string | null
          breed?: string | null
          created_at?: string | null
          department?: string | null
          division?: string | null
          email?: string | null
          ezyvet_contact_code?: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          last_sync_at?: string | null
          last_visit?: string | null
          phone_mobile?: string | null
          referral_source?: string | null
          revenue_ytd?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ezyvet_sync_history: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_count: number | null
          error_details: Json | null
          file_name: string | null
          id: string
          inserted_count: number | null
          started_at: string | null
          status: string
          sync_type: string
          total_rows: number | null
          triggered_by: string | null
          updated_count: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_count?: number | null
          error_details?: Json | null
          file_name?: string | null
          id?: string
          inserted_count?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
          total_rows?: number | null
          triggered_by?: string | null
          updated_count?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_count?: number | null
          error_details?: Json | null
          file_name?: string | null
          id?: string
          inserted_count?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
          total_rows?: number | null
          triggered_by?: string | null
          updated_count?: number | null
        }
        Relationships: []
      }
      facility_resource_locations: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean | null
          location_id: string
          notes: string | null
          resource_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean | null
          location_id: string
          notes?: string | null
          resource_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean | null
          location_id?: string
          notes?: string | null
          resource_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_resource_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_resource_locations_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "facility_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_resources: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          company_name: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string
          created_by: string | null
          email: string | null
          emergency_contact: boolean | null
          emergency_phone: string | null
          hours_of_operation: string | null
          id: string
          internal_rating: number | null
          is_active: boolean | null
          is_preferred: boolean | null
          name: string
          notes: string | null
          phone: string | null
          phone_alt: string | null
          resource_type: string
          service_area: string | null
          state: string | null
          updated_at: string
          website: string | null
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_name?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          emergency_contact?: boolean | null
          emergency_phone?: string | null
          hours_of_operation?: string | null
          id?: string
          internal_rating?: number | null
          is_active?: boolean | null
          is_preferred?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          phone_alt?: string | null
          resource_type: string
          service_area?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_name?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          emergency_contact?: boolean | null
          emergency_phone?: string | null
          hours_of_operation?: string | null
          id?: string
          internal_rating?: number | null
          is_active?: boolean | null
          is_preferred?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          phone_alt?: string | null
          resource_type?: string
          service_area?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facility_resources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "facility_resources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_resources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          feature_key: string
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          feature_key: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          feature_key?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          context: Json | null
          created_at: string
          from_employee_id: string | null
          id: string
          is_public: boolean
          message: string | null
          to_employee_id: string
          type: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          from_employee_id?: string | null
          id?: string
          is_public?: boolean
          message?: string | null
          to_employee_id: string
          type?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          from_employee_id?: string | null
          id?: string
          is_public?: boolean
          message?: string | null
          to_employee_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_from_employee_id_fkey"
            columns: ["from_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_from_employee_id_fkey"
            columns: ["from_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "feedback_from_employee_id_fkey"
            columns: ["from_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "feedback_to_employee_id_fkey"
            columns: ["to_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_to_employee_id_fkey"
            columns: ["to_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "feedback_to_employee_id_fkey"
            columns: ["to_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      files: {
        Row: {
          bucket: string | null
          created_at: string
          id: string
          linked_entity_id: string | null
          linked_entity_type: string | null
          mime_type: string | null
          original_name: string | null
          path: string | null
          size_bytes: number | null
          uploader_profile_id: string | null
        }
        Insert: {
          bucket?: string | null
          created_at?: string
          id?: string
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          mime_type?: string | null
          original_name?: string | null
          path?: string | null
          size_bytes?: number | null
          uploader_profile_id?: string | null
        }
        Update: {
          bucket?: string | null
          created_at?: string
          id?: string
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          mime_type?: string | null
          original_name?: string | null
          path?: string | null
          size_bytes?: number | null
          uploader_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_uploader_profile_id_fkey"
            columns: ["uploader_profile_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "files_uploader_profile_id_fkey"
            columns: ["uploader_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_uploader_profile_id_fkey"
            columns: ["uploader_profile_id"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_kpis: {
        Row: {
          created_at: string
          currency: string | null
          id: string
          kpi_key: string
          kpi_label: string | null
          metadata: Json | null
          period_end: string | null
          period_start: string | null
          value: number | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          id?: string
          kpi_key: string
          kpi_label?: string | null
          metadata?: Json | null
          period_end?: string | null
          period_start?: string | null
          value?: number | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          id?: string
          kpi_key?: string
          kpi_label?: string | null
          metadata?: Json | null
          period_end?: string | null
          period_start?: string | null
          value?: number | null
        }
        Relationships: []
      }
      geofences: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          latitude: number | null
          location_id: string | null
          longitude: number | null
          name: string
          radius_meters: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          location_id?: string | null
          longitude?: number | null
          name: string
          radius_meters?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          location_id?: string | null
          longitude?: number | null
          name?: string
          radius_meters?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geofences_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_updates: {
        Row: {
          comment: string | null
          created_at: string
          employee_id: string | null
          goal_id: string
          id: string
          progress_percent: number | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          employee_id?: string | null
          goal_id: string
          id?: string
          progress_percent?: number | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          employee_id?: string | null
          goal_id?: string
          id?: string
          progress_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_updates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_updates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "goal_updates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "goal_updates_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          aligns_to_goal_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          metrics: Json | null
          owner_employee_id: string | null
          progress_percent: number | null
          start_date: string | null
          status: string | null
          target_date: string | null
          title: string
          updated_at: string
          visibility: string | null
        }
        Insert: {
          aligns_to_goal_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metrics?: Json | null
          owner_employee_id?: string | null
          progress_percent?: number | null
          start_date?: string | null
          status?: string | null
          target_date?: string | null
          title: string
          updated_at?: string
          visibility?: string | null
        }
        Update: {
          aligns_to_goal_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metrics?: Json | null
          owner_employee_id?: string | null
          progress_percent?: number | null
          start_date?: string | null
          status?: string | null
          target_date?: string | null
          title?: string
          updated_at?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_aligns_to_goal_id_fkey"
            columns: ["aligns_to_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_owner_employee_id_fkey"
            columns: ["owner_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_owner_employee_id_fkey"
            columns: ["owner_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "goals_owner_employee_id_fkey"
            columns: ["owner_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      influencer_campaigns: {
        Row: {
          campaign_name: string
          campaign_type: string | null
          clicks: number | null
          compensation_amount: number | null
          compensation_type: string | null
          content_urls: string[] | null
          conversions: number | null
          created_at: string | null
          created_by: string | null
          deliverables: string[] | null
          end_date: string | null
          engagements: number | null
          id: string
          impressions: number | null
          influencer_id: string
          notes: string | null
          payment_date: string | null
          payment_status: string | null
          posts_delivered: number | null
          posts_required: number | null
          promo_code_uses: number | null
          reach: number | null
          reels_delivered: number | null
          reels_required: number | null
          start_date: string | null
          status: string | null
          stories_delivered: number | null
          stories_required: number | null
          updated_at: string | null
        }
        Insert: {
          campaign_name: string
          campaign_type?: string | null
          clicks?: number | null
          compensation_amount?: number | null
          compensation_type?: string | null
          content_urls?: string[] | null
          conversions?: number | null
          created_at?: string | null
          created_by?: string | null
          deliverables?: string[] | null
          end_date?: string | null
          engagements?: number | null
          id?: string
          impressions?: number | null
          influencer_id: string
          notes?: string | null
          payment_date?: string | null
          payment_status?: string | null
          posts_delivered?: number | null
          posts_required?: number | null
          promo_code_uses?: number | null
          reach?: number | null
          reels_delivered?: number | null
          reels_required?: number | null
          start_date?: string | null
          status?: string | null
          stories_delivered?: number | null
          stories_required?: number | null
          updated_at?: string | null
        }
        Update: {
          campaign_name?: string
          campaign_type?: string | null
          clicks?: number | null
          compensation_amount?: number | null
          compensation_type?: string | null
          content_urls?: string[] | null
          conversions?: number | null
          created_at?: string | null
          created_by?: string | null
          deliverables?: string[] | null
          end_date?: string | null
          engagements?: number | null
          id?: string
          impressions?: number | null
          influencer_id?: string
          notes?: string | null
          payment_date?: string | null
          payment_status?: string | null
          posts_delivered?: number | null
          posts_required?: number | null
          promo_code_uses?: number | null
          reach?: number | null
          reels_delivered?: number | null
          reels_required?: number | null
          start_date?: string | null
          status?: string | null
          stories_delivered?: number | null
          stories_required?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "influencer_campaigns_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "marketing_influencers"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_content: {
        Row: {
          campaign_id: string | null
          caption: string | null
          comments: number | null
          content_type: string
          content_url: string | null
          created_at: string | null
          hashtags: string[] | null
          id: string
          impressions: number | null
          influencer_id: string
          likes: number | null
          platform: string
          posted_at: string | null
          reach: number | null
          saves: number | null
          shares: number | null
          thumbnail_url: string | null
          updated_at: string | null
          views: number | null
        }
        Insert: {
          campaign_id?: string | null
          caption?: string | null
          comments?: number | null
          content_type: string
          content_url?: string | null
          created_at?: string | null
          hashtags?: string[] | null
          id?: string
          impressions?: number | null
          influencer_id: string
          likes?: number | null
          platform: string
          posted_at?: string | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
          thumbnail_url?: string | null
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          campaign_id?: string | null
          caption?: string | null
          comments?: number | null
          content_type?: string
          content_url?: string | null
          created_at?: string | null
          hashtags?: string[] | null
          id?: string
          impressions?: number | null
          influencer_id?: string
          likes?: number | null
          platform?: string
          posted_at?: string | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
          thumbnail_url?: string | null
          updated_at?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "influencer_content_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "influencer_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_content_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "marketing_influencers"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_notes: {
        Row: {
          author_initials: string | null
          content: string
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          edited_at: string | null
          edited_by: string | null
          edited_by_initials: string | null
          id: string
          influencer_id: string
          is_pinned: boolean | null
          note_type: string
          updated_at: string | null
        }
        Insert: {
          author_initials?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          edited_at?: string | null
          edited_by?: string | null
          edited_by_initials?: string | null
          id?: string
          influencer_id: string
          is_pinned?: boolean | null
          note_type?: string
          updated_at?: string | null
        }
        Update: {
          author_initials?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          edited_at?: string | null
          edited_by?: string | null
          edited_by_initials?: string | null
          id?: string
          influencer_id?: string
          is_pinned?: boolean | null
          note_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "influencer_notes_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "marketing_influencers"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_links: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          internal_notes: string | null
          ip_address_completed: unknown
          link_type: string
          opened_at: string | null
          prefill_email: string | null
          prefill_first_name: string | null
          prefill_last_name: string | null
          resulting_person_id: string | null
          sent_at: string | null
          sent_by: string | null
          status: string
          target_department_id: string | null
          target_event_id: string | null
          target_location_id: string | null
          target_position_id: string | null
          token: string
          user_agent_completed: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          internal_notes?: string | null
          ip_address_completed?: unknown
          link_type: string
          opened_at?: string | null
          prefill_email?: string | null
          prefill_first_name?: string | null
          prefill_last_name?: string | null
          resulting_person_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          target_department_id?: string | null
          target_event_id?: string | null
          target_location_id?: string | null
          target_position_id?: string | null
          token?: string
          user_agent_completed?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          internal_notes?: string | null
          ip_address_completed?: unknown
          link_type?: string
          opened_at?: string | null
          prefill_email?: string | null
          prefill_first_name?: string | null
          prefill_last_name?: string | null
          resulting_person_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          target_department_id?: string | null
          target_event_id?: string | null
          target_location_id?: string | null
          target_position_id?: string | null
          token?: string
          user_agent_completed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "intake_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_links_resulting_person_id_fkey"
            columns: ["resulting_person_id"]
            isOneToOne: false
            referencedRelation: "master_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_links_resulting_person_id_fkey"
            columns: ["resulting_person_id"]
            isOneToOne: false
            referencedRelation: "student_program_view"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "intake_links_resulting_person_id_fkey"
            columns: ["resulting_person_id"]
            isOneToOne: false
            referencedRelation: "unified_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_links_resulting_person_id_fkey"
            columns: ["resulting_person_id"]
            isOneToOne: false
            referencedRelation: "unified_persons_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_links_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "intake_links_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_links_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_links_target_department_id_fkey"
            columns: ["target_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_links_target_location_id_fkey"
            columns: ["target_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_links_target_position_id_fkey"
            columns: ["target_position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_submissions: {
        Row: {
          duplicate_of_person_id: string | null
          form_data: Json
          id: string
          intake_link_id: string
          ip_address: unknown
          is_duplicate: boolean | null
          processed_at: string | null
          processing_error: string | null
          processing_status: string
          resulting_person_id: string | null
          submitted_at: string
          uploaded_files: Json | null
          user_agent: string | null
        }
        Insert: {
          duplicate_of_person_id?: string | null
          form_data?: Json
          id?: string
          intake_link_id: string
          ip_address?: unknown
          is_duplicate?: boolean | null
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string
          resulting_person_id?: string | null
          submitted_at?: string
          uploaded_files?: Json | null
          user_agent?: string | null
        }
        Update: {
          duplicate_of_person_id?: string | null
          form_data?: Json
          id?: string
          intake_link_id?: string
          ip_address?: unknown
          is_duplicate?: boolean | null
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string
          resulting_person_id?: string | null
          submitted_at?: string
          uploaded_files?: Json | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_submissions_duplicate_of_person_id_fkey"
            columns: ["duplicate_of_person_id"]
            isOneToOne: false
            referencedRelation: "master_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_submissions_duplicate_of_person_id_fkey"
            columns: ["duplicate_of_person_id"]
            isOneToOne: false
            referencedRelation: "student_program_view"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "intake_submissions_duplicate_of_person_id_fkey"
            columns: ["duplicate_of_person_id"]
            isOneToOne: false
            referencedRelation: "unified_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_submissions_duplicate_of_person_id_fkey"
            columns: ["duplicate_of_person_id"]
            isOneToOne: false
            referencedRelation: "unified_persons_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_submissions_intake_link_id_fkey"
            columns: ["intake_link_id"]
            isOneToOne: false
            referencedRelation: "intake_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_submissions_resulting_person_id_fkey"
            columns: ["resulting_person_id"]
            isOneToOne: false
            referencedRelation: "master_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_submissions_resulting_person_id_fkey"
            columns: ["resulting_person_id"]
            isOneToOne: false
            referencedRelation: "student_program_view"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "intake_submissions_resulting_person_id_fkey"
            columns: ["resulting_person_id"]
            isOneToOne: false
            referencedRelation: "unified_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_submissions_resulting_person_id_fkey"
            columns: ["resulting_person_id"]
            isOneToOne: false
            referencedRelation: "unified_persons_view"
            referencedColumns: ["id"]
          },
        ]
      }
      job_positions: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          is_manager: boolean
          job_family: string | null
          title: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_manager?: boolean
          job_family?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_manager?: boolean
          job_family?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_activities: {
        Row: {
          created_at: string
          employee_id: string | null
          happened_at: string
          id: string
          lead_id: string
          metadata: Json | null
          summary: string | null
          type: string | null
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          happened_at?: string
          id?: string
          lead_id: string
          metadata?: Json | null
          summary?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          happened_at?: string
          id?: string
          lead_id?: string
          metadata?: Json | null
          summary?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "lead_activities_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          campaign_id: string | null
          company_name: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          lifecycle_stage: string | null
          notes: string | null
          owner_employee_id: string | null
          phone: string | null
          source: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          lifecycle_stage?: string | null
          notes?: string | null
          owner_employee_id?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          lifecycle_stage?: string | null
          notes?: string | null
          owner_employee_id?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_owner_employee_id_fkey"
            columns: ["owner_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_owner_employee_id_fkey"
            columns: ["owner_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "leads_owner_employee_id_fkey"
            columns: ["owner_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      lifecycle_transitions: {
        Row: {
          destination_record_id: string | null
          destination_table: string | null
          from_stage: Database["public"]["Enums"]["person_lifecycle_stage"]
          id: string
          metadata: Json | null
          notes: string | null
          person_id: string
          source_record_id: string | null
          source_table: string | null
          to_stage: Database["public"]["Enums"]["person_lifecycle_stage"]
          transitioned_at: string
          trigger_type: string
          triggered_by: string | null
        }
        Insert: {
          destination_record_id?: string | null
          destination_table?: string | null
          from_stage: Database["public"]["Enums"]["person_lifecycle_stage"]
          id?: string
          metadata?: Json | null
          notes?: string | null
          person_id: string
          source_record_id?: string | null
          source_table?: string | null
          to_stage: Database["public"]["Enums"]["person_lifecycle_stage"]
          transitioned_at?: string
          trigger_type: string
          triggered_by?: string | null
        }
        Update: {
          destination_record_id?: string | null
          destination_table?: string | null
          from_stage?: Database["public"]["Enums"]["person_lifecycle_stage"]
          id?: string
          metadata?: Json | null
          notes?: string | null
          person_id?: string
          source_record_id?: string | null
          source_table?: string | null
          to_stage?: Database["public"]["Enums"]["person_lifecycle_stage"]
          transitioned_at?: string
          trigger_type?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lifecycle_transitions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "master_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lifecycle_transitions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "student_program_view"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "lifecycle_transitions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "unified_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lifecycle_transitions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "unified_persons_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lifecycle_transitions_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "lifecycle_transitions_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lifecycle_transitions_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          code: string | null
          country: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          postal_code: string | null
          state: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      manager_insights: {
        Row: {
          action_items: Json | null
          actioned_at: string | null
          content: string
          department_id: string | null
          dismissed_at: string | null
          expires_at: string | null
          generated_at: string | null
          id: string
          insight_type: string
          manager_id: string
          priority: string | null
          read_at: string | null
          title: string
        }
        Insert: {
          action_items?: Json | null
          actioned_at?: string | null
          content: string
          department_id?: string | null
          dismissed_at?: string | null
          expires_at?: string | null
          generated_at?: string | null
          id?: string
          insight_type: string
          manager_id: string
          priority?: string | null
          read_at?: string | null
          title: string
        }
        Update: {
          action_items?: Json | null
          actioned_at?: string | null
          content?: string
          department_id?: string | null
          dismissed_at?: string | null
          expires_at?: string | null
          generated_at?: string | null
          id?: string
          insight_type?: string
          manager_id?: string
          priority?: string | null
          read_at?: string | null
          title?: string
        }
        Relationships: []
      }
      marketing_assets: {
        Row: {
          campaign_id: string | null
          content: string | null
          created_at: string
          file_id: string | null
          id: string
          notes: string | null
          title: string | null
          type: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          campaign_id?: string | null
          content?: string | null
          created_at?: string
          file_id?: string | null
          id?: string
          notes?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          campaign_id?: string | null
          content?: string | null
          created_at?: string
          file_id?: string | null
          id?: string
          notes?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_assets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_assets_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          budget: number | null
          channel: string | null
          clients_converted: number | null
          created_at: string
          description: string | null
          end_date: string | null
          events_count: number | null
          goal_clients: number | null
          id: string
          leads_generated: number | null
          name: string
          objective: string | null
          spend_actual: number | null
          start_date: string | null
          status: string | null
          target_audience: string | null
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          budget?: number | null
          channel?: string | null
          clients_converted?: number | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          events_count?: number | null
          goal_clients?: number | null
          id?: string
          leads_generated?: number | null
          name: string
          objective?: string | null
          spend_actual?: number | null
          start_date?: string | null
          status?: string | null
          target_audience?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          budget?: number | null
          channel?: string | null
          clients_converted?: number | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          events_count?: number | null
          goal_clients?: number | null
          id?: string
          leads_generated?: number | null
          name?: string
          objective?: string | null
          spend_actual?: number | null
          start_date?: string | null
          status?: string | null
          target_audience?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      marketing_events: {
        Row: {
          actual_attendance: number | null
          attachments: Json | null
          budget: number | null
          budget_remaining: number | null
          campaign_id: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          end_time: string | null
          event_date: string
          event_type: string | null
          expected_attendance: number | null
          external_links: Json | null
          id: string
          inventory_used: Json | null
          leads_collected: number | null
          location: string | null
          name: string
          notes: string | null
          post_event_notes: string | null
          registration_link: string | null
          registration_required: boolean | null
          revenue_generated: number | null
          staffing_needs: string | null
          staffing_status: string | null
          start_time: string | null
          status: string
          supplies_budget_allocated: number | null
          supplies_budget_used: number | null
          supplies_needed: string | null
          updated_at: string
          visitors_count: number | null
        }
        Insert: {
          actual_attendance?: number | null
          attachments?: Json | null
          budget?: number | null
          budget_remaining?: number | null
          campaign_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date: string
          event_type?: string | null
          expected_attendance?: number | null
          external_links?: Json | null
          id?: string
          inventory_used?: Json | null
          leads_collected?: number | null
          location?: string | null
          name: string
          notes?: string | null
          post_event_notes?: string | null
          registration_link?: string | null
          registration_required?: boolean | null
          revenue_generated?: number | null
          staffing_needs?: string | null
          staffing_status?: string | null
          start_time?: string | null
          status?: string
          supplies_budget_allocated?: number | null
          supplies_budget_used?: number | null
          supplies_needed?: string | null
          updated_at?: string
          visitors_count?: number | null
        }
        Update: {
          actual_attendance?: number | null
          attachments?: Json | null
          budget?: number | null
          budget_remaining?: number | null
          campaign_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date?: string
          event_type?: string | null
          expected_attendance?: number | null
          external_links?: Json | null
          id?: string
          inventory_used?: Json | null
          leads_collected?: number | null
          location?: string | null
          name?: string
          notes?: string | null
          post_event_notes?: string | null
          registration_link?: string | null
          registration_required?: boolean | null
          revenue_generated?: number | null
          staffing_needs?: string | null
          staffing_status?: string | null
          start_time?: string | null
          status?: string
          supplies_budget_allocated?: number | null
          supplies_budget_used?: number | null
          supplies_needed?: string | null
          updated_at?: string
          visitors_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_folders: {
        Row: {
          admin_only: boolean | null
          color: string | null
          created_at: string
          description: string | null
          external_url: string | null
          folder_type: string | null
          icon: string | null
          id: string
          internal_route: string | null
          is_external: boolean | null
          name: string
          parent_id: string | null
          path: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          admin_only?: boolean | null
          color?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          folder_type?: string | null
          icon?: string | null
          id?: string
          internal_route?: string | null
          is_external?: boolean | null
          name: string
          parent_id?: string | null
          path?: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          admin_only?: boolean | null
          color?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          folder_type?: string | null
          icon?: string | null
          id?: string
          internal_route?: string | null
          is_external?: boolean | null
          name?: string
          parent_id?: string | null
          path?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "marketing_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_influencers: {
        Row: {
          agreement_details: string | null
          audience_age_range: string | null
          audience_gender_split: string | null
          audience_location: string | null
          avg_comments: number | null
          avg_likes: number | null
          avg_saves: number | null
          avg_shares: number | null
          avg_views: number | null
          bio: string | null
          brand_alignment_score: number | null
          collaboration_type: string | null
          commission_percentage: number | null
          compensation_rate: number | null
          compensation_type: string | null
          contact_name: string
          content_guidelines: string | null
          content_niche: string | null
          content_rights: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          conversion_rate: number | null
          created_at: string | null
          created_by: string | null
          discovered_via: string | null
          email: string | null
          engagement_rate: number | null
          events_attended: string[] | null
          exclusivity_terms: string | null
          ezyvet_tracking: string | null
          facebook_followers: number | null
          facebook_url: string | null
          follower_count: number | null
          highest_platform: string | null
          id: string
          instagram_followers: number | null
          instagram_handle: string | null
          instagram_url: string | null
          last_contact_date: string | null
          last_post_date: string | null
          location: string | null
          media_kit_url: string | null
          needs_followup: boolean | null
          next_followup_date: string | null
          notes: string | null
          pet_age: string | null
          pet_breed: string | null
          pet_instagram: string | null
          pet_name: string | null
          pet_type: string | null
          phone: string | null
          posts_completed: number | null
          preferred_content_types: string[] | null
          priority: string | null
          profile_image_url: string | null
          promo_code: string | null
          reels_completed: number | null
          referral_source: string | null
          relationship_score: number | null
          relationship_status: string | null
          roi: number | null
          source: string | null
          status: Database["public"]["Enums"]["influencer_status"]
          stories_completed: number | null
          tags: string[] | null
          tier: string | null
          tiktok_followers: number | null
          tiktok_handle: string | null
          total_campaigns: number | null
          total_clicks: number | null
          total_conversions: number | null
          total_impressions: number | null
          total_paid: number | null
          total_value_generated: number | null
          updated_at: string | null
          youtube_subscribers: number | null
          youtube_url: string | null
        }
        Insert: {
          agreement_details?: string | null
          audience_age_range?: string | null
          audience_gender_split?: string | null
          audience_location?: string | null
          avg_comments?: number | null
          avg_likes?: number | null
          avg_saves?: number | null
          avg_shares?: number | null
          avg_views?: number | null
          bio?: string | null
          brand_alignment_score?: number | null
          collaboration_type?: string | null
          commission_percentage?: number | null
          compensation_rate?: number | null
          compensation_type?: string | null
          contact_name: string
          content_guidelines?: string | null
          content_niche?: string | null
          content_rights?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          conversion_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          discovered_via?: string | null
          email?: string | null
          engagement_rate?: number | null
          events_attended?: string[] | null
          exclusivity_terms?: string | null
          ezyvet_tracking?: string | null
          facebook_followers?: number | null
          facebook_url?: string | null
          follower_count?: number | null
          highest_platform?: string | null
          id?: string
          instagram_followers?: number | null
          instagram_handle?: string | null
          instagram_url?: string | null
          last_contact_date?: string | null
          last_post_date?: string | null
          location?: string | null
          media_kit_url?: string | null
          needs_followup?: boolean | null
          next_followup_date?: string | null
          notes?: string | null
          pet_age?: string | null
          pet_breed?: string | null
          pet_instagram?: string | null
          pet_name?: string | null
          pet_type?: string | null
          phone?: string | null
          posts_completed?: number | null
          preferred_content_types?: string[] | null
          priority?: string | null
          profile_image_url?: string | null
          promo_code?: string | null
          reels_completed?: number | null
          referral_source?: string | null
          relationship_score?: number | null
          relationship_status?: string | null
          roi?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["influencer_status"]
          stories_completed?: number | null
          tags?: string[] | null
          tier?: string | null
          tiktok_followers?: number | null
          tiktok_handle?: string | null
          total_campaigns?: number | null
          total_clicks?: number | null
          total_conversions?: number | null
          total_impressions?: number | null
          total_paid?: number | null
          total_value_generated?: number | null
          updated_at?: string | null
          youtube_subscribers?: number | null
          youtube_url?: string | null
        }
        Update: {
          agreement_details?: string | null
          audience_age_range?: string | null
          audience_gender_split?: string | null
          audience_location?: string | null
          avg_comments?: number | null
          avg_likes?: number | null
          avg_saves?: number | null
          avg_shares?: number | null
          avg_views?: number | null
          bio?: string | null
          brand_alignment_score?: number | null
          collaboration_type?: string | null
          commission_percentage?: number | null
          compensation_rate?: number | null
          compensation_type?: string | null
          contact_name?: string
          content_guidelines?: string | null
          content_niche?: string | null
          content_rights?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          conversion_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          discovered_via?: string | null
          email?: string | null
          engagement_rate?: number | null
          events_attended?: string[] | null
          exclusivity_terms?: string | null
          ezyvet_tracking?: string | null
          facebook_followers?: number | null
          facebook_url?: string | null
          follower_count?: number | null
          highest_platform?: string | null
          id?: string
          instagram_followers?: number | null
          instagram_handle?: string | null
          instagram_url?: string | null
          last_contact_date?: string | null
          last_post_date?: string | null
          location?: string | null
          media_kit_url?: string | null
          needs_followup?: boolean | null
          next_followup_date?: string | null
          notes?: string | null
          pet_age?: string | null
          pet_breed?: string | null
          pet_instagram?: string | null
          pet_name?: string | null
          pet_type?: string | null
          phone?: string | null
          posts_completed?: number | null
          preferred_content_types?: string[] | null
          priority?: string | null
          profile_image_url?: string | null
          promo_code?: string | null
          reels_completed?: number | null
          referral_source?: string | null
          relationship_score?: number | null
          relationship_status?: string | null
          roi?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["influencer_status"]
          stories_completed?: number | null
          tags?: string[] | null
          tier?: string | null
          tiktok_followers?: number | null
          tiktok_handle?: string | null
          total_campaigns?: number | null
          total_clicks?: number | null
          total_conversions?: number | null
          total_impressions?: number | null
          total_paid?: number | null
          total_value_generated?: number | null
          updated_at?: string | null
          youtube_subscribers?: number | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      marketing_inventory: {
        Row: {
          boxes_on_hand: number | null
          category: Database["public"]["Enums"]["inventory_category"]
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_low_stock: boolean | null
          item_name: string
          last_ordered: string | null
          notes: string | null
          order_quantity: number | null
          quantity_mpmv: number
          quantity_offsite: number
          quantity_sherman_oaks: number | null
          quantity_valley: number | null
          quantity_venice: number | null
          reorder_point: number
          supplier: string | null
          total_quantity: number | null
          unit_cost: number | null
          units_per_box: number | null
          updated_at: string | null
        }
        Insert: {
          boxes_on_hand?: number | null
          category?: Database["public"]["Enums"]["inventory_category"]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_low_stock?: boolean | null
          item_name: string
          last_ordered?: string | null
          notes?: string | null
          order_quantity?: number | null
          quantity_mpmv?: number
          quantity_offsite?: number
          quantity_sherman_oaks?: number | null
          quantity_valley?: number | null
          quantity_venice?: number | null
          reorder_point?: number
          supplier?: string | null
          total_quantity?: number | null
          unit_cost?: number | null
          units_per_box?: number | null
          updated_at?: string | null
        }
        Update: {
          boxes_on_hand?: number | null
          category?: Database["public"]["Enums"]["inventory_category"]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_low_stock?: boolean | null
          item_name?: string
          last_ordered?: string | null
          notes?: string | null
          order_quantity?: number | null
          quantity_mpmv?: number
          quantity_offsite?: number
          quantity_sherman_oaks?: number | null
          quantity_valley?: number | null
          quantity_venice?: number | null
          reorder_point?: number
          supplier?: string | null
          total_quantity?: number | null
          unit_cost?: number | null
          units_per_box?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      marketing_leads: {
        Row: {
          campaign_id: string | null
          company: string | null
          contact_info: string | null
          created_at: string
          email: string | null
          event_id: string | null
          first_name: string | null
          id: string
          interest_level: string | null
          last_name: string | null
          lead_name: string
          notes: string | null
          phone: string | null
          source: string | null
          source_event_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          company?: string | null
          contact_info?: string | null
          created_at?: string
          email?: string | null
          event_id?: string | null
          first_name?: string | null
          id?: string
          interest_level?: string | null
          last_name?: string | null
          lead_name: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          source_event_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          company?: string | null
          contact_info?: string | null
          created_at?: string
          email?: string | null
          event_id?: string | null
          first_name?: string | null
          id?: string
          interest_level?: string | null
          last_name?: string | null
          lead_name?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          source_event_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_leads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "marketing_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_leads_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "marketing_events"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_partner_contacts: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          notes: string | null
          partner_id: string
          phone: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          notes?: string | null
          partner_id: string
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          notes?: string | null
          partner_id?: string
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_partner_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "marketing_partner_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_partner_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_partner_contacts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "marketing_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_partner_notes: {
        Row: {
          author_initials: string | null
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
          edited_at: string | null
          edited_by: string | null
          edited_by_initials: string | null
          id: string
          is_pinned: boolean | null
          note_type: string | null
          partner_id: string
          updated_at: string
        }
        Insert: {
          author_initials?: string | null
          category?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          edited_at?: string | null
          edited_by?: string | null
          edited_by_initials?: string | null
          id?: string
          is_pinned?: boolean | null
          note_type?: string | null
          partner_id: string
          updated_at?: string
        }
        Update: {
          author_initials?: string | null
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          edited_at?: string | null
          edited_by?: string | null
          edited_by_initials?: string | null
          id?: string
          is_pinned?: boolean | null
          note_type?: string | null
          partner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_partner_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "marketing_partner_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_partner_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_partner_notes_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "marketing_partner_notes_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_partner_notes_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_partner_notes_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "marketing_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_partners: {
        Row: {
          account_email: string | null
          account_number: string | null
          account_password: string | null
          address: string | null
          best_contact_person: string | null
          category: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          events_attended: string[] | null
          facebook_url: string | null
          id: string
          instagram_handle: string | null
          last_contact_date: string | null
          last_visit_date: string | null
          membership_end: string | null
          membership_fee: number | null
          membership_level: string | null
          membership_start: string | null
          name: string
          needs_followup: boolean | null
          next_followup_date: string | null
          notes: string | null
          partner_type: Database["public"]["Enums"]["marketing_partner_type"]
          partnership_value: string | null
          payment_amount: number | null
          payment_date: string | null
          payment_status: string | null
          preferred_contact_time: string | null
          preferred_visit_day: string | null
          priority: string | null
          proximity_to_location: string | null
          relationship_score: number | null
          relationship_status: string | null
          services_provided: string | null
          status: Database["public"]["Enums"]["marketing_partner_status"]
          tiktok_handle: string | null
          updated_at: string | null
          visit_frequency: string | null
          website: string | null
          youtube_url: string | null
        }
        Insert: {
          account_email?: string | null
          account_number?: string | null
          account_password?: string | null
          address?: string | null
          best_contact_person?: string | null
          category?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          events_attended?: string[] | null
          facebook_url?: string | null
          id?: string
          instagram_handle?: string | null
          last_contact_date?: string | null
          last_visit_date?: string | null
          membership_end?: string | null
          membership_fee?: number | null
          membership_level?: string | null
          membership_start?: string | null
          name: string
          needs_followup?: boolean | null
          next_followup_date?: string | null
          notes?: string | null
          partner_type?: Database["public"]["Enums"]["marketing_partner_type"]
          partnership_value?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_status?: string | null
          preferred_contact_time?: string | null
          preferred_visit_day?: string | null
          priority?: string | null
          proximity_to_location?: string | null
          relationship_score?: number | null
          relationship_status?: string | null
          services_provided?: string | null
          status?: Database["public"]["Enums"]["marketing_partner_status"]
          tiktok_handle?: string | null
          updated_at?: string | null
          visit_frequency?: string | null
          website?: string | null
          youtube_url?: string | null
        }
        Update: {
          account_email?: string | null
          account_number?: string | null
          account_password?: string | null
          address?: string | null
          best_contact_person?: string | null
          category?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          events_attended?: string[] | null
          facebook_url?: string | null
          id?: string
          instagram_handle?: string | null
          last_contact_date?: string | null
          last_visit_date?: string | null
          membership_end?: string | null
          membership_fee?: number | null
          membership_level?: string | null
          membership_start?: string | null
          name?: string
          needs_followup?: boolean | null
          next_followup_date?: string | null
          notes?: string | null
          partner_type?: Database["public"]["Enums"]["marketing_partner_type"]
          partnership_value?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_status?: string | null
          preferred_contact_time?: string | null
          preferred_visit_day?: string | null
          priority?: string | null
          proximity_to_location?: string | null
          relationship_score?: number | null
          relationship_status?: string | null
          services_provided?: string | null
          status?: Database["public"]["Enums"]["marketing_partner_status"]
          tiktok_handle?: string | null
          updated_at?: string | null
          visit_frequency?: string | null
          website?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      marketing_resources: {
        Row: {
          address: string | null
          admin_only: boolean | null
          category: string
          contact_name: string | null
          created_at: string | null
          description: string | null
          email: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          folder_path: string | null
          id: string
          is_active: boolean | null
          is_archived: boolean | null
          is_preferred: boolean | null
          name: string
          notes: string | null
          phone: string | null
          tags: string[] | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          admin_only?: boolean | null
          category: string
          contact_name?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          folder_path?: string | null
          id?: string
          is_active?: boolean | null
          is_archived?: boolean | null
          is_preferred?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          admin_only?: boolean | null
          category?: string
          contact_name?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          folder_path?: string | null
          id?: string
          is_active?: boolean | null
          is_archived?: boolean | null
          is_preferred?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      marketing_spending: {
        Row: {
          amount: number
          approved_by: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          notes: string | null
          paid_by: string | null
          payment_date: string | null
          payment_method: string | null
          receipt_sent: boolean | null
          receipt_sent_date: string | null
          service_end: string | null
          service_start: string | null
          status: string | null
          updated_at: string | null
          vendor: string
        }
        Insert: {
          amount: number
          approved_by?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          notes?: string | null
          paid_by?: string | null
          payment_date?: string | null
          payment_method?: string | null
          receipt_sent?: boolean | null
          receipt_sent_date?: string | null
          service_end?: string | null
          service_start?: string | null
          status?: string | null
          updated_at?: string | null
          vendor: string
        }
        Update: {
          amount?: number
          approved_by?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          notes?: string | null
          paid_by?: string | null
          payment_date?: string | null
          payment_method?: string | null
          receipt_sent?: boolean | null
          receipt_sent_date?: string | null
          service_end?: string | null
          service_start?: string | null
          status?: string | null
          updated_at?: string | null
          vendor?: string
        }
        Relationships: []
      }
      marketing_supplies: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          quantity_on_hand: number
          reorder_level: number | null
          sku: string | null
          supplier: string | null
          unit_cost: number
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          quantity_on_hand?: number
          reorder_level?: number | null
          sku?: string | null
          supplier?: string | null
          unit_cost?: number
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          quantity_on_hand?: number
          reorder_level?: number | null
          sku?: string | null
          supplier?: string | null
          unit_cost?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      marketplace_gigs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          bounty_value: number
          category: string | null
          claimed_at: string | null
          claimed_by: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: string | null
          duration_minutes: number
          flake_penalty: number
          icon: string | null
          id: string
          is_recurring: boolean | null
          max_claims: number | null
          proof_notes: string | null
          proof_url: string | null
          rejection_reason: string | null
          status: string
          times_completed: number | null
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          bounty_value: number
          category?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number
          flake_penalty?: number
          icon?: string | null
          id?: string
          is_recurring?: boolean | null
          max_claims?: number | null
          proof_notes?: string | null
          proof_url?: string | null
          rejection_reason?: string | null
          status?: string
          times_completed?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          bounty_value?: number
          category?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number
          flake_penalty?: number
          icon?: string | null
          id?: string
          is_recurring?: boolean | null
          max_claims?: number | null
          proof_notes?: string | null
          proof_url?: string | null
          rejection_reason?: string | null
          status?: string
          times_completed?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_gigs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "marketplace_gigs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_gigs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_gigs_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_gigs_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "marketplace_gigs_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "marketplace_gigs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "marketplace_gigs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_gigs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_redemptions: {
        Row: {
          cost_paid: number
          created_at: string
          denial_reason: string | null
          employee_id: string
          fulfilled_at: string | null
          fulfilled_by: string | null
          fulfillment_notes: string | null
          id: string
          reward_id: string
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          cost_paid: number
          created_at?: string
          denial_reason?: string | null
          employee_id: string
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          fulfillment_notes?: string | null
          id?: string
          reward_id: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          cost_paid?: number
          created_at?: string
          denial_reason?: string | null
          employee_id?: string
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          fulfillment_notes?: string | null
          id?: string
          reward_id?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_redemptions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_redemptions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "marketplace_redemptions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "marketplace_redemptions_fulfilled_by_fkey"
            columns: ["fulfilled_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "marketplace_redemptions_fulfilled_by_fkey"
            columns: ["fulfilled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_redemptions_fulfilled_by_fkey"
            columns: ["fulfilled_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "marketplace_rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_redemptions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "marketplace_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_rewards: {
        Row: {
          category: string | null
          cost: number
          created_at: string
          created_by: string | null
          description: string | null
          fulfillment_notes: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          requires_approval: boolean | null
          stock_quantity: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          cost: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          fulfillment_notes?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          requires_approval?: boolean | null
          stock_quantity?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          cost?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          fulfillment_notes?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          requires_approval?: boolean | null
          stock_quantity?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_rewards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "marketplace_rewards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_rewards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          created_by: string | null
          description: string | null
          employee_id: string
          gig_id: string | null
          id: string
          notes: string | null
          reward_id: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id: string
          gig_id?: string | null
          id?: string
          notes?: string | null
          reward_id?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id?: string
          gig_id?: string | null
          id?: string
          notes?: string | null
          reward_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "marketplace_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "marketplace_transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "marketplace_transactions_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "marketplace_gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_transactions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "marketplace_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      med_ops_partner_contacts: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          partner_id: string
          phone: string | null
          preferred_contact_method: string | null
          relationship_notes: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          partner_id: string
          phone?: string | null
          preferred_contact_method?: string | null
          relationship_notes?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          partner_id?: string
          phone?: string | null
          preferred_contact_method?: string | null
          relationship_notes?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "med_ops_partner_contacts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "med_ops_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      med_ops_partner_notes: {
        Row: {
          contacted_person: string | null
          created_at: string | null
          created_by: string | null
          id: string
          next_steps: string | null
          outcome: string | null
          partner_id: string
          summary: string
          visit_date: string
          visit_type: string
        }
        Insert: {
          contacted_person?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          next_steps?: string | null
          outcome?: string | null
          partner_id: string
          summary: string
          visit_date?: string
          visit_type?: string
        }
        Update: {
          contacted_person?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          next_steps?: string | null
          outcome?: string | null
          partner_id?: string
          summary?: string
          visit_date?: string
          visit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "med_ops_partner_notes_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "med_ops_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      med_ops_partners: {
        Row: {
          account_number: string | null
          account_rep: string | null
          address: string | null
          average_monthly_spend: number | null
          category: string
          color: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_preferred: boolean | null
          last_contact_date: string | null
          logo_url: string | null
          name: string
          notes: string | null
          products: string[] | null
          spend_last_year: number | null
          spend_ytd: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          account_number?: string | null
          account_rep?: string | null
          address?: string | null
          average_monthly_spend?: number | null
          category: string
          color?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          last_contact_date?: string | null
          logo_url?: string | null
          name: string
          notes?: string | null
          products?: string[] | null
          spend_last_year?: number | null
          spend_ytd?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          account_number?: string | null
          account_rep?: string | null
          address?: string | null
          average_monthly_spend?: number | null
          category?: string
          color?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          last_contact_date?: string | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          products?: string[] | null
          spend_last_year?: number | null
          spend_ytd?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      medical_boards: {
        Row: {
          assigned_to: string | null
          breed: string | null
          check_in_time: string | null
          created_at: string | null
          department: string
          estimated_time: number | null
          id: string
          is_urgent: boolean | null
          notes: string | null
          owner_name: string | null
          owner_phone: string | null
          patient_name: string
          priority: string | null
          room: string | null
          species: string
          status: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          breed?: string | null
          check_in_time?: string | null
          created_at?: string | null
          department: string
          estimated_time?: number | null
          id?: string
          is_urgent?: boolean | null
          notes?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          patient_name: string
          priority?: string | null
          room?: string | null
          species: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          breed?: string | null
          check_in_time?: string | null
          created_at?: string | null
          department?: string
          estimated_time?: number | null
          id?: string
          is_urgent?: boolean | null
          notes?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          patient_name?: string
          priority?: string | null
          room?: string | null
          species?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      mentorships: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          mentee_employee_id: string
          mentee_notes: string | null
          mentor_employee_id: string
          mentor_notes: string | null
          skill_id: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          mentee_employee_id: string
          mentee_notes?: string | null
          mentor_employee_id: string
          mentor_notes?: string | null
          skill_id: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          mentee_employee_id?: string
          mentee_notes?: string | null
          mentor_employee_id?: string
          mentor_notes?: string | null
          skill_id?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorships_mentee_employee_id_fkey"
            columns: ["mentee_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorships_mentee_employee_id_fkey"
            columns: ["mentee_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "mentorships_mentee_employee_id_fkey"
            columns: ["mentee_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "mentorships_mentor_employee_id_fkey"
            columns: ["mentor_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorships_mentor_employee_id_fkey"
            columns: ["mentor_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "mentorships_mentor_employee_id_fkey"
            columns: ["mentor_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "mentorships_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_library"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          blocks: Json | null
          channel: string | null
          created_at: string
          error_message: string | null
          id: string
          max_retries: number | null
          message: string
          metadata: Json | null
          priority: number | null
          retry_count: number | null
          scheduled_for: string | null
          sent_at: string | null
          slack_user_id: string | null
          status: string
          trigger_id: string | null
          updated_at: string
        }
        Insert: {
          blocks?: Json | null
          channel?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          max_retries?: number | null
          message: string
          metadata?: Json | null
          priority?: number | null
          retry_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          slack_user_id?: string | null
          status?: string
          trigger_id?: string | null
          updated_at?: string
        }
        Update: {
          blocks?: Json | null
          channel?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          max_retries?: number | null
          message?: string
          metadata?: Json | null
          priority?: number | null
          retry_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          slack_user_id?: string | null
          status?: string
          trigger_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_trigger_id_fkey"
            columns: ["trigger_id"]
            isOneToOne: false
            referencedRelation: "notification_triggers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_triggers: {
        Row: {
          channel_target: string | null
          created_at: string
          description: string | null
          event_type: string
          id: string
          is_active: boolean | null
          message_template: string | null
          name: string
          send_dm: boolean | null
          updated_at: string
        }
        Insert: {
          channel_target?: string | null
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          is_active?: boolean | null
          message_template?: string | null
          name: string
          send_dm?: boolean | null
          updated_at?: string
        }
        Update: {
          channel_target?: string | null
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          is_active?: boolean | null
          message_template?: string | null
          name?: string
          send_dm?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          category: string | null
          closed_at: string | null
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          profile_id: string
          read_at: string | null
          requires_action: boolean | null
          title: string | null
          type: string | null
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          category?: string | null
          closed_at?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          profile_id: string
          read_at?: string | null
          requires_action?: boolean | null
          title?: string | null
          type?: string | null
        }
        Update: {
          action_url?: string | null
          body?: string | null
          category?: string | null
          closed_at?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          profile_id?: string
          read_at?: string | null
          requires_action?: boolean | null
          title?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_checklist: {
        Row: {
          background_check: boolean
          candidate_id: string
          contract_sent: boolean
          contract_signed: boolean
          created_at: string
          email_created: boolean
          id: string
          start_date: string | null
          uniform_ordered: boolean
          updated_at: string
        }
        Insert: {
          background_check?: boolean
          candidate_id: string
          contract_sent?: boolean
          contract_signed?: boolean
          created_at?: string
          email_created?: boolean
          id?: string
          start_date?: string | null
          uniform_ordered?: boolean
          updated_at?: string
        }
        Update: {
          background_check?: boolean
          candidate_id?: string
          contract_sent?: boolean
          contract_signed?: boolean
          created_at?: string
          email_created?: boolean
          id?: string
          start_date?: string | null
          uniform_ordered?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_checklist_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_sent: boolean | null
          notification_type: string
          onboarding_id: string
          recipient_email: string | null
          recipient_type: string
          sent_at: string | null
          subject: string
          task_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_sent?: boolean | null
          notification_type: string
          onboarding_id: string
          recipient_email?: string | null
          recipient_type: string
          sent_at?: string | null
          subject: string
          task_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_sent?: boolean | null
          notification_type?: string
          onboarding_id?: string
          recipient_email?: string | null
          recipient_type?: string
          sent_at?: string | null
          subject?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_notifications_onboarding_id_fkey"
            columns: ["onboarding_id"]
            isOneToOne: false
            referencedRelation: "candidate_onboarding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "candidate_onboarding_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_stages: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_required: boolean | null
          name: string
          sort_order: number
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_required?: boolean | null
          name: string
          sort_order?: number
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_required?: boolean | null
          name?: string
          sort_order?: number
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_stages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_task_templates: {
        Row: {
          created_at: string
          description: string | null
          document_category: string | null
          estimated_minutes: number | null
          id: string
          instructions: string | null
          is_required: boolean | null
          name: string
          notify_on_complete: boolean | null
          requires_upload: boolean | null
          sort_order: number
          stage_id: string
          task_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_category?: string | null
          estimated_minutes?: number | null
          id?: string
          instructions?: string | null
          is_required?: boolean | null
          name: string
          notify_on_complete?: boolean | null
          requires_upload?: boolean | null
          sort_order?: number
          stage_id: string
          task_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          document_category?: string | null
          estimated_minutes?: number | null
          id?: string
          instructions?: string | null
          is_required?: boolean | null
          name?: string
          notify_on_complete?: boolean | null
          requires_upload?: boolean | null
          sort_order?: number
          stage_id?: string
          task_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_task_templates_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "onboarding_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_templates: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          position_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          position_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          position_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "onboarding_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_templates_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_templates_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      page_access: {
        Row: {
          access_level: string
          created_at: string
          id: string
          page_id: string
          role_key: string
          updated_at: string
        }
        Insert: {
          access_level?: string
          created_at?: string
          id?: string
          page_id: string
          role_key: string
          updated_at?: string
        }
        Update: {
          access_level?: string
          created_at?: string
          id?: string
          page_id?: string
          role_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_access_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "access_matrix_view"
            referencedColumns: ["page_id"]
          },
          {
            foreignKeyName: "page_access_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "page_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      page_definitions: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          path: string
          section: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          path: string
          section: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          path?: string
          section?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      partner_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          partner_id: string
          phone: string | null
          preferred_contact_method: string | null
          relationship_notes: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          partner_id: string
          phone?: string | null
          preferred_contact_method?: string | null
          relationship_notes?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          partner_id?: string
          phone?: string | null
          preferred_contact_method?: string | null
          relationship_notes?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_contacts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_contacts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "referral_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_events: {
        Row: {
          booth_location: string | null
          booth_size: string | null
          confirmation_date: string | null
          created_at: string
          created_by: string | null
          event_date: string | null
          event_id: string | null
          event_name: string | null
          id: string
          is_confirmed: boolean | null
          notes: string | null
          participation_role: string | null
          partner_id: string
          updated_at: string
        }
        Insert: {
          booth_location?: string | null
          booth_size?: string | null
          confirmation_date?: string | null
          created_at?: string
          created_by?: string | null
          event_date?: string | null
          event_id?: string | null
          event_name?: string | null
          id?: string
          is_confirmed?: boolean | null
          notes?: string | null
          participation_role?: string | null
          partner_id: string
          updated_at?: string
        }
        Update: {
          booth_location?: string | null
          booth_size?: string | null
          confirmation_date?: string | null
          created_at?: string
          created_by?: string | null
          event_date?: string | null
          event_id?: string | null
          event_name?: string | null
          id?: string
          is_confirmed?: boolean | null
          notes?: string | null
          participation_role?: string | null
          partner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "partner_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "marketing_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_events_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_events_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "referral_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_goals: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          current_value: number | null
          description: string | null
          goal_type: string
          id: string
          partner_id: string
          status: string | null
          target_date: string | null
          target_value: number | null
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          description?: string | null
          goal_type: string
          id?: string
          partner_id: string
          status?: string | null
          target_date?: string | null
          target_value?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          description?: string | null
          goal_type?: string
          id?: string
          partner_id?: string
          status?: string | null
          target_date?: string | null
          target_value?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "partner_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_goals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_goals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "referral_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_notes: {
        Row: {
          author_initials: string | null
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
          edited_at: string | null
          edited_by: string | null
          edited_by_initials: string | null
          id: string
          is_pinned: boolean | null
          note_type: string | null
          partner_id: string
          updated_at: string
        }
        Insert: {
          author_initials?: string | null
          category?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          edited_at?: string | null
          edited_by?: string | null
          edited_by_initials?: string | null
          id?: string
          is_pinned?: boolean | null
          note_type?: string | null
          partner_id: string
          updated_at?: string
        }
        Update: {
          author_initials?: string | null
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          edited_at?: string | null
          edited_by?: string | null
          edited_by_initials?: string | null
          id?: string
          is_pinned?: boolean | null
          note_type?: string | null
          partner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "partner_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_notes_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "partner_notes_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_notes_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_notes_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_notes_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "referral_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_visit_logs: {
        Row: {
          contacted_person: string | null
          created_at: string
          id: string
          logged_by: string | null
          next_steps: string | null
          outcome: string | null
          partner_id: string
          summary: string | null
          visit_date: string
          visit_type: string
        }
        Insert: {
          contacted_person?: string | null
          created_at?: string
          id?: string
          logged_by?: string | null
          next_steps?: string | null
          outcome?: string | null
          partner_id: string
          summary?: string | null
          visit_date?: string
          visit_type?: string
        }
        Update: {
          contacted_person?: string | null
          created_at?: string
          id?: string
          logged_by?: string | null
          next_steps?: string | null
          outcome?: string | null
          partner_id?: string
          summary?: string | null
          visit_date?: string
          visit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_visit_logs_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "partner_visit_logs_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_visit_logs_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_visit_logs_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_visit_logs_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "referral_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_activities: {
        Row: {
          activity_date: string | null
          activity_type: string
          created_at: string | null
          description: string | null
          id: string
          partnership_id: string
          performed_by: string | null
          title: string
        }
        Insert: {
          activity_date?: string | null
          activity_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          partnership_id: string
          performed_by?: string | null
          title: string
        }
        Update: {
          activity_date?: string | null
          activity_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          partnership_id?: string
          performed_by?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_activities_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      partnerships: {
        Row: {
          address: string | null
          contact_name: string | null
          contact_title: string | null
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          last_contact: string | null
          name: string
          needs_followup: boolean | null
          next_followup: string | null
          notes: string | null
          phone: string | null
          priority: string | null
          referral_agreement: string | null
          referral_count: number | null
          status: string | null
          tags: string[] | null
          type: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          contact_title?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          last_contact?: string | null
          name: string
          needs_followup?: boolean | null
          next_followup?: string | null
          notes?: string | null
          phone?: string | null
          priority?: string | null
          referral_agreement?: string | null
          referral_count?: number | null
          status?: string | null
          tags?: string[] | null
          type: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          contact_title?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          last_contact?: string | null
          name?: string
          needs_followup?: boolean | null
          next_followup?: string | null
          notes?: string | null
          phone?: string | null
          priority?: string | null
          referral_agreement?: string | null
          referral_count?: number | null
          status?: string | null
          tags?: string[] | null
          type?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      pay_periods: {
        Row: {
          created_at: string
          end_date: string
          id: string
          name: string | null
          start_date: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          name?: string | null
          start_date: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          name?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payroll_adjustments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          note: string | null
          pay_period_end: string
          pay_period_start: string
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          note?: string | null
          pay_period_end: string
          pay_period_start: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          note?: string | null
          pay_period_end?: string
          pay_period_start?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payroll_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payroll_adjustments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_adjustments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payroll_adjustments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      payroll_run_items: {
        Row: {
          created_at: string
          employee_id: string
          gross_pay: number | null
          id: string
          notes: string | null
          other_hours: number | null
          overtime_hours: number | null
          payroll_run_id: string
          regular_hours: number | null
        }
        Insert: {
          created_at?: string
          employee_id: string
          gross_pay?: number | null
          id?: string
          notes?: string | null
          other_hours?: number | null
          overtime_hours?: number | null
          payroll_run_id: string
          regular_hours?: number | null
        }
        Update: {
          created_at?: string
          employee_id?: string
          gross_pay?: number | null
          id?: string
          notes?: string | null
          other_hours?: number | null
          overtime_hours?: number | null
          payroll_run_id?: string
          regular_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_run_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_run_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payroll_run_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payroll_run_items_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          pay_period_id: string
          run_number: number | null
          status: string | null
          total_gross_pay: number | null
          total_hours: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          pay_period_id: string
          run_number?: number | null
          status?: string | null
          total_gross_pay?: number | null
          total_hours?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          pay_period_id?: string
          run_number?: number | null
          status?: string | null
          total_gross_pay?: number | null
          total_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_pay_period_id_fkey"
            columns: ["pay_period_id"]
            isOneToOne: false
            referencedRelation: "pay_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_signoffs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          attention_reason: string | null
          created_at: string
          double_time_hours: number | null
          employee_id: string
          gross_pay_estimate: number | null
          has_missing_punches: boolean | null
          has_negative_hours: boolean | null
          id: string
          overtime_hours: number | null
          pay_period_end: string
          pay_period_start: string
          pto_hours: number | null
          regular_hours: number | null
          requires_attention: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: string
          total_adjustments: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          attention_reason?: string | null
          created_at?: string
          double_time_hours?: number | null
          employee_id: string
          gross_pay_estimate?: number | null
          has_missing_punches?: boolean | null
          has_negative_hours?: boolean | null
          id?: string
          overtime_hours?: number | null
          pay_period_end: string
          pay_period_start: string
          pto_hours?: number | null
          regular_hours?: number | null
          requires_attention?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          total_adjustments?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          attention_reason?: string | null
          created_at?: string
          double_time_hours?: number | null
          employee_id?: string
          gross_pay_estimate?: number | null
          has_missing_punches?: boolean | null
          has_negative_hours?: boolean | null
          id?: string
          overtime_hours?: number | null
          pay_period_end?: string
          pay_period_start?: string
          pto_hours?: number | null
          regular_hours?: number | null
          requires_attention?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          total_adjustments?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_signoffs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_signoffs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payroll_signoffs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payroll_signoffs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_signoffs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payroll_signoffs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payroll_signoffs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_signoffs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payroll_signoffs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      performance_log: {
        Row: {
          created_at: string | null
          duration_ms: number
          id: string
          metadata: Json | null
          operation_name: string
          operation_type: string
        }
        Insert: {
          created_at?: string | null
          duration_ms: number
          id?: string
          metadata?: Json | null
          operation_name: string
          operation_type: string
        }
        Update: {
          created_at?: string | null
          duration_ms?: number
          id?: string
          metadata?: Json | null
          operation_name?: string
          operation_type?: string
        }
        Relationships: []
      }
      performance_reviews: {
        Row: {
          calibrated_rating: number | null
          created_at: string
          current_stage: string | null
          employee_id: string
          employee_submitted_at: string | null
          id: string
          manager_employee_id: string | null
          manager_submitted_at: string | null
          overall_rating: number | null
          review_cycle_id: string | null
          status: string | null
          summary_comment: string | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          calibrated_rating?: number | null
          created_at?: string
          current_stage?: string | null
          employee_id: string
          employee_submitted_at?: string | null
          id?: string
          manager_employee_id?: string | null
          manager_submitted_at?: string | null
          overall_rating?: number | null
          review_cycle_id?: string | null
          status?: string | null
          summary_comment?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          calibrated_rating?: number | null
          created_at?: string
          current_stage?: string | null
          employee_id?: string
          employee_submitted_at?: string | null
          id?: string
          manager_employee_id?: string | null
          manager_submitted_at?: string | null
          overall_rating?: number | null
          review_cycle_id?: string | null
          status?: string | null
          summary_comment?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "performance_reviews_manager_employee_id_fkey"
            columns: ["manager_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_manager_employee_id_fkey"
            columns: ["manager_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "performance_reviews_manager_employee_id_fkey"
            columns: ["manager_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "performance_reviews_review_cycle_id_fkey"
            columns: ["review_cycle_id"]
            isOneToOne: false
            referencedRelation: "review_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "review_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
        }
        Relationships: []
      }
      person_crm_data: {
        Row: {
          acquisition_campaign: string | null
          acquisition_detail: string | null
          acquisition_source: string | null
          business_info: Json | null
          created_at: string
          created_by: string | null
          email_opt_in: boolean | null
          event_attendance_count: number | null
          events_attended: Json | null
          first_touch_date: string | null
          id: string
          interests: Json | null
          last_event_attended_at: string | null
          lead_score: number | null
          lead_status: string | null
          lead_temperature: string | null
          mail_opt_in: boolean | null
          marketing_notes: string | null
          person_id: string
          pets_info: Json | null
          preferred_contact_method: string | null
          referral_partner_id: string | null
          sms_opt_in: boolean | null
          tags: Json | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          acquisition_campaign?: string | null
          acquisition_detail?: string | null
          acquisition_source?: string | null
          business_info?: Json | null
          created_at?: string
          created_by?: string | null
          email_opt_in?: boolean | null
          event_attendance_count?: number | null
          events_attended?: Json | null
          first_touch_date?: string | null
          id?: string
          interests?: Json | null
          last_event_attended_at?: string | null
          lead_score?: number | null
          lead_status?: string | null
          lead_temperature?: string | null
          mail_opt_in?: boolean | null
          marketing_notes?: string | null
          person_id: string
          pets_info?: Json | null
          preferred_contact_method?: string | null
          referral_partner_id?: string | null
          sms_opt_in?: boolean | null
          tags?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          acquisition_campaign?: string | null
          acquisition_detail?: string | null
          acquisition_source?: string | null
          business_info?: Json | null
          created_at?: string
          created_by?: string | null
          email_opt_in?: boolean | null
          event_attendance_count?: number | null
          events_attended?: Json | null
          first_touch_date?: string | null
          id?: string
          interests?: Json | null
          last_event_attended_at?: string | null
          lead_score?: number | null
          lead_status?: string | null
          lead_temperature?: string | null
          mail_opt_in?: boolean | null
          marketing_notes?: string | null
          person_id?: string
          pets_info?: Json | null
          preferred_contact_method?: string | null
          referral_partner_id?: string | null
          sms_opt_in?: boolean | null
          tags?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_crm_data_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "person_crm_data_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_crm_data_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_crm_data_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "master_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_crm_data_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "student_program_view"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "person_crm_data_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "unified_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_crm_data_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "unified_persons_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_crm_data_referral_partner_id_fkey"
            columns: ["referral_partner_id"]
            isOneToOne: false
            referencedRelation: "partner_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_crm_data_referral_partner_id_fkey"
            columns: ["referral_partner_id"]
            isOneToOne: false
            referencedRelation: "referral_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_crm_data_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "person_crm_data_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_crm_data_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
        ]
      }
      person_employee_data: {
        Row: {
          benefits_eligible: boolean | null
          benefits_enrolled: Json | null
          benefits_enrollment_date: string | null
          compensation_history: Json | null
          created_at: string
          created_by: string | null
          default_schedule: Json | null
          department_id: string | null
          direct_deposit_info: Json | null
          eligible_for_rehire: boolean | null
          employee_handbook_signed: boolean | null
          employee_number: string | null
          employment_status: string | null
          employment_type: string | null
          exit_interview_completed: boolean | null
          final_paycheck_issued: boolean | null
          flsa_status: string | null
          handbook_signed_at: string | null
          hire_date: string | null
          i9_verified: boolean | null
          i9_verified_at: string | null
          id: string
          legacy_employee_id: string | null
          location_id: string | null
          manager_id: string | null
          original_hire_date: string | null
          pay_frequency: string | null
          pay_rate: number | null
          pay_type: string | null
          permissions: Json | null
          person_id: string
          position_id: string | null
          probation_end_date: string | null
          pto_balance_hours: number | null
          role: string | null
          sick_balance_hours: number | null
          ssn_encrypted: string | null
          ssn_last_four: string | null
          status_changed_at: string | null
          status_reason: string | null
          termination_date: string | null
          termination_reason: string | null
          termination_type: string | null
          updated_at: string
          updated_by: string | null
          w4_submitted: boolean | null
          w4_submitted_at: string | null
        }
        Insert: {
          benefits_eligible?: boolean | null
          benefits_enrolled?: Json | null
          benefits_enrollment_date?: string | null
          compensation_history?: Json | null
          created_at?: string
          created_by?: string | null
          default_schedule?: Json | null
          department_id?: string | null
          direct_deposit_info?: Json | null
          eligible_for_rehire?: boolean | null
          employee_handbook_signed?: boolean | null
          employee_number?: string | null
          employment_status?: string | null
          employment_type?: string | null
          exit_interview_completed?: boolean | null
          final_paycheck_issued?: boolean | null
          flsa_status?: string | null
          handbook_signed_at?: string | null
          hire_date?: string | null
          i9_verified?: boolean | null
          i9_verified_at?: string | null
          id?: string
          legacy_employee_id?: string | null
          location_id?: string | null
          manager_id?: string | null
          original_hire_date?: string | null
          pay_frequency?: string | null
          pay_rate?: number | null
          pay_type?: string | null
          permissions?: Json | null
          person_id: string
          position_id?: string | null
          probation_end_date?: string | null
          pto_balance_hours?: number | null
          role?: string | null
          sick_balance_hours?: number | null
          ssn_encrypted?: string | null
          ssn_last_four?: string | null
          status_changed_at?: string | null
          status_reason?: string | null
          termination_date?: string | null
          termination_reason?: string | null
          termination_type?: string | null
          updated_at?: string
          updated_by?: string | null
          w4_submitted?: boolean | null
          w4_submitted_at?: string | null
        }
        Update: {
          benefits_eligible?: boolean | null
          benefits_enrolled?: Json | null
          benefits_enrollment_date?: string | null
          compensation_history?: Json | null
          created_at?: string
          created_by?: string | null
          default_schedule?: Json | null
          department_id?: string | null
          direct_deposit_info?: Json | null
          eligible_for_rehire?: boolean | null
          employee_handbook_signed?: boolean | null
          employee_number?: string | null
          employment_status?: string | null
          employment_type?: string | null
          exit_interview_completed?: boolean | null
          final_paycheck_issued?: boolean | null
          flsa_status?: string | null
          handbook_signed_at?: string | null
          hire_date?: string | null
          i9_verified?: boolean | null
          i9_verified_at?: string | null
          id?: string
          legacy_employee_id?: string | null
          location_id?: string | null
          manager_id?: string | null
          original_hire_date?: string | null
          pay_frequency?: string | null
          pay_rate?: number | null
          pay_type?: string | null
          permissions?: Json | null
          person_id?: string
          position_id?: string | null
          probation_end_date?: string | null
          pto_balance_hours?: number | null
          role?: string | null
          sick_balance_hours?: number | null
          ssn_encrypted?: string | null
          ssn_last_four?: string | null
          status_changed_at?: string | null
          status_reason?: string | null
          termination_date?: string | null
          termination_reason?: string | null
          termination_type?: string | null
          updated_at?: string
          updated_by?: string | null
          w4_submitted?: boolean | null
          w4_submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_employee_data_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "person_employee_data_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_employee_data_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_employee_data_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_employee_data_legacy_employee_id_fkey"
            columns: ["legacy_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_employee_data_legacy_employee_id_fkey"
            columns: ["legacy_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "person_employee_data_legacy_employee_id_fkey"
            columns: ["legacy_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "person_employee_data_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_employee_data_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "master_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_employee_data_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "student_program_view"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "person_employee_data_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "unified_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_employee_data_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "unified_persons_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_employee_data_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "master_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_employee_data_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "student_program_view"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "person_employee_data_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "unified_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_employee_data_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "unified_persons_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_employee_data_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_employee_data_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "person_employee_data_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_employee_data_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
        ]
      }
      person_extended_data: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json
          data_type: string
          id: string
          is_current: boolean
          person_id: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: Json
          data_type: string
          id?: string
          is_current?: boolean
          person_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          data_type?: string
          id?: string
          is_current?: boolean
          person_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "person_extended_data_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "person_extended_data_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_extended_data_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_extended_data_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "master_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_extended_data_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "student_program_view"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "person_extended_data_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "unified_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_extended_data_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "unified_persons_view"
            referencedColumns: ["id"]
          },
        ]
      }
      person_program_data: {
        Row: {
          academic_advisor: string | null
          actual_completion_date: string | null
          additional_documents: Json | null
          application_data: Json | null
          application_source: string | null
          applied_at: string | null
          assigned_coordinator_id: string | null
          assigned_department_id: string | null
          assigned_location_id: string | null
          assigned_mentor_id: string | null
          certificate_issued_at: string | null
          cohort_identifier: string | null
          competencies_achieved: Json | null
          completion_certificate_issued: boolean | null
          converted_employee_id: string | null
          converted_to_employee: boolean | null
          coordinator_notes: string | null
          cover_letter_url: string | null
          created_at: string
          created_by: string | null
          eligible_for_employment: boolean | null
          employee_conversion_date: string | null
          employment_interest_level: string | null
          end_date: string | null
          enrollment_status: Database["public"]["Enums"]["program_enrollment_status"]
          entrance_evaluation_notes: string | null
          entrance_evaluation_score: number | null
          exit_survey_completed: boolean | null
          exit_survey_data: Json | null
          expected_graduation_date: string | null
          final_evaluation_notes: string | null
          final_evaluation_score: number | null
          hours_completed: number | null
          hours_required: number | null
          id: string
          is_paid: boolean | null
          learning_objectives: Json | null
          legacy_visitor_id: string | null
          midpoint_evaluation_notes: string | null
          midpoint_evaluation_score: number | null
          overall_performance_rating: string | null
          payment_method: string | null
          payment_notes: string | null
          person_id: string
          program_name: string | null
          program_notes: string | null
          program_type: Database["public"]["Enums"]["education_program_type"]
          resume_url: string | null
          schedule_data: Json | null
          schedule_notes: string | null
          schedule_type: string | null
          scheduled_hours_per_week: number | null
          school_coordinator_email: string | null
          school_coordinator_phone: string | null
          school_of_origin: string | null
          school_program: string | null
          start_date: string | null
          status_changed_at: string | null
          status_changed_by: string | null
          stipend_amount: number | null
          stipend_frequency: string | null
          student_feedback: string | null
          transcript_url: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academic_advisor?: string | null
          actual_completion_date?: string | null
          additional_documents?: Json | null
          application_data?: Json | null
          application_source?: string | null
          applied_at?: string | null
          assigned_coordinator_id?: string | null
          assigned_department_id?: string | null
          assigned_location_id?: string | null
          assigned_mentor_id?: string | null
          certificate_issued_at?: string | null
          cohort_identifier?: string | null
          competencies_achieved?: Json | null
          completion_certificate_issued?: boolean | null
          converted_employee_id?: string | null
          converted_to_employee?: boolean | null
          coordinator_notes?: string | null
          cover_letter_url?: string | null
          created_at?: string
          created_by?: string | null
          eligible_for_employment?: boolean | null
          employee_conversion_date?: string | null
          employment_interest_level?: string | null
          end_date?: string | null
          enrollment_status?: Database["public"]["Enums"]["program_enrollment_status"]
          entrance_evaluation_notes?: string | null
          entrance_evaluation_score?: number | null
          exit_survey_completed?: boolean | null
          exit_survey_data?: Json | null
          expected_graduation_date?: string | null
          final_evaluation_notes?: string | null
          final_evaluation_score?: number | null
          hours_completed?: number | null
          hours_required?: number | null
          id?: string
          is_paid?: boolean | null
          learning_objectives?: Json | null
          legacy_visitor_id?: string | null
          midpoint_evaluation_notes?: string | null
          midpoint_evaluation_score?: number | null
          overall_performance_rating?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          person_id: string
          program_name?: string | null
          program_notes?: string | null
          program_type: Database["public"]["Enums"]["education_program_type"]
          resume_url?: string | null
          schedule_data?: Json | null
          schedule_notes?: string | null
          schedule_type?: string | null
          scheduled_hours_per_week?: number | null
          school_coordinator_email?: string | null
          school_coordinator_phone?: string | null
          school_of_origin?: string | null
          school_program?: string | null
          start_date?: string | null
          status_changed_at?: string | null
          status_changed_by?: string | null
          stipend_amount?: number | null
          stipend_frequency?: string | null
          student_feedback?: string | null
          transcript_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academic_advisor?: string | null
          actual_completion_date?: string | null
          additional_documents?: Json | null
          application_data?: Json | null
          application_source?: string | null
          applied_at?: string | null
          assigned_coordinator_id?: string | null
          assigned_department_id?: string | null
          assigned_location_id?: string | null
          assigned_mentor_id?: string | null
          certificate_issued_at?: string | null
          cohort_identifier?: string | null
          competencies_achieved?: Json | null
          completion_certificate_issued?: boolean | null
          converted_employee_id?: string | null
          converted_to_employee?: boolean | null
          coordinator_notes?: string | null
          cover_letter_url?: string | null
          created_at?: string
          created_by?: string | null
          eligible_for_employment?: boolean | null
          employee_conversion_date?: string | null
          employment_interest_level?: string | null
          end_date?: string | null
          enrollment_status?: Database["public"]["Enums"]["program_enrollment_status"]
          entrance_evaluation_notes?: string | null
          entrance_evaluation_score?: number | null
          exit_survey_completed?: boolean | null
          exit_survey_data?: Json | null
          expected_graduation_date?: string | null
          final_evaluation_notes?: string | null
          final_evaluation_score?: number | null
          hours_completed?: number | null
          hours_required?: number | null
          id?: string
          is_paid?: boolean | null
          learning_objectives?: Json | null
          legacy_visitor_id?: string | null
          midpoint_evaluation_notes?: string | null
          midpoint_evaluation_score?: number | null
          overall_performance_rating?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          person_id?: string
          program_name?: string | null
          program_notes?: string | null
          program_type?: Database["public"]["Enums"]["education_program_type"]
          resume_url?: string | null
          schedule_data?: Json | null
          schedule_notes?: string | null
          schedule_type?: string | null
          scheduled_hours_per_week?: number | null
          school_coordinator_email?: string | null
          school_coordinator_phone?: string | null
          school_of_origin?: string | null
          school_program?: string | null
          start_date?: string | null
          status_changed_at?: string | null
          status_changed_by?: string | null
          stipend_amount?: number | null
          stipend_frequency?: string | null
          student_feedback?: string | null
          transcript_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_program_data_assigned_coordinator_id_fkey"
            columns: ["assigned_coordinator_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_program_data_assigned_coordinator_id_fkey"
            columns: ["assigned_coordinator_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "person_program_data_assigned_coordinator_id_fkey"
            columns: ["assigned_coordinator_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "person_program_data_assigned_department_id_fkey"
            columns: ["assigned_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_program_data_assigned_location_id_fkey"
            columns: ["assigned_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_program_data_assigned_mentor_id_fkey"
            columns: ["assigned_mentor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_program_data_assigned_mentor_id_fkey"
            columns: ["assigned_mentor_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "person_program_data_assigned_mentor_id_fkey"
            columns: ["assigned_mentor_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "person_program_data_converted_employee_id_fkey"
            columns: ["converted_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_program_data_converted_employee_id_fkey"
            columns: ["converted_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "person_program_data_converted_employee_id_fkey"
            columns: ["converted_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "person_program_data_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "person_program_data_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_program_data_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_program_data_legacy_visitor_id_fkey"
            columns: ["legacy_visitor_id"]
            isOneToOne: false
            referencedRelation: "education_visitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_program_data_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "master_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_program_data_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "student_program_view"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "person_program_data_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "unified_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_program_data_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "unified_persons_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_program_data_status_changed_by_fkey"
            columns: ["status_changed_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "person_program_data_status_changed_by_fkey"
            columns: ["status_changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_program_data_status_changed_by_fkey"
            columns: ["status_changed_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_program_data_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "person_program_data_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_program_data_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
        ]
      }
      person_recruiting_data: {
        Row: {
          application_data: Json | null
          application_source: string | null
          applied_at: string | null
          available_start_date: string | null
          background_check_date: string | null
          background_check_status: string | null
          candidate_type: string | null
          cover_letter_url: string | null
          created_at: string
          created_by: string | null
          documents: Json | null
          id: string
          interview_notes: Json | null
          interview_scores: Json | null
          legacy_candidate_id: string | null
          offer_accepted_at: string | null
          offer_details: Json | null
          offer_extended_at: string | null
          offer_response_deadline: string | null
          overall_rating: number | null
          person_id: string
          portfolio_url: string | null
          preferred_schedule: string | null
          recruiting_status: string | null
          references: Json | null
          rejection_notes: string | null
          rejection_reason: string | null
          relocation_willing: boolean | null
          resume_url: string | null
          salary_expectation_max: number | null
          salary_expectation_min: number | null
          salary_expectation_type: string | null
          skills_assessment: Json | null
          status_changed_at: string | null
          target_department_id: string | null
          target_location_id: string | null
          target_position_id: string | null
          updated_at: string
          updated_by: string | null
          withdrawal_reason: string | null
          work_authorization: string | null
        }
        Insert: {
          application_data?: Json | null
          application_source?: string | null
          applied_at?: string | null
          available_start_date?: string | null
          background_check_date?: string | null
          background_check_status?: string | null
          candidate_type?: string | null
          cover_letter_url?: string | null
          created_at?: string
          created_by?: string | null
          documents?: Json | null
          id?: string
          interview_notes?: Json | null
          interview_scores?: Json | null
          legacy_candidate_id?: string | null
          offer_accepted_at?: string | null
          offer_details?: Json | null
          offer_extended_at?: string | null
          offer_response_deadline?: string | null
          overall_rating?: number | null
          person_id: string
          portfolio_url?: string | null
          preferred_schedule?: string | null
          recruiting_status?: string | null
          references?: Json | null
          rejection_notes?: string | null
          rejection_reason?: string | null
          relocation_willing?: boolean | null
          resume_url?: string | null
          salary_expectation_max?: number | null
          salary_expectation_min?: number | null
          salary_expectation_type?: string | null
          skills_assessment?: Json | null
          status_changed_at?: string | null
          target_department_id?: string | null
          target_location_id?: string | null
          target_position_id?: string | null
          updated_at?: string
          updated_by?: string | null
          withdrawal_reason?: string | null
          work_authorization?: string | null
        }
        Update: {
          application_data?: Json | null
          application_source?: string | null
          applied_at?: string | null
          available_start_date?: string | null
          background_check_date?: string | null
          background_check_status?: string | null
          candidate_type?: string | null
          cover_letter_url?: string | null
          created_at?: string
          created_by?: string | null
          documents?: Json | null
          id?: string
          interview_notes?: Json | null
          interview_scores?: Json | null
          legacy_candidate_id?: string | null
          offer_accepted_at?: string | null
          offer_details?: Json | null
          offer_extended_at?: string | null
          offer_response_deadline?: string | null
          overall_rating?: number | null
          person_id?: string
          portfolio_url?: string | null
          preferred_schedule?: string | null
          recruiting_status?: string | null
          references?: Json | null
          rejection_notes?: string | null
          rejection_reason?: string | null
          relocation_willing?: boolean | null
          resume_url?: string | null
          salary_expectation_max?: number | null
          salary_expectation_min?: number | null
          salary_expectation_type?: string | null
          skills_assessment?: Json | null
          status_changed_at?: string | null
          target_department_id?: string | null
          target_location_id?: string | null
          target_position_id?: string | null
          updated_at?: string
          updated_by?: string | null
          withdrawal_reason?: string | null
          work_authorization?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_recruiting_data_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "person_recruiting_data_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_recruiting_data_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_recruiting_data_legacy_candidate_id_fkey"
            columns: ["legacy_candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_recruiting_data_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "master_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_recruiting_data_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "student_program_view"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "person_recruiting_data_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "unified_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_recruiting_data_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "unified_persons_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_recruiting_data_target_department_id_fkey"
            columns: ["target_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_recruiting_data_target_location_id_fkey"
            columns: ["target_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_recruiting_data_target_position_id_fkey"
            columns: ["target_position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_recruiting_data_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "person_recruiting_data_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_recruiting_data_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
        ]
      }
      points_log: {
        Row: {
          awarded_by_employee_id: string | null
          created_at: string
          employee_id: string
          id: string
          points: number
          reason: string
          source_id: string | null
          source_type: string | null
        }
        Insert: {
          awarded_by_employee_id?: string | null
          created_at?: string
          employee_id: string
          id?: string
          points: number
          reason: string
          source_id?: string | null
          source_type?: string | null
        }
        Update: {
          awarded_by_employee_id?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          points?: number
          reason?: string
          source_id?: string | null
          source_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "points_log_awarded_by_employee_id_fkey"
            columns: ["awarded_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_log_awarded_by_employee_id_fkey"
            columns: ["awarded_by_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "points_log_awarded_by_employee_id_fkey"
            columns: ["awarded_by_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "points_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "points_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      position_required_skills: {
        Row: {
          created_at: string | null
          id: string
          is_core: boolean | null
          position_id: string
          required_level: number | null
          skill_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_core?: boolean | null
          position_id: string
          required_level?: number | null
          skill_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_core?: boolean | null
          position_id?: string
          required_level?: number | null
          skill_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "position_required_skills_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_required_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_library"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_roles: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "profile_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          last_name: string | null
          last_slack_sync: string | null
          phone: string | null
          role: string
          slack_status: string | null
          slack_user_id: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          last_name?: string | null
          last_slack_sync?: string | null
          phone?: string | null
          role?: string
          slack_status?: string | null
          slack_user_id?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          last_name?: string | null
          last_slack_sync?: string | null
          phone?: string | null
          role?: string
          slack_status?: string | null
          slack_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referral_partners: {
        Row: {
          address: string | null
          average_monthly_revenue: number | null
          best_contact_person: string | null
          booth_size: string | null
          category: string | null
          ce_event_host: boolean | null
          clinic_type: string | null
          color: string | null
          communication_preference: string | null
          contact_name: string | null
          contact_person: string | null
          contract_end_date: string | null
          created_at: string
          current_month_referrals: number | null
          current_quarter_revenue: number | null
          days_since_last_visit: number | null
          deleted_at: string | null
          description: string | null
          drop_off_materials: boolean | null
          email: string | null
          employee_count: string | null
          events_attended: string[] | null
          expected_visit_frequency_days: number | null
          facebook_url: string | null
          followup_reason: string | null
          hospital_name: string
          icon: string | null
          id: string
          instagram_handle: string | null
          is_active: boolean
          is_confirmed: boolean | null
          key_decision_maker: string | null
          key_decision_maker_email: string | null
          key_decision_maker_phone: string | null
          key_decision_maker_title: string | null
          last_contact_date: string | null
          last_data_source: string | null
          last_referral_date: string | null
          last_sync_date: string | null
          last_visit_date: string | null
          linkedin_url: string | null
          lunch_and_learn_eligible: boolean | null
          monthly_referral_goal: number | null
          name: string
          needs_followup: boolean | null
          next_followup_date: string | null
          notes: string | null
          organization_type: string | null
          partner_type: string | null
          payment_amount: number | null
          payment_date: string | null
          payment_status: string | null
          phone: string | null
          preferences: Json | null
          preferred_contact_time: string | null
          preferred_visit_day: string | null
          preferred_visit_time: string | null
          priority: string | null
          products: string[] | null
          quarterly_revenue_goal: number | null
          referral_agreement_type: string | null
          referral_value_monthly: number | null
          relationship_health: number | null
          relationship_score: number | null
          relationship_status: string | null
          revenue_last_year: number | null
          revenue_ytd: number | null
          size: string | null
          specialty_areas: string[] | null
          status: string | null
          tags: string[] | null
          tier: string
          total_referrals: number
          total_referrals_all_time: number | null
          total_referrals_ytd: number | null
          total_revenue_all_time: number | null
          updated_at: string
          visit_frequency: string | null
          visit_overdue: boolean | null
          visit_tier: string | null
          website: string | null
          zone: string | null
        }
        Insert: {
          address?: string | null
          average_monthly_revenue?: number | null
          best_contact_person?: string | null
          booth_size?: string | null
          category?: string | null
          ce_event_host?: boolean | null
          clinic_type?: string | null
          color?: string | null
          communication_preference?: string | null
          contact_name?: string | null
          contact_person?: string | null
          contract_end_date?: string | null
          created_at?: string
          current_month_referrals?: number | null
          current_quarter_revenue?: number | null
          days_since_last_visit?: number | null
          deleted_at?: string | null
          description?: string | null
          drop_off_materials?: boolean | null
          email?: string | null
          employee_count?: string | null
          events_attended?: string[] | null
          expected_visit_frequency_days?: number | null
          facebook_url?: string | null
          followup_reason?: string | null
          hospital_name: string
          icon?: string | null
          id?: string
          instagram_handle?: string | null
          is_active?: boolean
          is_confirmed?: boolean | null
          key_decision_maker?: string | null
          key_decision_maker_email?: string | null
          key_decision_maker_phone?: string | null
          key_decision_maker_title?: string | null
          last_contact_date?: string | null
          last_data_source?: string | null
          last_referral_date?: string | null
          last_sync_date?: string | null
          last_visit_date?: string | null
          linkedin_url?: string | null
          lunch_and_learn_eligible?: boolean | null
          monthly_referral_goal?: number | null
          name?: string
          needs_followup?: boolean | null
          next_followup_date?: string | null
          notes?: string | null
          organization_type?: string | null
          partner_type?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_status?: string | null
          phone?: string | null
          preferences?: Json | null
          preferred_contact_time?: string | null
          preferred_visit_day?: string | null
          preferred_visit_time?: string | null
          priority?: string | null
          products?: string[] | null
          quarterly_revenue_goal?: number | null
          referral_agreement_type?: string | null
          referral_value_monthly?: number | null
          relationship_health?: number | null
          relationship_score?: number | null
          relationship_status?: string | null
          revenue_last_year?: number | null
          revenue_ytd?: number | null
          size?: string | null
          specialty_areas?: string[] | null
          status?: string | null
          tags?: string[] | null
          tier?: string
          total_referrals?: number
          total_referrals_all_time?: number | null
          total_referrals_ytd?: number | null
          total_revenue_all_time?: number | null
          updated_at?: string
          visit_frequency?: string | null
          visit_overdue?: boolean | null
          visit_tier?: string | null
          website?: string | null
          zone?: string | null
        }
        Update: {
          address?: string | null
          average_monthly_revenue?: number | null
          best_contact_person?: string | null
          booth_size?: string | null
          category?: string | null
          ce_event_host?: boolean | null
          clinic_type?: string | null
          color?: string | null
          communication_preference?: string | null
          contact_name?: string | null
          contact_person?: string | null
          contract_end_date?: string | null
          created_at?: string
          current_month_referrals?: number | null
          current_quarter_revenue?: number | null
          days_since_last_visit?: number | null
          deleted_at?: string | null
          description?: string | null
          drop_off_materials?: boolean | null
          email?: string | null
          employee_count?: string | null
          events_attended?: string[] | null
          expected_visit_frequency_days?: number | null
          facebook_url?: string | null
          followup_reason?: string | null
          hospital_name?: string
          icon?: string | null
          id?: string
          instagram_handle?: string | null
          is_active?: boolean
          is_confirmed?: boolean | null
          key_decision_maker?: string | null
          key_decision_maker_email?: string | null
          key_decision_maker_phone?: string | null
          key_decision_maker_title?: string | null
          last_contact_date?: string | null
          last_data_source?: string | null
          last_referral_date?: string | null
          last_sync_date?: string | null
          last_visit_date?: string | null
          linkedin_url?: string | null
          lunch_and_learn_eligible?: boolean | null
          monthly_referral_goal?: number | null
          name?: string
          needs_followup?: boolean | null
          next_followup_date?: string | null
          notes?: string | null
          organization_type?: string | null
          partner_type?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_status?: string | null
          phone?: string | null
          preferences?: Json | null
          preferred_contact_time?: string | null
          preferred_visit_day?: string | null
          preferred_visit_time?: string | null
          priority?: string | null
          products?: string[] | null
          quarterly_revenue_goal?: number | null
          referral_agreement_type?: string | null
          referral_value_monthly?: number | null
          relationship_health?: number | null
          relationship_score?: number | null
          relationship_status?: string | null
          revenue_last_year?: number | null
          revenue_ytd?: number | null
          size?: string | null
          specialty_areas?: string[] | null
          status?: string | null
          tags?: string[] | null
          tier?: string
          total_referrals?: number
          total_referrals_all_time?: number | null
          total_referrals_ytd?: number | null
          total_revenue_all_time?: number | null
          updated_at?: string
          visit_frequency?: string | null
          visit_overdue?: boolean | null
          visit_tier?: string | null
          website?: string | null
          zone?: string | null
        }
        Relationships: []
      }
      referral_sync_history: {
        Row: {
          content_hash: string | null
          created_at: string
          data_source: string | null
          date_range_end: string | null
          date_range_start: string | null
          filename: string
          id: string
          report_type: string | null
          sync_details: Json | null
          total_revenue_added: number | null
          total_rows_matched: number | null
          total_rows_parsed: number | null
          total_rows_skipped: number | null
          upload_date: string
          uploaded_by: string | null
        }
        Insert: {
          content_hash?: string | null
          created_at?: string
          data_source?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          filename: string
          id?: string
          report_type?: string | null
          sync_details?: Json | null
          total_revenue_added?: number | null
          total_rows_matched?: number | null
          total_rows_parsed?: number | null
          total_rows_skipped?: number | null
          upload_date?: string
          uploaded_by?: string | null
        }
        Update: {
          content_hash?: string | null
          created_at?: string
          data_source?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          filename?: string
          id?: string
          report_type?: string | null
          sync_details?: Json | null
          total_revenue_added?: number | null
          total_rows_matched?: number | null
          total_rows_parsed?: number | null
          total_rows_skipped?: number | null
          upload_date?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_sync_history_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "referral_sync_history_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_sync_history_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
        ]
      }
      review_cycles: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          name: string
          period_end: string | null
          period_start: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          period_end?: string | null
          period_start?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          period_end?: string | null
          period_start?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      review_participants: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          performance_review_id: string
          role: string | null
          status: string | null
          submitted_at: string | null
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          performance_review_id: string
          role?: string | null
          status?: string | null
          submitted_at?: string | null
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          performance_review_id?: string
          role?: string | null
          status?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_participants_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_participants_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "review_participants_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "review_participants_performance_review_id_fkey"
            columns: ["performance_review_id"]
            isOneToOne: false
            referencedRelation: "performance_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_requests: {
        Row: {
          additional_notes: string | null
          completed_at: string | null
          created_at: string
          due_date: string | null
          employee_id: string
          id: string
          notes: string | null
          performance_review_id: string | null
          request_type: string
          requested_at: string
          requested_by_employee_id: string | null
          skill_categories: string[] | null
          skills_to_review: string[] | null
          status: string
          topics: string[] | null
          topics_to_cover: string[] | null
          updated_at: string
        }
        Insert: {
          additional_notes?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          performance_review_id?: string | null
          request_type: string
          requested_at?: string
          requested_by_employee_id?: string | null
          skill_categories?: string[] | null
          skills_to_review?: string[] | null
          status?: string
          topics?: string[] | null
          topics_to_cover?: string[] | null
          updated_at?: string
        }
        Update: {
          additional_notes?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          performance_review_id?: string | null
          request_type?: string
          requested_at?: string
          requested_by_employee_id?: string | null
          skill_categories?: string[] | null
          skills_to_review?: string[] | null
          status?: string
          topics?: string[] | null
          topics_to_cover?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "review_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "review_requests_performance_review_id_fkey"
            columns: ["performance_review_id"]
            isOneToOne: false
            referencedRelation: "performance_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_requested_by_employee_id_fkey"
            columns: ["requested_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_requested_by_employee_id_fkey"
            columns: ["requested_by_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "review_requests_requested_by_employee_id_fkey"
            columns: ["requested_by_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      review_responses: {
        Row: {
          answer_text: string | null
          answer_value: number | null
          created_at: string
          id: string
          performance_review_id: string
          question_key: string | null
          responder_employee_id: string | null
          responder_role: string | null
          updated_at: string
          visibility: string | null
        }
        Insert: {
          answer_text?: string | null
          answer_value?: number | null
          created_at?: string
          id?: string
          performance_review_id: string
          question_key?: string | null
          responder_employee_id?: string | null
          responder_role?: string | null
          updated_at?: string
          visibility?: string | null
        }
        Update: {
          answer_text?: string | null
          answer_value?: number | null
          created_at?: string
          id?: string
          performance_review_id?: string
          question_key?: string | null
          responder_employee_id?: string | null
          responder_role?: string | null
          updated_at?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_responses_performance_review_id_fkey"
            columns: ["performance_review_id"]
            isOneToOne: false
            referencedRelation: "performance_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_responses_responder_employee_id_fkey"
            columns: ["responder_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_responses_responder_employee_id_fkey"
            columns: ["responder_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "review_responses_responder_employee_id_fkey"
            columns: ["responder_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      review_signoffs: {
        Row: {
          comment: string | null
          created_at: string
          employee_id: string
          id: string
          performance_review_id: string
          role: string | null
          signed_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          employee_id: string
          id?: string
          performance_review_id: string
          role?: string | null
          signed_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          performance_review_id?: string
          role?: string | null
          signed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_signoffs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_signoffs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "review_signoffs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "review_signoffs_performance_review_id_fkey"
            columns: ["performance_review_id"]
            isOneToOne: false
            referencedRelation: "performance_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_templates: {
        Row: {
          created_at: string
          description: string | null
          form_schema: Json | null
          id: string
          name: string
          updated_at: string
          workflow_config: Json | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          form_schema?: Json | null
          id?: string
          name: string
          updated_at?: string
          workflow_config?: Json | null
        }
        Update: {
          created_at?: string
          description?: string | null
          form_schema?: Json | null
          id?: string
          name?: string
          updated_at?: string
          workflow_config?: Json | null
        }
        Relationships: []
      }
      role_definitions: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          display_name: string
          icon: string | null
          id: string
          permissions: Json | null
          role_key: string
          tier: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_name: string
          icon?: string | null
          id?: string
          permissions?: Json | null
          role_key: string
          tier?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_name?: string
          icon?: string | null
          id?: string
          permissions?: Json | null
          role_key?: string
          tier?: number
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          key: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      safety_log_schedules: {
        Row: {
          id: string
          log_type: string
          location: string
          cadence: string
          last_completed_at: string | null
          last_notified_at: string | null
          notify_roles: string[] | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          log_type: string
          location: string
          cadence?: string
          last_completed_at?: string | null
          last_notified_at?: string | null
          notify_roles?: string[] | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          log_type?: string
          location?: string
          cadence?: string
          last_completed_at?: string | null
          last_notified_at?: string | null
          notify_roles?: string[] | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_log_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_logs: {
        Row: {
          id: string
          log_type: string
          location: string
          form_data: Json
          submitted_by: string
          submitted_at: string
          osha_recordable: boolean | null
          photo_urls: string[] | null
          status: string
          reviewed_by: string | null
          reviewed_at: string | null
          review_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          log_type: string
          location: string
          form_data?: Json
          submitted_by: string
          submitted_at?: string
          osha_recordable?: boolean | null
          photo_urls?: string[] | null
          status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          log_type?: string
          location?: string
          form_data?: Json
          submitted_by?: string
          submitted_at?: string
          osha_recordable?: boolean | null
          photo_urls?: string[] | null
          status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_logs_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_logs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_queries: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          generated_sql: string
          id: string
          is_public: boolean | null
          last_run_at: string | null
          name: string
          natural_language: string
          run_count: number | null
          shared_with_roles: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          generated_sql: string
          id?: string
          is_public?: boolean | null
          last_run_at?: string | null
          name: string
          natural_language: string
          run_count?: number | null
          shared_with_roles?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          generated_sql?: string
          id?: string
          is_public?: boolean | null
          last_run_at?: string | null
          name?: string
          natural_language?: string
          run_count?: number | null
          shared_with_roles?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      schedule_drafts: {
        Row: {
          ai_analysis: Json | null
          ai_suggestions: Json | null
          coverage_score: number | null
          created_at: string | null
          created_by: string | null
          id: string
          location_id: string
          operational_days: number[]
          published_at: string | null
          published_by: string | null
          selected_service_ids: string[]
          service_days_matrix: Json | null
          status: string | null
          updated_at: string | null
          validated_at: string | null
          validation_errors: Json | null
          validation_warnings: Json | null
          week_start: string
        }
        Insert: {
          ai_analysis?: Json | null
          ai_suggestions?: Json | null
          coverage_score?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          location_id: string
          operational_days?: number[]
          published_at?: string | null
          published_by?: string | null
          selected_service_ids?: string[]
          service_days_matrix?: Json | null
          status?: string | null
          updated_at?: string | null
          validated_at?: string | null
          validation_errors?: Json | null
          validation_warnings?: Json | null
          week_start: string
        }
        Update: {
          ai_analysis?: Json | null
          ai_suggestions?: Json | null
          coverage_score?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          location_id?: string
          operational_days?: number[]
          published_at?: string | null
          published_by?: string | null
          selected_service_ids?: string[]
          service_days_matrix?: Json | null
          status?: string | null
          updated_at?: string | null
          validated_at?: string | null
          validation_errors?: Json | null
          validation_warnings?: Json | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_drafts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "schedule_drafts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_drafts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_drafts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_drafts_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "schedule_drafts_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_drafts_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_template_shifts: {
        Row: {
          created_at: string
          day_of_week: number
          department_id: string | null
          employee_id: string | null
          end_time: string
          id: string
          location_id: string | null
          notes: string | null
          role_category: string | null
          role_label: string | null
          role_required: string | null
          service_id: string | null
          staffing_requirement_id: string | null
          start_time: string
          template_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          department_id?: string | null
          employee_id?: string | null
          end_time: string
          id?: string
          location_id?: string | null
          notes?: string | null
          role_category?: string | null
          role_label?: string | null
          role_required?: string | null
          service_id?: string | null
          staffing_requirement_id?: string | null
          start_time: string
          template_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          department_id?: string | null
          employee_id?: string | null
          end_time?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          role_category?: string | null
          role_label?: string | null
          role_required?: string | null
          service_id?: string | null
          staffing_requirement_id?: string | null
          start_time?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_template_shifts_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service_coverage_summary"
            referencedColumns: ["service_id"]
          },
          {
            foreignKeyName: "schedule_template_shifts_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_template_shifts_staffing_requirement_id_fkey"
            columns: ["staffing_requirement_id"]
            isOneToOne: false
            referencedRelation: "service_staffing_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          last_used_at: string | null
          location_id: string | null
          name: string
          operational_days: number[]
          service_ids: string[]
          slot_definitions: Json
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last_used_at?: string | null
          location_id?: string | null
          name: string
          operational_days?: number[]
          service_ids?: string[]
          slot_definitions?: Json
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last_used_at?: string | null
          location_id?: string | null
          name?: string
          operational_days?: number[]
          service_ids?: string[]
          slot_definitions?: Json
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "schedule_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_templates_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_weeks: {
        Row: {
          ai_suggestions: Json | null
          conflict_count: number | null
          coverage_score: number | null
          created_at: string | null
          filled_shifts: number | null
          id: string
          location_id: string
          locked_at: string | null
          locked_by: string | null
          notes: string | null
          open_shifts: number | null
          published_at: string | null
          published_by: string | null
          status: string | null
          total_shifts: number | null
          updated_at: string | null
          week_start: string
        }
        Insert: {
          ai_suggestions?: Json | null
          conflict_count?: number | null
          coverage_score?: number | null
          created_at?: string | null
          filled_shifts?: number | null
          id?: string
          location_id: string
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          open_shifts?: number | null
          published_at?: string | null
          published_by?: string | null
          status?: string | null
          total_shifts?: number | null
          updated_at?: string | null
          week_start: string
        }
        Update: {
          ai_suggestions?: Json | null
          conflict_count?: number | null
          coverage_score?: number | null
          created_at?: string | null
          filled_shifts?: number | null
          id?: string
          location_id?: string
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          open_shifts?: number | null
          published_at?: string | null
          published_by?: string | null
          status?: string | null
          total_shifts?: number | null
          updated_at?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_weeks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_weeks_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "schedule_weeks_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_weeks_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_weeks_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "schedule_weeks_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_weeks_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          employee_id: string | null
          end_time: string | null
          id: string
          location_id: string | null
          notes: string | null
          profile_id: string | null
          shift_type: string | null
          start_time: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          employee_id?: string | null
          end_time?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          profile_id?: string | null
          shift_type?: string | null
          start_time?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          employee_id?: string | null
          end_time?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          profile_id?: string | null
          shift_type?: string | null
          start_time?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "schedules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "schedules_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduling_rules: {
        Row: {
          created_at: string | null
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          location_id: string | null
          name: string
          parameters: Json
          position_id: string | null
          rule_type: string
          severity: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          name: string
          parameters?: Json
          position_id?: string | null
          rule_type: string
          severity?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          name?: string
          parameters?: Json
          position_id?: string | null
          rule_type?: string
          severity?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduling_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "scheduling_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduling_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduling_rules_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduling_rules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduling_rules_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      service_slots: {
        Row: {
          capacity: number | null
          created_at: string | null
          day_of_week: number
          effective_from: string | null
          effective_until: string | null
          end_time: string
          id: string
          is_active: boolean | null
          location_id: string
          notes: string | null
          service_id: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          day_of_week: number
          effective_from?: string | null
          effective_until?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          location_id: string
          notes?: string | null
          service_id: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          day_of_week?: number
          effective_from?: string | null
          effective_until?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          location_id?: string
          notes?: string | null
          service_id?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_slots_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_slots_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service_coverage_summary"
            referencedColumns: ["service_id"]
          },
          {
            foreignKeyName: "service_slots_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_staffing_requirements: {
        Row: {
          created_at: string | null
          default_end_time: string | null
          default_start_time: string | null
          id: string
          is_required: boolean | null
          max_count: number | null
          min_count: number
          notes: string | null
          position_id: string | null
          priority: number | null
          role_category: string | null
          role_label: string | null
          service_id: string
          skills_required: string[] | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_end_time?: string | null
          default_start_time?: string | null
          id?: string
          is_required?: boolean | null
          max_count?: number | null
          min_count?: number
          notes?: string | null
          position_id?: string | null
          priority?: number | null
          role_category?: string | null
          role_label?: string | null
          service_id: string
          skills_required?: string[] | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_end_time?: string | null
          default_start_time?: string | null
          id?: string
          is_required?: boolean | null
          max_count?: number | null
          min_count?: number
          notes?: string | null
          position_id?: string | null
          priority?: number | null
          role_category?: string | null
          role_label?: string | null
          service_id?: string
          skills_required?: string[] | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_staffing_requirements_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_staffing_requirements_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service_coverage_summary"
            referencedColumns: ["service_id"]
          },
          {
            foreignKeyName: "service_staffing_requirements_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          code: string | null
          color: string | null
          created_at: string | null
          default_duration_minutes: number | null
          department_id: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          max_staff_count: number | null
          min_staff_count: number | null
          name: string
          requires_dvm: boolean | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          color?: string | null
          created_at?: string | null
          default_duration_minutes?: number | null
          department_id?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          max_staff_count?: number | null
          min_staff_count?: number | null
          name: string
          requires_dvm?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          color?: string | null
          created_at?: string | null
          default_duration_minutes?: number | null
          department_id?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          max_staff_count?: number | null
          min_staff_count?: number | null
          name?: string
          requires_dvm?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_changes: {
        Row: {
          created_at: string
          from_employee_id: string | null
          id: string
          manager_comment: string | null
          manager_employee_id: string | null
          requested_at: string
          resolved_at: string | null
          shift_id: string
          status: string | null
          to_employee_id: string | null
          type: string | null
        }
        Insert: {
          created_at?: string
          from_employee_id?: string | null
          id?: string
          manager_comment?: string | null
          manager_employee_id?: string | null
          requested_at?: string
          resolved_at?: string | null
          shift_id: string
          status?: string | null
          to_employee_id?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string
          from_employee_id?: string | null
          id?: string
          manager_comment?: string | null
          manager_employee_id?: string | null
          requested_at?: string
          resolved_at?: string | null
          shift_id?: string
          status?: string | null
          to_employee_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_changes_from_employee_id_fkey"
            columns: ["from_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_changes_from_employee_id_fkey"
            columns: ["from_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "shift_changes_from_employee_id_fkey"
            columns: ["from_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "shift_changes_manager_employee_id_fkey"
            columns: ["manager_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_changes_manager_employee_id_fkey"
            columns: ["manager_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "shift_changes_manager_employee_id_fkey"
            columns: ["manager_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "shift_changes_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shift_builder_details"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "shift_changes_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_changes_to_employee_id_fkey"
            columns: ["to_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_changes_to_employee_id_fkey"
            columns: ["to_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "shift_changes_to_employee_id_fkey"
            columns: ["to_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      shift_templates: {
        Row: {
          created_at: string
          department_id: string | null
          end_time: string | null
          id: string
          is_active: boolean
          is_remote: boolean
          location_id: string | null
          name: string
          raw_shift: string | null
          role_name: string | null
          start_time: string | null
          updated_at: string
          weekday: number | null
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean
          is_remote?: boolean
          location_id?: string | null
          name: string
          raw_shift?: string | null
          role_name?: string | null
          start_time?: string | null
          updated_at?: string
          weekday?: number | null
        }
        Update: {
          created_at?: string
          department_id?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean
          is_remote?: boolean
          location_id?: string | null
          name?: string
          raw_shift?: string | null
          role_name?: string | null
          start_time?: string | null
          updated_at?: string
          weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_templates_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_templates_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          ai_confidence: number | null
          ai_reasoning: string | null
          ai_suggested: boolean | null
          assignment_source: string | null
          conflict_flags: Json | null
          created_at: string
          created_by_employee_id: string | null
          department_id: string | null
          employee_id: string | null
          end_at: string
          id: string
          is_open_shift: boolean
          is_published: boolean | null
          location_id: string | null
          notes: string | null
          published_at: string | null
          role_required: string | null
          schedule_week_id: string | null
          service_id: string | null
          service_slot_id: string | null
          staffing_requirement_id: string | null
          start_at: string
          status: string
          updated_at: string
          version: number | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_reasoning?: string | null
          ai_suggested?: boolean | null
          assignment_source?: string | null
          conflict_flags?: Json | null
          created_at?: string
          created_by_employee_id?: string | null
          department_id?: string | null
          employee_id?: string | null
          end_at: string
          id?: string
          is_open_shift?: boolean
          is_published?: boolean | null
          location_id?: string | null
          notes?: string | null
          published_at?: string | null
          role_required?: string | null
          schedule_week_id?: string | null
          service_id?: string | null
          service_slot_id?: string | null
          staffing_requirement_id?: string | null
          start_at: string
          status?: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          ai_confidence?: number | null
          ai_reasoning?: string | null
          ai_suggested?: boolean | null
          assignment_source?: string | null
          conflict_flags?: Json | null
          created_at?: string
          created_by_employee_id?: string | null
          department_id?: string | null
          employee_id?: string | null
          end_at?: string
          id?: string
          is_open_shift?: boolean
          is_published?: boolean | null
          location_id?: string | null
          notes?: string | null
          published_at?: string | null
          role_required?: string | null
          schedule_week_id?: string | null
          service_id?: string | null
          service_slot_id?: string | null
          staffing_requirement_id?: string | null
          start_at?: string
          status?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_created_by_employee_id_fkey"
            columns: ["created_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_created_by_employee_id_fkey"
            columns: ["created_by_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "shifts_created_by_employee_id_fkey"
            columns: ["created_by_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "shifts_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "shifts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_schedule_week_id_fkey"
            columns: ["schedule_week_id"]
            isOneToOne: false
            referencedRelation: "schedule_weeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_schedule_week_id_fkey"
            columns: ["schedule_week_id"]
            isOneToOne: false
            referencedRelation: "service_coverage_summary"
            referencedColumns: ["schedule_week_id"]
          },
          {
            foreignKeyName: "shifts_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service_coverage_summary"
            referencedColumns: ["service_id"]
          },
          {
            foreignKeyName: "shifts_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_service_slot_id_fkey"
            columns: ["service_slot_id"]
            isOneToOne: false
            referencedRelation: "service_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_staffing_requirement_id_fkey"
            columns: ["staffing_requirement_id"]
            isOneToOne: false
            referencedRelation: "service_staffing_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          display_order: number | null
          icon_name: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      skill_library: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          level_descriptions: Json | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          level_descriptions?: Json | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          level_descriptions?: Json | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      slack_sync_conflicts: {
        Row: {
          conflict_type: string
          created_at: string
          details: Json | null
          employee_email: string | null
          employee_id: string | null
          id: string
          profile_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          slack_display_name: string | null
          slack_email: string | null
          slack_user_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          conflict_type: string
          created_at?: string
          details?: Json | null
          employee_email?: string | null
          employee_id?: string | null
          id?: string
          profile_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          slack_display_name?: string | null
          slack_email?: string | null
          slack_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          conflict_type?: string
          created_at?: string
          details?: Json | null
          employee_email?: string | null
          employee_id?: string | null
          id?: string
          profile_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          slack_display_name?: string | null
          slack_email?: string | null
          slack_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slack_sync_conflicts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slack_sync_conflicts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "slack_sync_conflicts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "slack_sync_conflicts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "slack_sync_conflicts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slack_sync_conflicts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slack_sync_conflicts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "slack_sync_conflicts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slack_sync_conflicts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
        ]
      }
      slack_sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          deactivated_count: number | null
          error_details: Json | null
          errors_count: number | null
          id: string
          matched_count: number | null
          new_links_count: number | null
          pending_review_count: number | null
          started_at: string
          status: string
          summary: Json | null
          sync_type: string
          total_employees: number | null
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deactivated_count?: number | null
          error_details?: Json | null
          errors_count?: number | null
          id?: string
          matched_count?: number | null
          new_links_count?: number | null
          pending_review_count?: number | null
          started_at?: string
          status: string
          summary?: Json | null
          sync_type: string
          total_employees?: number | null
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deactivated_count?: number | null
          error_details?: Json | null
          errors_count?: number | null
          id?: string
          matched_count?: number | null
          new_links_count?: number | null
          pending_review_count?: number | null
          started_at?: string
          status?: string
          summary?: Json | null
          sync_type?: string
          total_employees?: number | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      social_accounts: {
        Row: {
          created_at: string
          handle: string | null
          id: string
          is_active: boolean
          platform: string
          profile_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          handle?: string | null
          id?: string
          is_active?: boolean
          platform: string
          profile_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          handle?: string | null
          id?: string
          is_active?: boolean
          platform?: string
          profile_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      social_post_attachments: {
        Row: {
          alt_text: string | null
          created_at: string
          file_id: string | null
          id: string
          position: number | null
          social_post_id: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          file_id?: string | null
          id?: string
          position?: number | null
          social_post_id: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          file_id?: string | null
          id?: string
          position?: number | null
          social_post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_attachments_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_attachments_social_post_id_fkey"
            columns: ["social_post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          campaign_id: string | null
          content: string | null
          created_at: string
          created_by_employee_id: string | null
          id: string
          link_url: string | null
          metrics: Json | null
          posted_at: string | null
          scheduled_for: string | null
          social_account_id: string | null
          status: string | null
          target_platforms: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          content?: string | null
          created_at?: string
          created_by_employee_id?: string | null
          id?: string
          link_url?: string | null
          metrics?: Json | null
          posted_at?: string | null
          scheduled_for?: string | null
          social_account_id?: string | null
          status?: string | null
          target_platforms?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          content?: string | null
          created_at?: string
          created_by_employee_id?: string | null
          id?: string
          link_url?: string | null
          metrics?: Json | null
          posted_at?: string | null
          scheduled_for?: string | null
          social_account_id?: string | null
          status?: string | null
          target_platforms?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_created_by_employee_id_fkey"
            columns: ["created_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_created_by_employee_id_fkey"
            columns: ["created_by_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "social_posts_created_by_employee_id_fkey"
            columns: ["created_by_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "social_posts_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      staffing_predictions: {
        Row: {
          accuracy_score: number | null
          actual_demand: Json | null
          confidence_score: number | null
          department_id: string | null
          factors_considered: Json | null
          generated_at: string | null
          id: string
          location_id: string | null
          predicted_demand: Json | null
          prediction_date: string
          recommended_staff: Json | null
        }
        Insert: {
          accuracy_score?: number | null
          actual_demand?: Json | null
          confidence_score?: number | null
          department_id?: string | null
          factors_considered?: Json | null
          generated_at?: string | null
          id?: string
          location_id?: string | null
          predicted_demand?: Json | null
          prediction_date: string
          recommended_staff?: Json | null
        }
        Update: {
          accuracy_score?: number | null
          actual_demand?: Json | null
          confidence_score?: number | null
          department_id?: string | null
          factors_considered?: Json | null
          generated_at?: string | null
          id?: string
          location_id?: string | null
          predicted_demand?: Json | null
          prediction_date?: string
          recommended_staff?: Json | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to_employee_id: string | null
          created_at: string
          created_by_employee_id: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to_employee_id?: string | null
          created_at?: string
          created_by_employee_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to_employee_id?: string | null
          created_at?: string
          created_by_employee_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_employee_id_fkey"
            columns: ["assigned_to_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_employee_id_fkey"
            columns: ["assigned_to_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_employee_id_fkey"
            columns: ["assigned_to_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "tasks_created_by_employee_id_fkey"
            columns: ["created_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_employee_id_fkey"
            columns: ["created_by_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "tasks_created_by_employee_id_fkey"
            columns: ["created_by_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          approved_at: string | null
          approved_by_employee_id: string | null
          clock_in_at: string | null
          clock_out_at: string | null
          correction_reason: string | null
          created_at: string
          employee_id: string
          id: string
          is_approved: boolean
          shift_id: string | null
          total_hours: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_employee_id?: string | null
          clock_in_at?: string | null
          clock_out_at?: string | null
          correction_reason?: string | null
          created_at?: string
          employee_id: string
          id?: string
          is_approved?: boolean
          shift_id?: string | null
          total_hours?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by_employee_id?: string | null
          clock_in_at?: string | null
          clock_out_at?: string | null
          correction_reason?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          is_approved?: boolean
          shift_id?: string | null
          total_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_approved_by_employee_id_fkey"
            columns: ["approved_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_approved_by_employee_id_fkey"
            columns: ["approved_by_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "time_entries_approved_by_employee_id_fkey"
            columns: ["approved_by_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "time_entries_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shift_builder_details"
            referencedColumns: ["shift_id"]
          },
          {
            foreignKeyName: "time_entries_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entry_corrections: {
        Row: {
          corrected_at: string
          corrected_by: string | null
          corrected_clock_in: string | null
          corrected_clock_out: string | null
          corrected_total_hours: number | null
          correction_reason: string
          id: string
          original_clock_in: string | null
          original_clock_out: string | null
          original_total_hours: number | null
          pay_period_end: string
          pay_period_start: string
          time_entry_id: string
        }
        Insert: {
          corrected_at?: string
          corrected_by?: string | null
          corrected_clock_in?: string | null
          corrected_clock_out?: string | null
          corrected_total_hours?: number | null
          correction_reason: string
          id?: string
          original_clock_in?: string | null
          original_clock_out?: string | null
          original_total_hours?: number | null
          pay_period_end: string
          pay_period_start: string
          time_entry_id: string
        }
        Update: {
          corrected_at?: string
          corrected_by?: string | null
          corrected_clock_in?: string | null
          corrected_clock_out?: string | null
          corrected_total_hours?: number | null
          correction_reason?: string
          id?: string
          original_clock_in?: string | null
          original_clock_out?: string | null
          original_total_hours?: number | null
          pay_period_end?: string
          pay_period_start?: string
          time_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entry_corrections_corrected_by_fkey"
            columns: ["corrected_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entry_corrections_corrected_by_fkey"
            columns: ["corrected_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "time_entry_corrections_corrected_by_fkey"
            columns: ["corrected_by"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "time_entry_corrections_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      time_off_requests: {
        Row: {
          approved_at: string | null
          approved_by_employee_id: string | null
          created_at: string
          duration_hours: number | null
          employee_id: string
          end_date: string
          id: string
          manager_comment: string | null
          profile_id: string | null
          reason: string | null
          requested_at: string
          start_date: string
          status: string
          time_off_type_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_employee_id?: string | null
          created_at?: string
          duration_hours?: number | null
          employee_id: string
          end_date: string
          id?: string
          manager_comment?: string | null
          profile_id?: string | null
          reason?: string | null
          requested_at?: string
          start_date: string
          status?: string
          time_off_type_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by_employee_id?: string | null
          created_at?: string
          duration_hours?: number | null
          employee_id?: string
          end_date?: string
          id?: string
          manager_comment?: string | null
          profile_id?: string | null
          reason?: string | null
          requested_at?: string
          start_date?: string
          status?: string
          time_off_type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_off_requests_approved_by_employee_id_fkey"
            columns: ["approved_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_requests_approved_by_employee_id_fkey"
            columns: ["approved_by_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "time_off_requests_approved_by_employee_id_fkey"
            columns: ["approved_by_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "time_off_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "time_off_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "time_off_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "time_off_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_requests_time_off_type_id_fkey"
            columns: ["time_off_type_id"]
            isOneToOne: false
            referencedRelation: "time_off_types"
            referencedColumns: ["id"]
          },
        ]
      }
      time_off_types: {
        Row: {
          code: string | null
          created_at: string
          default_hours_per_day: number | null
          id: string
          is_paid: boolean
          name: string
          requires_approval: boolean
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          default_hours_per_day?: number | null
          id?: string
          is_paid?: boolean
          name: string
          requires_approval?: boolean
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          default_hours_per_day?: number | null
          id?: string
          is_paid?: boolean
          name?: string
          requires_approval?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      time_punches: {
        Row: {
          clock_device_id: string | null
          created_at: string
          employee_id: string
          geo_accuracy_meters: number | null
          geofence_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          punch_type: string
          punched_at: string
          source: string | null
          violation_reason: string | null
          within_geofence: boolean | null
        }
        Insert: {
          clock_device_id?: string | null
          created_at?: string
          employee_id: string
          geo_accuracy_meters?: number | null
          geofence_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          punch_type: string
          punched_at?: string
          source?: string | null
          violation_reason?: string | null
          within_geofence?: boolean | null
        }
        Update: {
          clock_device_id?: string | null
          created_at?: string
          employee_id?: string
          geo_accuracy_meters?: number | null
          geofence_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          punch_type?: string
          punched_at?: string
          source?: string | null
          violation_reason?: string | null
          within_geofence?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "time_punches_clock_device_id_fkey"
            columns: ["clock_device_id"]
            isOneToOne: false
            referencedRelation: "clock_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_punches_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_punches_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "time_punches_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "time_punches_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
        ]
      }
      training_courses: {
        Row: {
          category: string | null
          code: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty_level: string | null
          estimated_hours: number | null
          id: string
          is_active: boolean
          is_required: boolean
          is_required_for_role: boolean
          required_for_position_ids: Json | null
          skill_id: string | null
          skill_level_awarded: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          estimated_hours?: number | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          is_required_for_role?: boolean
          required_for_position_ids?: Json | null
          skill_id?: string | null
          skill_level_awarded?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          estimated_hours?: number | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          is_required_for_role?: boolean
          required_for_position_ids?: Json | null
          skill_id?: string | null
          skill_level_awarded?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "training_courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_courses_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_library"
            referencedColumns: ["id"]
          },
        ]
      }
      training_enrollments: {
        Row: {
          assigned_by: string | null
          completed_at: string | null
          course_id: string
          created_at: string
          due_date: string | null
          employee_id: string
          enrolled_at: string
          id: string
          progress_percent: number | null
          requires_signoff: boolean | null
          signoff_at: string | null
          signoff_by: string | null
          signoff_notes: string | null
          skill_awarded: boolean | null
          status: string | null
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          completed_at?: string | null
          course_id: string
          created_at?: string
          due_date?: string | null
          employee_id: string
          enrolled_at?: string
          id?: string
          progress_percent?: number | null
          requires_signoff?: boolean | null
          signoff_at?: string | null
          signoff_by?: string | null
          signoff_notes?: string | null
          skill_awarded?: boolean | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          completed_at?: string | null
          course_id?: string
          created_at?: string
          due_date?: string | null
          employee_id?: string
          enrolled_at?: string
          id?: string
          progress_percent?: number | null
          requires_signoff?: boolean | null
          signoff_at?: string | null
          signoff_by?: string | null
          signoff_notes?: string | null
          skill_awarded?: boolean | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_enrollments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "training_enrollments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "training_enrollments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "training_enrollments_signoff_by_fkey"
            columns: ["signoff_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "training_enrollments_signoff_by_fkey"
            columns: ["signoff_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollments_signoff_by_fkey"
            columns: ["signoff_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
        ]
      }
      training_lessons: {
        Row: {
          content: string | null
          content_payload: Json | null
          content_type: string | null
          course_id: string
          created_at: string
          est_minutes: number | null
          file_id: string | null
          id: string
          position: number | null
          requires_completion: boolean | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          content_payload?: Json | null
          content_type?: string | null
          course_id: string
          created_at?: string
          est_minutes?: number | null
          file_id?: string | null
          id?: string
          position?: number | null
          requires_completion?: boolean | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          content_payload?: Json | null
          content_type?: string | null
          course_id?: string
          created_at?: string
          est_minutes?: number | null
          file_id?: string | null
          id?: string
          position?: number | null
          requires_completion?: boolean | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_lessons_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      training_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          employee_id: string
          id: string
          lesson_id: string
          progress_percent: number | null
          started_at: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          employee_id: string
          id?: string
          lesson_id: string
          progress_percent?: number | null
          started_at?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          lesson_id?: string
          progress_percent?: number | null
          started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_progress_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_progress_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "training_progress_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "training_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "training_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      training_quiz_attempts: {
        Row: {
          answers: Json | null
          completed_at: string | null
          created_at: string
          employee_id: string
          id: string
          passed: boolean | null
          quiz_id: string
          score: number | null
          started_at: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          created_at?: string
          employee_id: string
          id?: string
          passed?: boolean | null
          quiz_id: string
          score?: number | null
          started_at?: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          passed?: boolean | null
          quiz_id?: string
          score?: number | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_quiz_attempts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_quiz_attempts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "training_quiz_attempts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "training_quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "training_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      training_quiz_questions: {
        Row: {
          correct_answer: Json | null
          created_at: string
          id: string
          options: Json | null
          position: number | null
          question_text: string
          question_type: string | null
          quiz_id: string
        }
        Insert: {
          correct_answer?: Json | null
          created_at?: string
          id?: string
          options?: Json | null
          position?: number | null
          question_text: string
          question_type?: string | null
          quiz_id: string
        }
        Update: {
          correct_answer?: Json | null
          created_at?: string
          id?: string
          options?: Json | null
          position?: number | null
          question_text?: string
          question_type?: string | null
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "training_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      training_quizzes: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          instructions: string | null
          lesson_id: string | null
          passing_score: number | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          lesson_id?: string | null
          passing_score?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          lesson_id?: string | null
          passing_score?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "training_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_persons: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          avatar_url: string | null
          candidate_id: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          current_stage: Database["public"]["Enums"]["person_lifecycle_stage"]
          date_of_birth: string | null
          do_not_contact: boolean | null
          documents: Json | null
          education_visitor_id: string | null
          email: string
          email_secondary: string | null
          email_verified: boolean | null
          emergency_contact_email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          employee_id: string | null
          first_name: string
          gender: string | null
          id: string
          is_active: boolean | null
          last_activity_at: string | null
          last_name: string
          linkedin_url: string | null
          marketing_lead_id: string | null
          phone_home: string | null
          phone_mobile: string | null
          phone_verified: boolean | null
          phone_work: string | null
          postal_code: string | null
          preferred_name: string | null
          profile_id: string | null
          pronouns: string | null
          referral_source: string | null
          resume_url: string | null
          source_detail: string | null
          source_type: string | null
          stage_entered_at: string
          state: string | null
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          website_url: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          candidate_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          current_stage?: Database["public"]["Enums"]["person_lifecycle_stage"]
          date_of_birth?: string | null
          do_not_contact?: boolean | null
          documents?: Json | null
          education_visitor_id?: string | null
          email: string
          email_secondary?: string | null
          email_verified?: boolean | null
          emergency_contact_email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employee_id?: string | null
          first_name: string
          gender?: string | null
          id?: string
          is_active?: boolean | null
          last_activity_at?: string | null
          last_name: string
          linkedin_url?: string | null
          marketing_lead_id?: string | null
          phone_home?: string | null
          phone_mobile?: string | null
          phone_verified?: boolean | null
          phone_work?: string | null
          postal_code?: string | null
          preferred_name?: string | null
          profile_id?: string | null
          pronouns?: string | null
          referral_source?: string | null
          resume_url?: string | null
          source_detail?: string | null
          source_type?: string | null
          stage_entered_at?: string
          state?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          website_url?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          candidate_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          current_stage?: Database["public"]["Enums"]["person_lifecycle_stage"]
          date_of_birth?: string | null
          do_not_contact?: boolean | null
          documents?: Json | null
          education_visitor_id?: string | null
          email?: string
          email_secondary?: string | null
          email_verified?: boolean | null
          emergency_contact_email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employee_id?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean | null
          last_activity_at?: string | null
          last_name?: string
          linkedin_url?: string | null
          marketing_lead_id?: string | null
          phone_home?: string | null
          phone_mobile?: string | null
          phone_verified?: boolean | null
          phone_work?: string | null
          postal_code?: string | null
          preferred_name?: string | null
          profile_id?: string | null
          pronouns?: string | null
          referral_source?: string | null
          resume_url?: string | null
          source_detail?: string | null
          source_type?: string | null
          stage_entered_at?: string
          state?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unified_persons_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_persons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "unified_persons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_persons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_persons_education_visitor_id_fkey"
            columns: ["education_visitor_id"]
            isOneToOne: false
            referencedRelation: "education_visitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_persons_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_persons_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "unified_persons_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "unified_persons_marketing_lead_id_fkey"
            columns: ["marketing_lead_id"]
            isOneToOne: false
            referencedRelation: "marketing_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_persons_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "unified_persons_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_persons_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
        ]
      }
      user_role_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          id: string
          profile_id: string | null
          role_key: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          profile_id?: string | null
          role_key: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          profile_id?: string | null
          role_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_role_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_role_assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_articles: {
        Row: {
          author_id: string | null
          category: string
          content: string
          created_at: string | null
          id: string
          is_published: boolean | null
          tags: string[] | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author_id?: string | null
          category: string
          content: string
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author_id?: string | null
          category?: string
          content?: string
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      work_schedules: {
        Row: {
          created_at: string
          employee_id: string
          end_time: string | null
          id: string
          is_active: boolean
          start_time: string | null
          updated_at: string
          weekday: number
        }
        Insert: {
          created_at?: string
          employee_id: string
          end_time?: string | null
          id?: string
          is_active?: boolean
          start_time?: string | null
          updated_at?: string
          weekday: number
        }
        Update: {
          created_at?: string
          employee_id?: string
          end_time?: string | null
          id?: string
          is_active?: boolean
          start_time?: string | null
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "work_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "work_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
        ]
      }
    }
    Views: {
      access_matrix_summary: {
        Row: {
          display_name: string | null
          full_access_pages: number | null
          no_access_pages: number | null
          role_key: string | null
          tier: number | null
          total_pages_defined: number | null
          view_access_pages: number | null
        }
        Relationships: []
      }
      access_matrix_view: {
        Row: {
          access_level: string | null
          page_icon: string | null
          page_id: string | null
          page_name: string | null
          path: string | null
          role_color: string | null
          role_display_name: string | null
          role_icon: string | null
          role_key: string | null
          role_tier: number | null
          section: string | null
          sort_order: number | null
        }
        Relationships: []
      }
      contact_notes_view: {
        Row: {
          author_id: string | null
          author_initials: string | null
          author_name: string | null
          contact_id: string | null
          contact_type: string | null
          created_at: string | null
          edited_at: string | null
          edited_by_id: string | null
          edited_by_initials: string | null
          edited_by_name: string | null
          enrollment_id: string | null
          id: string | null
          is_archived: boolean | null
          is_pinned: boolean | null
          note: string | null
          note_type: string | null
          source_note_id: string | null
          transferred_at: string | null
          transferred_from: string | null
          updated_at: string | null
          visibility: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "contact_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_edited_by_id_fkey"
            columns: ["edited_by_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "contact_notes_edited_by_id_fkey"
            columns: ["edited_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_edited_by_id_fkey"
            columns: ["edited_by_id"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_change_log_view: {
        Row: {
          change_note: string | null
          change_source: string | null
          changed_by_email: string | null
          changed_by_name: string | null
          changed_by_profile_id: string | null
          created_at: string | null
          employee_id: string | null
          employee_name: string | null
          field_label: string | null
          field_name: string | null
          id: string | null
          new_value: string | null
          old_value: string | null
          table_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_change_log_changed_by_profile_id_fkey"
            columns: ["changed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "employee_change_log_changed_by_profile_id_fkey"
            columns: ["changed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_change_log_changed_by_profile_id_fkey"
            columns: ["changed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_change_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_change_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_change_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employee_documents_with_details: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          employee_id: string | null
          employee_name: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string | null
          updated_at: string | null
          uploader_email: string | null
          uploader_id: string | null
        }
        Relationships: []
      }
      employee_locations_view: {
        Row: {
          assigned_at: string | null
          created_at: string | null
          employee_id: string | null
          employee_name: string | null
          first_name: string | null
          id: string | null
          is_primary: boolean | null
          last_name: string | null
          location_address: string | null
          location_id: string | null
          location_name: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      ezyvet_division_summary: {
        Row: {
          active_count: number | null
          avg_revenue: number | null
          client_count: number | null
          division: string | null
          total_revenue: number | null
        }
        Relationships: []
      }
      ezyvet_revenue_by_breed: {
        Row: {
          avg_revenue: number | null
          breed: string | null
          client_count: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      ezyvet_revenue_by_city: {
        Row: {
          avg_revenue: number | null
          city: string | null
          client_count: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      ezyvet_revenue_by_department: {
        Row: {
          avg_revenue: number | null
          client_count: number | null
          department: string | null
          total_revenue: number | null
        }
        Relationships: []
      }
      ezyvet_revenue_by_referral: {
        Row: {
          avg_revenue: number | null
          client_count: number | null
          source: string | null
          total_revenue: number | null
        }
        Relationships: []
      }
      master_profile_view: {
        Row: {
          access_active: boolean | null
          acquisition_source: string | null
          address_line1: string | null
          address_line2: string | null
          applied_at: string | null
          avatar_url: string | null
          candidate_type: string | null
          city: string | null
          country: string | null
          created_at: string | null
          crm_tags: Json | null
          current_position_title: string | null
          current_stage:
            | Database["public"]["Enums"]["person_lifecycle_stage"]
            | null
          date_of_birth: string | null
          department_name: string | null
          email: string | null
          email_secondary: string | null
          emergency_contact_email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          employee_number: string | null
          employment_status: string | null
          employment_type: string | null
          first_name: string | null
          gender: string | null
          has_crm_data: boolean | null
          has_employee_data: boolean | null
          has_recruiting_data: boolean | null
          has_system_access: boolean | null
          hire_date: string | null
          id: string | null
          is_active: boolean | null
          last_activity_at: string | null
          last_name: string | null
          lead_score: number | null
          lead_status: string | null
          linkedin_url: string | null
          location_name: string | null
          overall_rating: number | null
          pay_rate: number | null
          pay_type: string | null
          phone_home: string | null
          phone_mobile: string | null
          phone_work: string | null
          postal_code: string | null
          preferred_name: string | null
          pronouns: string | null
          recruiting_status: string | null
          referral_source: string | null
          source_detail: string | null
          source_type: string | null
          stage_entered_at: string | null
          state: string | null
          system_role: string | null
          target_position_id: string | null
          target_position_title: string | null
          updated_at: string | null
          website_url: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_recruiting_data_target_position_id_fkey"
            columns: ["target_position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_details: {
        Row: {
          address: string | null
          average_monthly_revenue: number | null
          best_contact_person: string | null
          booth_size: string | null
          category: string | null
          ce_event_host: boolean | null
          clinic_type: string | null
          color: string | null
          communication_preference: string | null
          confirmed_events: number | null
          contact_name: string | null
          contact_person: string | null
          contact_status: string | null
          contract_end_date: string | null
          created_at: string | null
          current_month_referrals: number | null
          current_quarter_revenue: number | null
          days_since_contact: number | null
          deleted_at: string | null
          description: string | null
          drop_off_materials: boolean | null
          email: string | null
          employee_count: string | null
          events_attended: string[] | null
          facebook_url: string | null
          followup_reason: string | null
          hospital_name: string | null
          icon: string | null
          id: string | null
          instagram_handle: string | null
          is_active: boolean | null
          is_confirmed: boolean | null
          key_decision_maker: string | null
          key_decision_maker_email: string | null
          key_decision_maker_phone: string | null
          key_decision_maker_title: string | null
          last_contact_date: string | null
          last_note_date: string | null
          last_sync_date: string | null
          last_visit: string | null
          last_visit_date: string | null
          linkedin_url: string | null
          lunch_and_learn_eligible: boolean | null
          monthly_referral_goal: number | null
          name: string | null
          needs_followup: boolean | null
          next_followup_date: string | null
          notes: string | null
          organization_type: string | null
          partner_type: string | null
          payment_amount: number | null
          payment_date: string | null
          payment_status: string | null
          phone: string | null
          preferences: Json | null
          preferred_contact_time: string | null
          preferred_visit_day: string | null
          preferred_visit_time: string | null
          priority: string | null
          products: string[] | null
          quarterly_revenue_goal: number | null
          referral_agreement_type: string | null
          referral_value_monthly: number | null
          relationship_score: number | null
          relationship_status: string | null
          revenue_last_year: number | null
          revenue_ytd: number | null
          size: string | null
          specialty_areas: string[] | null
          status: string | null
          tags: string[] | null
          tier: string | null
          total_events: number | null
          total_notes: number | null
          total_referrals: number | null
          total_referrals_all_time: number | null
          total_referrals_ytd: number | null
          total_revenue_all_time: number | null
          total_visits: number | null
          updated_at: string | null
          visit_frequency: string | null
          website: string | null
          zone: string | null
        }
        Insert: {
          address?: string | null
          average_monthly_revenue?: number | null
          best_contact_person?: string | null
          booth_size?: string | null
          category?: string | null
          ce_event_host?: boolean | null
          clinic_type?: string | null
          color?: string | null
          communication_preference?: string | null
          confirmed_events?: never
          contact_name?: string | null
          contact_person?: string | null
          contact_status?: never
          contract_end_date?: string | null
          created_at?: string | null
          current_month_referrals?: number | null
          current_quarter_revenue?: number | null
          days_since_contact?: never
          deleted_at?: string | null
          description?: string | null
          drop_off_materials?: boolean | null
          email?: string | null
          employee_count?: string | null
          events_attended?: string[] | null
          facebook_url?: string | null
          followup_reason?: string | null
          hospital_name?: string | null
          icon?: string | null
          id?: string | null
          instagram_handle?: string | null
          is_active?: boolean | null
          is_confirmed?: boolean | null
          key_decision_maker?: string | null
          key_decision_maker_email?: string | null
          key_decision_maker_phone?: string | null
          key_decision_maker_title?: string | null
          last_contact_date?: string | null
          last_note_date?: never
          last_sync_date?: string | null
          last_visit?: never
          last_visit_date?: string | null
          linkedin_url?: string | null
          lunch_and_learn_eligible?: boolean | null
          monthly_referral_goal?: number | null
          name?: string | null
          needs_followup?: boolean | null
          next_followup_date?: string | null
          notes?: string | null
          organization_type?: string | null
          partner_type?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_status?: string | null
          phone?: string | null
          preferences?: Json | null
          preferred_contact_time?: string | null
          preferred_visit_day?: string | null
          preferred_visit_time?: string | null
          priority?: string | null
          products?: string[] | null
          quarterly_revenue_goal?: number | null
          referral_agreement_type?: string | null
          referral_value_monthly?: number | null
          relationship_score?: number | null
          relationship_status?: string | null
          revenue_last_year?: number | null
          revenue_ytd?: number | null
          size?: string | null
          specialty_areas?: string[] | null
          status?: string | null
          tags?: string[] | null
          tier?: string | null
          total_events?: never
          total_notes?: never
          total_referrals?: number | null
          total_referrals_all_time?: number | null
          total_referrals_ytd?: number | null
          total_revenue_all_time?: number | null
          total_visits?: never
          updated_at?: string | null
          visit_frequency?: string | null
          website?: string | null
          zone?: string | null
        }
        Update: {
          address?: string | null
          average_monthly_revenue?: number | null
          best_contact_person?: string | null
          booth_size?: string | null
          category?: string | null
          ce_event_host?: boolean | null
          clinic_type?: string | null
          color?: string | null
          communication_preference?: string | null
          confirmed_events?: never
          contact_name?: string | null
          contact_person?: string | null
          contact_status?: never
          contract_end_date?: string | null
          created_at?: string | null
          current_month_referrals?: number | null
          current_quarter_revenue?: number | null
          days_since_contact?: never
          deleted_at?: string | null
          description?: string | null
          drop_off_materials?: boolean | null
          email?: string | null
          employee_count?: string | null
          events_attended?: string[] | null
          facebook_url?: string | null
          followup_reason?: string | null
          hospital_name?: string | null
          icon?: string | null
          id?: string | null
          instagram_handle?: string | null
          is_active?: boolean | null
          is_confirmed?: boolean | null
          key_decision_maker?: string | null
          key_decision_maker_email?: string | null
          key_decision_maker_phone?: string | null
          key_decision_maker_title?: string | null
          last_contact_date?: string | null
          last_note_date?: never
          last_sync_date?: string | null
          last_visit?: never
          last_visit_date?: string | null
          linkedin_url?: string | null
          lunch_and_learn_eligible?: boolean | null
          monthly_referral_goal?: number | null
          name?: string | null
          needs_followup?: boolean | null
          next_followup_date?: string | null
          notes?: string | null
          organization_type?: string | null
          partner_type?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_status?: string | null
          phone?: string | null
          preferences?: Json | null
          preferred_contact_time?: string | null
          preferred_visit_day?: string | null
          preferred_visit_time?: string | null
          priority?: string | null
          products?: string[] | null
          quarterly_revenue_goal?: number | null
          referral_agreement_type?: string | null
          referral_value_monthly?: number | null
          relationship_score?: number | null
          relationship_status?: string | null
          revenue_last_year?: number | null
          revenue_ytd?: number | null
          size?: string | null
          specialty_areas?: string[] | null
          status?: string | null
          tags?: string[] | null
          tier?: string | null
          total_events?: never
          total_notes?: never
          total_referrals?: number | null
          total_referrals_all_time?: number | null
          total_referrals_ytd?: number | null
          total_revenue_all_time?: number | null
          total_visits?: never
          updated_at?: string | null
          visit_frequency?: string | null
          website?: string | null
          zone?: string | null
        }
        Relationships: []
      }
      partner_event_history: {
        Row: {
          booth_location: string | null
          booth_size: string | null
          confirmation_date: string | null
          created_at: string | null
          event_date: string | null
          event_id: string | null
          event_location: string | null
          event_name: string | null
          id: string | null
          is_confirmed: boolean | null
          notes: string | null
          participation_role: string | null
          partner_id: string | null
          partner_name: string | null
          partner_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "marketing_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_events_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_events_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "referral_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_course_signoffs: {
        Row: {
          completed_at: string | null
          course_id: string | null
          course_title: string | null
          department_id: string | null
          employee_id: string | null
          employee_name: string | null
          enrollment_id: string | null
          manager_employee_id: string | null
          progress_percent: number | null
          requires_signoff: boolean | null
          signoff_at: string | null
          signoff_by: string | null
          skill_id: string | null
          skill_level_awarded: number | null
          skill_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_employee_id_fkey"
            columns: ["manager_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_employee_id_fkey"
            columns: ["manager_employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employees_manager_employee_id_fkey"
            columns: ["manager_employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "training_courses_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "training_enrollments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "training_enrollments_signoff_by_fkey"
            columns: ["signoff_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "training_enrollments_signoff_by_fkey"
            columns: ["signoff_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollments_signoff_by_fkey"
            columns: ["signoff_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_user_accounts: {
        Row: {
          auth_user_id: string | null
          department_name: string | null
          display_name: string | null
          email_personal: string | null
          email_work: string | null
          employee_id: string | null
          employee_number: string | null
          employment_status: string | null
          first_name: string | null
          hire_date: string | null
          hired_at: string | null
          last_name: string | null
          location_name: string | null
          needs_user_account: boolean | null
          onboarding_status: string | null
          phone_mobile: string | null
          position_title: string | null
          profile_id: string | null
          profile_role: string | null
        }
        Relationships: []
      }
      schedule_with_names: {
        Row: {
          created_at: string | null
          created_by: string | null
          date: string | null
          email: string | null
          employee_id: string | null
          end_time: string | null
          first_name: string | null
          full_name: string | null
          id: string | null
          last_name: string | null
          location_id: string | null
          location_name: string | null
          notes: string | null
          profile_id: string | null
          shift_type: string | null
          start_time: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "schedules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "schedules_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "user_role_info"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduling_context: {
        Row: {
          current_week_hours: number | null
          employee_id: string | null
          employment_type: string | null
          first_name: string | null
          is_active: boolean | null
          last_name: string | null
          position_id: string | null
          position_title: string | null
          primary_location_id: string | null
          recent_hours_4_weeks: number | null
          skills: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      service_coverage_summary: {
        Row: {
          filled_slots: number | null
          location_id: string | null
          location_name: string | null
          schedule_week_id: string | null
          service_code: string | null
          service_id: string | null
          service_name: string | null
          status: string | null
          total_slots: number | null
          week_start: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_weeks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_builder_details: {
        Row: {
          ai_confidence: number | null
          ai_reasoning: string | null
          ai_suggested: boolean | null
          assignment_source: string | null
          conflict_flags: Json | null
          employee_first_name: string | null
          employee_id: string | null
          employee_last_name: string | null
          employee_position: string | null
          end_at: string | null
          hours: number | null
          is_open_shift: boolean | null
          is_published: boolean | null
          location_id: string | null
          location_name: string | null
          notes: string | null
          role_category: string | null
          role_label: string | null
          schedule_week_id: string | null
          service_code: string | null
          service_color: string | null
          service_id: string | null
          service_name: string | null
          shift_id: string | null
          staffing_requirement_id: string | null
          start_at: string | null
          week_start: string | null
          week_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "shifts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_schedule_week_id_fkey"
            columns: ["schedule_week_id"]
            isOneToOne: false
            referencedRelation: "schedule_weeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_schedule_week_id_fkey"
            columns: ["schedule_week_id"]
            isOneToOne: false
            referencedRelation: "service_coverage_summary"
            referencedColumns: ["schedule_week_id"]
          },
          {
            foreignKeyName: "shifts_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service_coverage_summary"
            referencedColumns: ["service_id"]
          },
          {
            foreignKeyName: "shifts_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_staffing_requirement_id_fkey"
            columns: ["staffing_requirement_id"]
            isOneToOne: false
            referencedRelation: "service_staffing_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      student_program_view: {
        Row: {
          academic_advisor: string | null
          actual_completion_date: string | null
          assigned_coordinator_id: string | null
          assigned_location_id: string | null
          assigned_mentor_id: string | null
          avatar_url: string | null
          cohort_identifier: string | null
          completion_percentage: number | null
          converted_to_employee: boolean | null
          coordinator_name: string | null
          created_at: string | null
          display_name: string | null
          eligible_for_employment: boolean | null
          email: string | null
          employment_interest_level: string | null
          end_date: string | null
          enrollment_id: string | null
          enrollment_status:
            | Database["public"]["Enums"]["program_enrollment_status"]
            | null
          expected_graduation_date: string | null
          first_name: string | null
          hours_completed: number | null
          hours_required: number | null
          is_paid: boolean | null
          last_name: string | null
          lifecycle_stage:
            | Database["public"]["Enums"]["person_lifecycle_stage"]
            | null
          location_name: string | null
          mentor_name: string | null
          overall_performance_rating: string | null
          person_id: string | null
          phone_mobile: string | null
          preferred_name: string | null
          program_name: string | null
          program_type:
            | Database["public"]["Enums"]["education_program_type"]
            | null
          schedule_type: string | null
          scheduled_hours_per_week: number | null
          school_of_origin: string | null
          school_program: string | null
          start_date: string | null
          stipend_amount: number | null
          stipend_frequency: string | null
          time_status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_program_data_assigned_coordinator_id_fkey"
            columns: ["assigned_coordinator_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_program_data_assigned_coordinator_id_fkey"
            columns: ["assigned_coordinator_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "person_program_data_assigned_coordinator_id_fkey"
            columns: ["assigned_coordinator_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "person_program_data_assigned_location_id_fkey"
            columns: ["assigned_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_program_data_assigned_mentor_id_fkey"
            columns: ["assigned_mentor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_program_data_assigned_mentor_id_fkey"
            columns: ["assigned_mentor_id"]
            isOneToOne: false
            referencedRelation: "pending_user_accounts"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "person_program_data_assigned_mentor_id_fkey"
            columns: ["assigned_mentor_id"]
            isOneToOne: false
            referencedRelation: "scheduling_context"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      unified_persons_view: {
        Row: {
          acquisition_campaign: string | null
          acquisition_source: string | null
          created_at: string | null
          current_stage:
            | Database["public"]["Enums"]["person_lifecycle_stage"]
            | null
          department_id: string | null
          email: string | null
          employee_number: string | null
          employment_status: string | null
          first_name: string | null
          hire_date: string | null
          id: string | null
          last_name: string | null
          lead_status: string | null
          phone_mobile: string | null
          recruiting_status: string | null
          resume_url: string | null
          target_position_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_employee_data_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_recruiting_data_target_position_id_fkey"
            columns: ["target_position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_role_info: {
        Row: {
          auth_user_id: string | null
          email: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          role: string | null
          role_color: string | null
          role_description: string | null
          role_display_name: string | null
          role_icon: string | null
          role_permissions: Json | null
          role_tier: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_contact_note: {
        Args: {
          p_contact_id: string
          p_contact_type: string
          p_enrollment_id?: string
          p_note: string
          p_note_type?: string
          p_visibility?: string
        }
        Returns: string
      }
      add_crm_hat: {
        Args: {
          p_acquisition_detail?: string
          p_acquisition_source?: string
          p_notes?: string
          p_person_id: string
          p_tags?: Json
        }
        Returns: string
      }
      add_employee_hat: {
        Args: {
          p_department_id?: string
          p_employment_type?: string
          p_hire_date?: string
          p_location_id?: string
          p_pay_rate?: number
          p_pay_type?: string
          p_person_id: string
          p_position_id: string
        }
        Returns: string
      }
      add_program_hat: {
        Args: {
          p_application_data?: Json
          p_assigned_location_id?: string
          p_assigned_mentor_id?: string
          p_end_date?: string
          p_person_id: string
          p_program_name?: string
          p_program_type: Database["public"]["Enums"]["education_program_type"]
          p_school_of_origin?: string
          p_start_date?: string
        }
        Returns: string
      }
      add_recruiting_hat: {
        Args: {
          p_candidate_type?: string
          p_person_id: string
          p_resume_url?: string
          p_target_department_id?: string
          p_target_location_id?: string
          p_target_position_id?: string
        }
        Returns: string
      }
      ai_auto_fill_draft: {
        Args: {
          p_balance_hours?: boolean
          p_draft_id: string
          p_respect_availability?: boolean
        }
        Returns: Json
      }
      apply_template_to_draft: {
        Args: {
          p_location_id: string
          p_template_id: string
          p_week_start: string
        }
        Returns: string
      }
      apply_template_to_week: {
        Args: {
          p_clear_existing?: boolean
          p_template_id: string
          p_week_start: string
        }
        Returns: {
          shifts_created: number
          shifts_skipped: number
        }[]
      }
      archive_old_audit_logs: { Args: never; Returns: number }
      assign_employee_to_slot: {
        Args: { p_employee_id: string; p_slot_id: string }
        Returns: boolean
      }
      assign_training_course_to_all: {
        Args: {
          p_assigned_by?: string
          p_course_id: string
          p_due_days?: number
          p_requires_signoff?: boolean
        }
        Returns: number
      }
      assign_training_course_to_department: {
        Args: {
          p_assigned_by?: string
          p_course_id: string
          p_department: string
          p_due_days?: number
          p_requires_signoff?: boolean
        }
        Returns: number
      }
      assign_training_course_to_employee: {
        Args: {
          p_assigned_by?: string
          p_course_id: string
          p_due_date?: string
          p_employee_id: string
          p_requires_signoff?: boolean
        }
        Returns: string
      }
      auto_complete_past_shifts: {
        Args: never
        Returns: {
          synced_count: number
          updated_count: number
        }[]
      }
      backfill_unified_persons: {
        Args: never
        Returns: {
          duplicates_skipped: number
          records_created: number
          records_processed: number
          source_table: string
        }[]
      }
      calculate_influencer_tier: {
        Args: { follower_count: number }
        Returns: string
      }
      calculate_overtime_breakdown: {
        Args: {
          p_employee_id: string
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          double_time_hours: number
          overtime_hours: number
          regular_hours: number
          total_hours: number
        }[]
      }
      calculate_partner_metrics: { Args: never; Returns: undefined }
      calculate_reliability_score: {
        Args: { p_employee_id: string; p_lookback_days?: number }
        Returns: number
      }
      can_access_hr: { Args: never; Returns: boolean }
      can_access_marketing: { Args: never; Returns: boolean }
      can_manage_schedule: { Args: never; Returns: boolean }
      can_view_schedule: { Args: never; Returns: boolean }
      check_database_health: { Args: never; Returns: Json }
      check_duplicate_person_email: {
        Args: { p_email: string }
        Returns: {
          existing_name: string
          existing_person_id: string
          existing_stage: Database["public"]["Enums"]["person_lifecycle_stage"]
          is_duplicate: boolean
        }[]
      }
      check_page_access: {
        Args: { p_path: string; p_role?: string }
        Returns: string
      }
      cleanup_performance_logs: { Args: never; Returns: undefined }
      clear_draft_assignments: { Args: { p_draft_id: string }; Returns: Json }
      complete_hire_to_employee: {
        Args: {
          p_department_id?: string
          p_employment_type: string
          p_job_title_id: string
          p_location_id?: string
          p_pay_type?: string
          p_person_id: string
          p_start_date: string
          p_starting_wage: number
        }
        Returns: string
      }
      convert_to_excused: {
        Args: {
          p_attendance_id: string
          p_excuse_reason: string
          p_excusing_employee_id: string
        }
        Returns: {
          actual_start: string | null
          created_at: string
          employee_id: string
          excuse_reason: string | null
          excused_at: string | null
          excused_by_employee_id: string | null
          id: string
          minutes_late: number | null
          notes: string | null
          penalty_weight: number | null
          scheduled_start: string | null
          shift_date: string
          shift_id: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "attendance"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      copy_previous_week_schedule: {
        Args: { p_draft_id: string }
        Returns: Json
      }
      create_intake_link: {
        Args: {
          p_expires_in_days?: number
          p_internal_notes?: string
          p_link_type: string
          p_prefill_email?: string
          p_prefill_first_name?: string
          p_prefill_last_name?: string
          p_target_department_id?: string
          p_target_event_id?: string
          p_target_location_id?: string
          p_target_position_id?: string
        }
        Returns: {
          expires_at: string
          id: string
          link_type: string
          token: string
        }[]
      }
      create_notification: {
        Args: {
          p_action_url?: string
          p_body: string
          p_category: string
          p_data?: Json
          p_profile_id: string
          p_requires_action?: boolean
          p_title: string
          p_type: string
        }
        Returns: string
      }
      create_schedule_draft:
        | {
            Args: {
              p_location_id: string
              p_operational_days: number[]
              p_service_ids: string[]
              p_week_start: string
            }
            Returns: string
          }
        | {
            Args: {
              p_location_id: string
              p_operational_days: number[]
              p_service_days_matrix?: Json
              p_service_ids: string[]
              p_week_start: string
            }
            Returns: Json
          }
      current_employee_id: { Args: never; Returns: string }
      current_profile_id: { Args: never; Returns: string }
      deduct_event_supplies: { Args: { p_event_id: string }; Returns: boolean }
      deduct_inventory_for_event: {
        Args: {
          p_event_id: string
          p_inventory_item_id: string
          p_location: string
          p_notes?: string
          p_quantity: number
        }
        Returns: string
      }
      delete_schedule_template: {
        Args: { p_template_id: string }
        Returns: boolean
      }
      extract_resume_text:
        | { Args: { p_document_id: string }; Returns: Json }
        | { Args: { p_file_url: string }; Returns: string }
      find_or_create_person: {
        Args: {
          p_email: string
          p_first_name: string
          p_last_name: string
          p_phone?: string
          p_source_detail?: string
          p_source_type?: string
        }
        Returns: {
          existing_stage: Database["public"]["Enums"]["person_lifecycle_stage"]
          is_new: boolean
          person_id: string
        }[]
      }
      generate_ce_event_checklist: {
        Args: { p_event_id: string }
        Returns: undefined
      }
      generate_compliance_alerts: { Args: never; Returns: number }
      generate_shifts_from_template: {
        Args: { p_location_id: string; p_week_start: string }
        Returns: number
      }
      get_ai_usage_stats: { Args: { p_days?: number }; Returns: Json }
      get_attendance_breakdown: {
        Args: { p_employee_id: string; p_lookback_days?: number }
        Returns: {
          count: number
          penalty_sum: number
          status: string
        }[]
      }
      get_attendance_by_status: {
        Args: {
          p_employee_id: string
          p_lookback_days?: number
          p_status: string
        }
        Returns: {
          actual_start: string
          excuse_reason: string
          excused_at: string
          excused_by_name: string
          id: string
          minutes_late: number
          notes: string
          scheduled_start: string
          shift_date: string
        }[]
      }
      get_available_employees_for_slot: {
        Args: {
          p_draft_id: string
          p_end_time: string
          p_role_category?: string
          p_slot_date: string
          p_start_time: string
        }
        Returns: {
          availability_note: string
          availability_type: string
          conflict_reason: string
          current_week_hours: number
          employee_id: string
          first_name: string
          is_available: boolean
          last_name: string
          position_title: string
          preference_level: number
          reliability_score: number
        }[]
      }
      get_employee_scheduling_context: {
        Args: { p_location_id?: string; p_week_start?: string }
        Returns: {
          availability: Json
          employee_id: string
          employment_type: string
          first_name: string
          last_name: string
          position_id: string
          position_title: string
          primary_location_id: string
          scheduled_hours_4_weeks: number
          scheduled_hours_this_week: number
          skill_levels: Json
          skills: string[]
          time_off_dates: string[]
        }[]
      }
      get_employee_timecard: {
        Args: {
          p_employee_id: string
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          clock_in_at: string
          clock_out_at: string
          correction_reason: string
          entry_date: string
          entry_id: string
          has_issue: boolean
          is_corrected: boolean
          issue_type: string
          original_clock_in: string
          original_clock_out: string
          shift_id: string
          total_hours: number
        }[]
      }
      get_employee_week_hours: {
        Args: {
          p_draft_id?: string
          p_employee_id: string
          p_week_start: string
        }
        Returns: number
      }
      get_or_create_schedule_week: {
        Args: { p_location_id: string; p_week_start: string }
        Returns: string
      }
      get_overdue_partners: {
        Args: never
        Returns: {
          days_overdue: number
          partner_id: string
          partner_name: string
          visit_frequency: string
        }[]
      }
      get_payroll_summary: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          adjustments_total: number
          department_name: string
          double_time_hours: number
          employee_id: string
          employee_name: string
          gross_pay_estimate: number
          has_issues: boolean
          issue_details: string
          overtime_hours: number
          pay_rate: number
          pay_type: string
          pto_hours: number
          regular_hours: number
          status: string
        }[]
      }
      get_role_level: { Args: { role_name: string }; Returns: number }
      get_schedule_dashboard: {
        Args: { p_week_start: string }
        Returns: {
          coverage_percentage: number
          draft_id: string
          draft_status: string
          filled_slots: number
          has_draft: boolean
          last_updated: string
          location_code: string
          location_id: string
          location_name: string
          published_at: string
          required_filled: number
          required_slots: number
          total_slots: number
        }[]
      }
      get_schedule_templates: {
        Args: never
        Returns: {
          created_at: string
          created_by: string
          created_by_name: string
          description: string
          id: string
          is_active: boolean
          location_id: string
          location_name: string
          name: string
          shift_count: number
        }[]
      }
      get_schedule_week_summary: {
        Args: { p_location_id: string; p_week_start: string }
        Returns: {
          coverage_percentage: number
          filled_shifts: number
          open_shifts: number
          published_at: string
          schedule_week_id: string
          services: Json
          status: string
          total_hours: number
          total_shifts: number
        }[]
      }
      get_services_with_requirements: {
        Args: { p_location_id?: string }
        Returns: {
          max_staff: number
          min_staff: number
          requires_dvm: boolean
          service_code: string
          service_color: string
          service_icon: string
          service_id: string
          service_name: string
          staffing_requirements: Json
        }[]
      }
      get_skill_training_courses: {
        Args: { p_skill_id: string }
        Returns: {
          category: string
          course_id: string
          description: string
          estimated_duration: number
          is_required: boolean
          skill_level_awarded: number
          title: string
        }[]
      }
      get_table_statistics: {
        Args: never
        Returns: {
          row_count: number
          table_name: string
          total_size: string
        }[]
      }
      get_user_initials: { Args: { p_profile_id: string }; Returns: string }
      get_user_role: { Args: never; Returns: string }
      grant_person_access: {
        Args: {
          p_person_id: string
          p_role?: string
          p_send_welcome_email?: boolean
        }
        Returns: string
      }
      has_admin_ops_access: { Args: never; Returns: boolean }
      has_gdu_access: { Args: never; Returns: boolean }
      has_management_access: { Args: never; Returns: boolean }
      has_marketing_access: { Args: never; Returns: boolean }
      has_minimum_role: { Args: { required_role: string }; Returns: boolean }
      invite_student: {
        Args: {
          p_assigned_location_id?: string
          p_assigned_mentor_id?: string
          p_created_by?: string
          p_email: string
          p_end_date?: string
          p_expires_in_days?: number
          p_first_name: string
          p_last_name: string
          p_phone?: string
          p_program_name?: string
          p_program_type: Database["public"]["Enums"]["education_program_type"]
          p_school_of_origin?: string
          p_send_email?: boolean
          p_start_date?: string
        }
        Returns: {
          existing_stage: Database["public"]["Enums"]["person_lifecycle_stage"]
          invite_token: string
          invite_url: string
          is_new_person: boolean
          person_id: string
          program_enrollment_id: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_gdu_admin: { Args: never; Returns: boolean }
      is_hr_admin: { Args: never; Returns: boolean }
      is_marketing_admin: { Args: never; Returns: boolean }
      is_recruiting_admin: { Args: never; Returns: boolean }
      is_schedule_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      list_schedule_templates: {
        Args: { p_location_id?: string }
        Returns: {
          created_at: string
          description: string
          id: string
          is_default: boolean
          last_used_at: string
          location_id: string
          location_name: string
          name: string
          operational_days: number[]
          service_count: number
          slot_count: number
          usage_count: number
        }[]
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_action_category?: string
          p_changes?: Json
          p_entity_id: string
          p_entity_name: string
          p_entity_type: string
          p_new_values?: Json
          p_old_values?: Json
        }
        Returns: string
      }
      migrate_education_visitor_to_candidate: {
        Args: { p_visitor_id: string }
        Returns: string
      }
      migrate_education_visitors_to_program_data: {
        Args: never
        Returns: {
          migrated_count: number
          skipped_count: number
        }[]
      }
      migrate_to_extension_tables: {
        Args: never
        Returns: {
          extension_table: string
          records_created: number
          records_updated: number
        }[]
      }
      process_intake_submission: {
        Args: { p_submission_id: string }
        Returns: string
      }
      promote_candidate_to_employee:
        | {
            Args: {
              p_candidate_id: string
              p_department_id?: string
              p_employment_type: string
              p_job_title_id: string
              p_location_id?: string
              p_pay_type?: string
              p_start_date: string
              p_starting_wage: number
            }
            Returns: string
          }
        | {
            Args: {
              p_candidate_id: string
              p_department_id?: string
              p_position_id?: string
              p_start_date?: string
            }
            Returns: string
          }
      promote_to_applicant: {
        Args: {
          p_notes?: string
          p_person_id: string
          p_resume_url?: string
          p_target_department_id?: string
          p_target_location_id?: string
          p_target_position_id?: string
        }
        Returns: string
      }
      promote_to_hired: {
        Args: { p_person_id: string; p_target_start_date?: string }
        Returns: string
      }
      promote_to_student: {
        Args: {
          p_externship_goals?: Json
          p_person_id: string
          p_program_name: string
          p_school_of_origin?: string
          p_visit_end_date?: string
          p_visit_start_date?: string
        }
        Returns: string
      }
      publish_schedule_draft: { Args: { p_draft_id: string }; Returns: boolean }
      publish_schedule_week: {
        Args: { p_schedule_week_id: string }
        Returns: boolean
      }
      recalculate_partner_metrics: { Args: never; Returns: undefined }
      revoke_person_access: {
        Args: { p_person_id: string; p_reason?: string }
        Returns: boolean
      }
      save_template_from_draft: {
        Args: {
          p_description?: string
          p_draft_id: string
          p_location_specific?: boolean
          p_name: string
        }
        Returns: string
      }
      save_week_as_template: {
        Args: {
          p_location_id?: string
          p_template_description: string
          p_template_name: string
          p_week_start: string
        }
        Returns: string
      }
      signoff_course_completion: {
        Args: {
          p_enrollment_id: string
          p_notes?: string
          p_signoff_by: string
        }
        Returns: Json
      }
      smart_assign_training_course: {
        Args: {
          p_assigned_by?: string
          p_course_id: string
          p_due_days?: number
          p_requires_signoff?: boolean
          p_skill_threshold?: number
        }
        Returns: number
      }
      start_candidate_onboarding:
        | { Args: { p_candidate_id: string }; Returns: boolean }
        | {
            Args: {
              p_assigned_to?: string
              p_candidate_id: string
              p_target_start_date?: string
              p_template_id?: string
            }
            Returns: string
          }
      sync_attendance_from_shift: {
        Args: { p_shift_id: string }
        Returns: {
          actual_start: string | null
          created_at: string
          employee_id: string
          excuse_reason: string | null
          excused_at: string | null
          excused_by_employee_id: string | null
          id: string
          minutes_late: number | null
          notes: string | null
          penalty_weight: number | null
          scheduled_start: string | null
          shift_date: string
          shift_id: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "attendance"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      test_auth_lookup: {
        Args: { test_email: string }
        Returns: {
          profile_exists: boolean
          profile_id: string
          profile_role: string
        }[]
      }
      test_into_func: { Args: never; Returns: string }
      test_simple: { Args: never; Returns: string }
      transfer_contact_notes: {
        Args: {
          p_mark_hr_only?: boolean
          p_source_id: string
          p_source_type: string
          p_target_id: string
          p_target_type: string
        }
        Returns: number
      }
      update_employee_with_profile_sync: {
        Args: {
          p_employee_data: Json
          p_employee_id: string
          p_sync_to_profile?: boolean
        }
        Returns: Json
      }
      update_slot_times: {
        Args: { p_end_time: string; p_slot_id: string; p_start_time: string }
        Returns: boolean
      }
      upsert_person_extended_data: {
        Args: {
          p_created_by?: string
          p_data: Json
          p_data_type: string
          p_person_id: string
        }
        Returns: string
      }
      validate_schedule_draft: { Args: { p_draft_id: string }; Returns: Json }
      validate_shift_assignment: {
        Args: {
          p_employee_id: string
          p_end_time: string
          p_exclude_shift_id?: string
          p_location_id?: string
          p_shift_date: string
          p_start_time: string
        }
        Returns: {
          is_valid: boolean
          violations: Json
        }[]
      }
    }
    Enums: {
      ce_event_format: "live" | "webinar" | "hybrid" | "recorded"
      ce_event_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "in_progress"
        | "completed"
        | "cancelled"
      ce_task_category:
        | "pre_event_admin"
        | "av_tech_setup"
        | "attendee_materials"
        | "lab_setup"
        | "food_refreshments"
        | "event_day_operations"
        | "post_event_closeout"
        | "marketing_followup"
      ce_task_status:
        | "not_started"
        | "in_progress"
        | "completed"
        | "blocked"
        | "skipped"
      education_program_type:
        | "internship"
        | "externship"
        | "paid_cohort"
        | "intensive"
        | "shadow"
        | "ce_course"
      education_visitor_type:
        | "intern"
        | "extern"
        | "student"
        | "ce_attendee"
        | "shadow"
        | "other"
      influencer_status: "active" | "prospect" | "inactive" | "completed"
      inventory_category:
        | "brochures"
        | "flyers"
        | "business_cards"
        | "promotional_items"
        | "apparel"
        | "signage"
        | "supplies"
        | "other"
        | "print"
        | "prize"
        | "product"
        | "supply"
        | "emp_apparel"
      marketing_partner_status:
        | "active"
        | "pending"
        | "expired"
        | "inactive"
        | "prospect"
        | "completed"
      marketing_partner_type:
        | "chamber"
        | "association"
        | "food_vendor"
        | "pet_business"
        | "rescue"
        | "entertainment"
        | "local_business"
        | "print_vendor"
        | "exotic_shop"
        | "spay_neuter"
        | "media_outlet"
        | "other"
        | "influencer"
      person_lifecycle_stage:
        | "visitor"
        | "lead"
        | "student"
        | "applicant"
        | "hired"
        | "employee"
        | "alumni"
        | "archived"
      program_enrollment_status:
        | "inquiry"
        | "applied"
        | "reviewing"
        | "interview"
        | "accepted"
        | "enrolled"
        | "in_progress"
        | "completed"
        | "withdrawn"
        | "dismissed"
        | "deferred"
        | "waitlisted"
      race_approval_status:
        | "not_submitted"
        | "pending"
        | "approved"
        | "denied"
        | "not_required"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ce_event_format: ["live", "webinar", "hybrid", "recorded"],
      ce_event_status: [
        "draft",
        "pending_approval",
        "approved",
        "in_progress",
        "completed",
        "cancelled",
      ],
      ce_task_category: [
        "pre_event_admin",
        "av_tech_setup",
        "attendee_materials",
        "lab_setup",
        "food_refreshments",
        "event_day_operations",
        "post_event_closeout",
        "marketing_followup",
      ],
      ce_task_status: [
        "not_started",
        "in_progress",
        "completed",
        "blocked",
        "skipped",
      ],
      education_program_type: [
        "internship",
        "externship",
        "paid_cohort",
        "intensive",
        "shadow",
        "ce_course",
      ],
      education_visitor_type: [
        "intern",
        "extern",
        "student",
        "ce_attendee",
        "shadow",
        "other",
      ],
      influencer_status: ["active", "prospect", "inactive", "completed"],
      inventory_category: [
        "brochures",
        "flyers",
        "business_cards",
        "promotional_items",
        "apparel",
        "signage",
        "supplies",
        "other",
        "print",
        "prize",
        "product",
        "supply",
        "emp_apparel",
      ],
      marketing_partner_status: [
        "active",
        "pending",
        "expired",
        "inactive",
        "prospect",
        "completed",
      ],
      marketing_partner_type: [
        "chamber",
        "association",
        "food_vendor",
        "pet_business",
        "rescue",
        "entertainment",
        "local_business",
        "print_vendor",
        "exotic_shop",
        "spay_neuter",
        "media_outlet",
        "other",
        "influencer",
      ],
      person_lifecycle_stage: [
        "visitor",
        "lead",
        "student",
        "applicant",
        "hired",
        "employee",
        "alumni",
        "archived",
      ],
      program_enrollment_status: [
        "inquiry",
        "applied",
        "reviewing",
        "interview",
        "accepted",
        "enrolled",
        "in_progress",
        "completed",
        "withdrawn",
        "dismissed",
        "deferred",
        "waitlisted",
      ],
      race_approval_status: [
        "not_submitted",
        "pending",
        "approved",
        "denied",
        "not_required",
      ],
    },
  },
} as const
