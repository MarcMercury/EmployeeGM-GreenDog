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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
          },
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
            foreignKeyName: "appointments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
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
      candidate_notes: {
        Row: {
          author_id: string | null
          candidate_id: string
          created_at: string
          id: string
          is_pinned: boolean | null
          note: string
          note_type: string | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          candidate_id: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          note: string
          note_type?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          candidate_id?: string
          created_at?: string
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
            foreignKeyName: "candidates_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "employee_locations_view"
            referencedColumns: ["department_id"]
          },
          {
            foreignKeyName: "candidates_interviewed_by_fkey"
            columns: ["interviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          {
            foreignKeyName: "departments_parent_department_id_fkey"
            columns: ["parent_department_id"]
            isOneToOne: false
            referencedRelation: "employee_locations_view"
            referencedColumns: ["department_id"]
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
          },
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
          created_at: string
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
          created_at?: string
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
          created_at?: string
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
          },
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
          },
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
          },
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
            referencedRelation: "employee_locations_view"
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
          },
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
          created_at: string
          date_of_birth: string | null
          department_id: string | null
          email_personal: string | null
          email_work: string | null
          employee_number: string | null
          employment_status: string | null
          employment_type: string | null
          first_name: string
          hire_date: string | null
          id: string
          last_name: string
          location_id: string | null
          manager_employee_id: string | null
          notes_internal: string | null
          phone_mobile: string | null
          phone_work: string | null
          position_id: string | null
          preferred_name: string | null
          profile_id: string | null
          termination_date: string | null
          termination_reason: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          email_personal?: string | null
          email_work?: string | null
          employee_number?: string | null
          employment_status?: string | null
          employment_type?: string | null
          first_name: string
          hire_date?: string | null
          id?: string
          last_name: string
          location_id?: string | null
          manager_employee_id?: string | null
          notes_internal?: string | null
          phone_mobile?: string | null
          phone_work?: string | null
          position_id?: string | null
          preferred_name?: string | null
          profile_id?: string | null
          termination_date?: string | null
          termination_reason?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          email_personal?: string | null
          email_work?: string | null
          employee_number?: string | null
          employment_status?: string | null
          employment_type?: string | null
          first_name?: string
          hire_date?: string | null
          id?: string
          last_name?: string
          location_id?: string | null
          manager_employee_id?: string | null
          notes_internal?: string | null
          phone_mobile?: string | null
          phone_work?: string | null
          position_id?: string | null
          preferred_name?: string | null
          profile_id?: string | null
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
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "employee_locations_view"
            referencedColumns: ["department_id"]
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
          },
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
          },
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
          },
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
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
          leads_collected: number | null
          location: string | null
          name: string
          notes: string | null
          post_event_notes: string | null
          registration_link: string | null
          registration_required: boolean | null
          staffing_needs: string | null
          staffing_status: string | null
          start_time: string | null
          status: string
          supplies_needed: string | null
          updated_at: string
        }
        Insert: {
          actual_attendance?: number | null
          attachments?: Json | null
          budget?: number | null
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
          leads_collected?: number | null
          location?: string | null
          name: string
          notes?: string | null
          post_event_notes?: string | null
          registration_link?: string | null
          registration_required?: boolean | null
          staffing_needs?: string | null
          staffing_status?: string | null
          start_time?: string | null
          status?: string
          supplies_needed?: string | null
          updated_at?: string
        }
        Update: {
          actual_attendance?: number | null
          attachments?: Json | null
          budget?: number | null
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
          leads_collected?: number | null
          location?: string | null
          name?: string
          notes?: string | null
          post_event_notes?: string | null
          registration_link?: string | null
          registration_required?: boolean | null
          staffing_needs?: string | null
          staffing_status?: string | null
          start_time?: string | null
          status?: string
          supplies_needed?: string | null
          updated_at?: string
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
      med_ops_partners: {
        Row: {
          address: string | null
          category: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_preferred: boolean | null
          logo_url: string | null
          name: string
          notes: string | null
          updated_at: string | null
          website: string | null
          products: string[] | null
          icon: string | null
          color: string | null
          account_number: string | null
          account_rep: string | null
          average_monthly_spend: number | null
          spend_ytd: number | null
          spend_last_year: number | null
          last_contact_date: string | null
        }
        Insert: {
          address?: string | null
          category: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          logo_url?: string | null
          name: string
          notes?: string | null
          updated_at?: string | null
          website?: string | null
          products?: string[] | null
          icon?: string | null
          color?: string | null
          account_number?: string | null
          account_rep?: string | null
          average_monthly_spend?: number | null
          spend_ytd?: number | null
          spend_last_year?: number | null
          last_contact_date?: string | null
        }
        Update: {
          address?: string | null
          category?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          updated_at?: string | null
          website?: string | null
          products?: string[] | null
          icon?: string | null
          color?: string | null
          account_number?: string | null
          account_rep?: string | null
          average_monthly_spend?: number | null
          spend_ytd?: number | null
          spend_last_year?: number | null
          last_contact_date?: string | null
        }
        Relationships: []
      }
      med_ops_partner_contacts: {
        Row: {
          id: string
          partner_id: string
          name: string
          title: string | null
          email: string | null
          phone: string | null
          is_primary: boolean | null
          preferred_contact_method: string | null
          relationship_notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          partner_id: string
          name: string
          title?: string | null
          email?: string | null
          phone?: string | null
          is_primary?: boolean | null
          preferred_contact_method?: string | null
          relationship_notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          partner_id?: string
          name?: string
          title?: string | null
          email?: string | null
          phone?: string | null
          is_primary?: boolean | null
          preferred_contact_method?: string | null
          relationship_notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "med_ops_partner_contacts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "med_ops_partners"
            referencedColumns: ["id"]
          }
        ]
      }
      med_ops_partner_notes: {
        Row: {
          id: string
          partner_id: string
          visit_type: string
          visit_date: string
          contacted_person: string | null
          summary: string
          outcome: string | null
          next_steps: string | null
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          partner_id: string
          visit_type?: string
          visit_date?: string
          contacted_person?: string | null
          summary: string
          outcome?: string | null
          next_steps?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          partner_id?: string
          visit_type?: string
          visit_date?: string
          contacted_person?: string | null
          summary?: string
          outcome?: string | null
          next_steps?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "med_ops_partner_notes_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "med_ops_partners"
            referencedColumns: ["id"]
          }
        ]
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
          },
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
            referencedRelation: "employee_locations_view"
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
            foreignKeyName: "mentorships_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_library"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "onboarding_templates_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_templates_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "employee_locations_view"
            referencedColumns: ["department_id"]
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
          },
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
          },
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
            referencedRelation: "employee_locations_view"
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
          },
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
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
          phone: string | null
          role: string
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
          phone?: string | null
          role?: string
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
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      referral_partners: {
        Row: {
          address: string | null
          average_monthly_revenue: number | null
          category: string | null
          color: string | null
          communication_preference: string | null
          contact_person: string | null
          contract_end_date: string | null
          created_at: string
          description: string | null
          email: string | null
          hospital_name: string
          icon: string | null
          id: string
          is_active: boolean
          key_decision_maker: string | null
          key_decision_maker_email: string | null
          key_decision_maker_phone: string | null
          key_decision_maker_title: string | null
          last_contact_date: string | null
          next_followup_date: string | null
          notes: string | null
          phone: string | null
          preferences: Json | null
          products: string[] | null
          referral_value_monthly: number | null
          relationship_status: string | null
          revenue_last_year: number | null
          revenue_ytd: number | null
          specialty_areas: string[] | null
          status: string | null
          tier: string
          total_referrals: number
          total_referrals_all_time: number | null
          total_revenue_all_time: number | null
          last_sync_date: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          average_monthly_revenue?: number | null
          category?: string | null
          color?: string | null
          communication_preference?: string | null
          contact_person?: string | null
          contract_end_date?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          hospital_name: string
          icon?: string | null
          id?: string
          is_active?: boolean
          key_decision_maker?: string | null
          key_decision_maker_email?: string | null
          key_decision_maker_phone?: string | null
          key_decision_maker_title?: string | null
          last_contact_date?: string | null
          next_followup_date?: string | null
          notes?: string | null
          phone?: string | null
          preferences?: Json | null
          products?: string[] | null
          referral_value_monthly?: number | null
          relationship_status?: string | null
          revenue_last_year?: number | null
          revenue_ytd?: number | null
          specialty_areas?: string[] | null
          status?: string | null
          tier?: string
          total_referrals?: number
          total_referrals_all_time?: number | null
          total_revenue_all_time?: number | null
          last_sync_date?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          average_monthly_revenue?: number | null
          category?: string | null
          color?: string | null
          communication_preference?: string | null
          contact_person?: string | null
          contract_end_date?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          hospital_name?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          key_decision_maker?: string | null
          key_decision_maker_email?: string | null
          key_decision_maker_phone?: string | null
          key_decision_maker_title?: string | null
          last_contact_date?: string | null
          next_followup_date?: string | null
          notes?: string | null
          phone?: string | null
          preferences?: Json | null
          products?: string[] | null
          referral_value_monthly?: number | null
          relationship_status?: string | null
          revenue_last_year?: number | null
          revenue_ytd?: number | null
          specialty_areas?: string[] | null
          status?: string | null
          tier?: string
          total_referrals?: number
          total_referrals_all_time?: number | null
          total_revenue_all_time?: number | null
          last_sync_date?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
          },
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
          },
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
          },
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
            foreignKeyName: "schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
          },
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
            referencedRelation: "employee_locations_view"
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
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
            foreignKeyName: "shift_templates_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "employee_locations_view"
            referencedColumns: ["department_id"]
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
          },
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
            foreignKeyName: "shifts_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "employee_locations_view"
            referencedColumns: ["department_id"]
          },
          {
            foreignKeyName: "shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
          },
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
          },
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
            referencedRelation: "employee_locations_view"
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
            foreignKeyName: "time_entries_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
          },
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
            referencedRelation: "employee_locations_view"
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
            foreignKeyName: "time_off_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
          },
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
          },
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
          },
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
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
          },
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
          assigned_locations: Json[] | null
          department_id: string | null
          department_name: string | null
          employee_id: string | null
          first_name: string | null
          full_name: string | null
          job_title: string | null
          last_name: string | null
          manager_employee_id: string | null
          primary_location_id: string | null
          primary_location_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_location_id_fkey"
            columns: ["primary_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_employee_id_fkey"
            columns: ["manager_employee_id"]
            isOneToOne: false
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employees_manager_employee_id_fkey"
            columns: ["manager_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
            foreignKeyName: "schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_locations_view"
            referencedColumns: ["employee_id"]
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
        ]
      }
    }
    Functions: {
      current_employee_id: { Args: never; Returns: string }
      current_profile_id: { Args: never; Returns: string }
      extract_resume_text: { Args: { p_document_id: string }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
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
      start_candidate_onboarding: {
        Args: {
          p_assigned_to?: string
          p_candidate_id: string
          p_target_start_date?: string
          p_template_id?: string
        }
        Returns: string
      }
      test_auth_lookup: {
        Args: { test_email: string }
        Returns: {
          profile_exists: boolean
          profile_id: string
          profile_role: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

// Custom types for application use
export interface HireCandidatePayload {
  candidate_id: string
  employment_type: 'full_time' | 'part_time' | 'contractor' | 'intern'
  job_title_id?: string
  start_date: string
  starting_wage: number
  pay_type: 'Hourly' | 'Salary'
  department_id?: string
  location_id?: string
}

export interface CandidateInterview {
  id: string
  candidate_id: string
  interview_type: 'phone_screen' | 'initial' | 'technical' | 'panel' | 'working_interview' | 'final' | 'other'
  round_number: number
  scheduled_at: string | null
  duration_minutes: number
  location: string | null
  video_link: string | null
  interviewer_employee_id: string | null
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  technical_score: number | null
  communication_score: number | null
  cultural_fit_score: number | null
  overall_score: number | null
  recommendation: 'strong_yes' | 'yes' | 'neutral' | 'no' | 'strong_no' | null
  notes: string | null
  strengths: string | null
  concerns: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface CandidateShadowVisit {
  id: string
  candidate_id: string
  visit_date: string
  start_time: string | null
  end_time: string | null
  location_id: string | null
  host_employee_id: string | null
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  punctuality_score: number | null
  engagement_score: number | null
  teamwork_score: number | null
  skill_demonstration_score: number | null
  overall_impression: 'excellent' | 'good' | 'acceptable' | 'concerning' | 'not_recommended' | null
  observer_notes: string | null
  candidate_questions: string | null
  areas_of_strength: string | null
  areas_for_development: string | null
  created_at: string
  updated_at: string
}
