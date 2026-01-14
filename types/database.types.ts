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
            foreignKeyName: "attendance_excused_by_employee_id_fkey"
            columns: ["excused_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
            foreignKeyName: "candidate_forwards_forwarded_to_employee_id_fkey"
            columns: ["forwarded_to_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
          created_at: string
          default_workweek_start: number | null
          display_name: string | null
          id: string
          industry: string | null
          legal_name: string | null
          locale: string | null
          primary_address: Json | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_workweek_start?: number | null
          display_name?: string | null
          id?: string
          industry?: string | null
          legal_name?: string | null
          locale?: string | null
          primary_address?: Json | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_workweek_start?: number | null
          display_name?: string | null
          id?: string
          industry?: string | null
          legal_name?: string | null
          locale?: string | null
          primary_address?: Json | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
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
            foreignKeyName: "employee_achievements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
            foreignKeyName: "employee_certifications_verified_by_employee_id_fkey"
            columns: ["verified_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
            foreignKeyName: "employee_notes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
            foreignKeyName: "employee_skills_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
          notes_internal: string | null
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
          notes_internal?: string | null
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
          notes_internal?: string | null
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
            foreignKeyName: "feedback_to_employee_id_fkey"
            columns: ["to_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
          icon: string | null
          id: string
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
          icon?: string | null
          id?: string
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
          icon?: string | null
          id?: string
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
          contact_name: string
          created_at: string | null
          created_by: string | null
          email: string | null
          engagement_rate: number | null
          events_attended: string[] | null
          ezyvet_tracking: string | null
          facebook_url: string | null
          follower_count: number | null
          highest_platform: string | null
          id: string
          instagram_handle: string | null
          instagram_url: string | null
          last_post_date: string | null
          location: string | null
          notes: string | null
          pet_name: string | null
          phone: string | null
          posts_completed: number | null
          promo_code: string | null
          reels_completed: number | null
          status: Database["public"]["Enums"]["influencer_status"]
          stories_completed: number | null
          tiktok_handle: string | null
          updated_at: string | null
          youtube_url: string | null
        }
        Insert: {
          agreement_details?: string | null
          contact_name: string
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          engagement_rate?: number | null
          events_attended?: string[] | null
          ezyvet_tracking?: string | null
          facebook_url?: string | null
          follower_count?: number | null
          highest_platform?: string | null
          id?: string
          instagram_handle?: string | null
          instagram_url?: string | null
          last_post_date?: string | null
          location?: string | null
          notes?: string | null
          pet_name?: string | null
          phone?: string | null
          posts_completed?: number | null
          promo_code?: string | null
          reels_completed?: number | null
          status?: Database["public"]["Enums"]["influencer_status"]
          stories_completed?: number | null
          tiktok_handle?: string | null
          updated_at?: string | null
          youtube_url?: string | null
        }
        Update: {
          agreement_details?: string | null
          contact_name?: string
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          engagement_rate?: number | null
          events_attended?: string[] | null
          ezyvet_tracking?: string | null
          facebook_url?: string | null
          follower_count?: number | null
          highest_platform?: string | null
          id?: string
          instagram_handle?: string | null
          instagram_url?: string | null
          last_post_date?: string | null
          location?: string | null
          notes?: string | null
          pet_name?: string | null
          phone?: string | null
          posts_completed?: number | null
          promo_code?: string | null
          reels_completed?: number | null
          status?: Database["public"]["Enums"]["influencer_status"]
          stories_completed?: number | null
          tiktok_handle?: string | null
          updated_at?: string | null
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
            foreignKeyName: "mentorships_mentor_employee_id_fkey"
            columns: ["mentor_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
            foreignKeyName: "payroll_adjustments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
            foreignKeyName: "payroll_signoffs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_signoffs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "performance_reviews_manager_employee_id_fkey"
            columns: ["manager_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
            foreignKeyName: "points_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
          deleted_at: string | null
          description: string | null
          drop_off_materials: boolean | null
          email: string | null
          employee_count: string | null
          events_attended: string[] | null
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
          deleted_at?: string | null
          description?: string | null
          drop_off_materials?: boolean | null
          email?: string | null
          employee_count?: string | null
          events_attended?: string[] | null
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
          deleted_at?: string | null
          description?: string | null
          drop_off_materials?: boolean | null
          email?: string | null
          employee_count?: string | null
          events_attended?: string[] | null
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
          website?: string | null
          zone?: string | null
        }
        Relationships: []
      }
      referral_sync_history: {
        Row: {
          created_at: string
          date_range_end: string | null
          date_range_start: string | null
          filename: string
          id: string
          sync_details: Json | null
          total_revenue_added: number | null
          total_rows_matched: number | null
          total_rows_parsed: number | null
          total_rows_skipped: number | null
          upload_date: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          filename: string
          id?: string
          sync_details?: Json | null
          total_revenue_added?: number | null
          total_rows_matched?: number | null
          total_rows_parsed?: number | null
          total_rows_skipped?: number | null
          upload_date?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          filename?: string
          id?: string
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
          role_required: string | null
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
          role_required?: string | null
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
          role_required?: string | null
          start_time?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_template_shifts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "schedule_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
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
            foreignKeyName: "shift_changes_manager_employee_id_fkey"
            columns: ["manager_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
          start_at: string
          status: string
          updated_at: string
          version: number | null
        }
        Insert: {
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
          start_at: string
          status?: string
          updated_at?: string
          version?: number | null
        }
        Update: {
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
            foreignKeyName: "shifts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
          name: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
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
            foreignKeyName: "social_posts_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "tasks_created_by_employee_id_fkey"
            columns: ["created_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
            foreignKeyName: "time_off_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
            referencedRelation: "employees"
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
          course_id: string
          created_at: string
          due_date: string | null
          employee_id: string
          enrolled_at: string
          id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          due_date?: string | null
          employee_id: string
          enrolled_at?: string
          id?: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          due_date?: string | null
          employee_id?: string
          enrolled_at?: string
          id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
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
        ]
      }
      training_lessons: {
        Row: {
          content: string | null
          course_id: string
          created_at: string
          file_id: string | null
          id: string
          position: number | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          course_id: string
          created_at?: string
          file_id?: string | null
          id?: string
          position?: number | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          course_id?: string
          created_at?: string
          file_id?: string | null
          id?: string
          position?: number | null
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
        ]
      }
    }
    Views: {
      employee_change_log_view: {
        Row: {
          change_note: string | null
          change_source: string | null
          changed_by_avatar: string | null
          changed_by_display_name: string | null
          changed_by_name: string | null
          changed_by_profile_id: string | null
          changed_by_user_id: string | null
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
      unified_persons_view: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          avatar_url: string | null
          candidate_id: string | null
          candidate_status: string | null
          city: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          current_position_title: string | null
          current_stage:
            | Database["public"]["Enums"]["person_lifecycle_stage"]
            | null
          date_of_birth: string | null
          department_name: string | null
          do_not_contact: boolean | null
          education_visitor_id: string | null
          email: string | null
          email_secondary: string | null
          email_verified: boolean | null
          emergency_contact_email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          employee_id: string | null
          employee_number: string | null
          employment_status: string | null
          first_name: string | null
          gender: string | null
          hire_date: string | null
          id: string | null
          is_active: boolean | null
          last_activity_at: string | null
          last_name: string | null
          linkedin_url: string | null
          location_name: string | null
          marketing_lead_id: string | null
          phone_home: string | null
          phone_mobile: string | null
          phone_verified: boolean | null
          phone_work: string | null
          postal_code: string | null
          preferred_name: string | null
          profile_id: string | null
          program_name: string | null
          pronouns: string | null
          referral_source: string | null
          resume_url: string | null
          school_of_origin: string | null
          source_detail: string | null
          source_type: string | null
          stage_entered_at: string | null
          state: string | null
          student_type:
            | Database["public"]["Enums"]["education_visitor_type"]
            | null
          target_position_id: string | null
          target_position_title: string | null
          updated_at: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visit_end_date: string | null
          visit_start_date: string | null
          website_url: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_target_position_id_fkey"
            columns: ["target_position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
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
      calculate_reliability_score: {
        Args: { p_employee_id: string; p_lookback_days?: number }
        Returns: number
      }
      check_duplicate_person_email: {
        Args: { p_email: string }
        Returns: {
          existing_name: string
          existing_person_id: string
          existing_stage: Database["public"]["Enums"]["person_lifecycle_stage"]
          is_duplicate: boolean
        }[]
      }
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
      current_employee_id: { Args: never; Returns: string }
      current_profile_id: { Args: never; Returns: string }
      deduct_event_supplies: { Args: { p_event_id: string }; Returns: boolean }
      extract_resume_text: { Args: { p_document_id: string }; Returns: Json }
      generate_ce_event_checklist: {
        Args: { p_event_id: string }
        Returns: undefined
      }
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
      get_user_initials: { Args: { profile_id: string }; Returns: string }
      get_user_role: { Args: never; Returns: string }
      has_admin_ops_access: { Args: never; Returns: boolean }
      has_gdu_access: { Args: never; Returns: boolean }
      has_management_access: { Args: never; Returns: boolean }
      has_marketing_access: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      migrate_education_visitor_to_candidate: {
        Args: { p_visitor_id: string }
        Returns: string
      }
      process_intake_submission: {
        Args: { p_submission_id: string }
        Returns: string
      }
      promote_candidate_to_employee: {
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
      start_candidate_onboarding: {
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
      upsert_person_extended_data: {
        Args: {
          p_created_by?: string
          p_data: Json
          p_data_type: string
          p_person_id: string
        }
        Returns: string
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
