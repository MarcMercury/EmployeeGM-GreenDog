/**
 * ezyVet API – TypeScript Type Definitions
 *
 * Covers OAuth, multi-site clinics, paginated responses,
 * and the primary objects used for Employee GM integration.
 */

// ──────────────────────────── Auth ────────────────────────────
export interface EzyVetClinic {
  id: string               // UUID from Supabase
  location_id: string | null
  label: string            // 'Venice', 'Van Nuys'
  site_uid: string
  partner_id: string
  client_id: string
  client_secret: string
  scope: string
  base_url: string
  is_active: boolean
}

export interface EzyVetToken {
  id?: string
  clinic_id: string
  access_token: string
  token_type: string
  expires_at: string       // ISO timestamp
  issued_at?: string
}

export interface EzyVetOAuthResponse {
  access_token: string
  token_type: string
  expires_in: number       // seconds (≈43 200 = 12 h)
  scope: string
}

// ──────────────────────────── Pagination ────────────────────────────
export interface EzyVetMeta {
  timestamp: string
  items_page_total: number
  items_page_size: number
  items_total: number
  page: number
  pages_total: number
}

export interface EzyVetListResponse<T> {
  meta: EzyVetMeta
  items: T[]
}

// ──────────────────────────── Users (v4) ────────────────────────────
export interface EzyVetUser {
  id: number
  active: boolean
  first_name: string
  last_name: string
  email: string
  role?: string
  created_at?: string
  modified_at?: string
  [key: string]: unknown
}

// ──────────────────────────── Appointments (v2) ────────────────────────────
export interface EzyVetAppointment {
  id: number
  start_at: number          // Unix timestamp
  end_at: number
  appointment_type_id: number
  appointment_type_name?: string
  status_id: number
  status_name?: string
  description?: string
  animal_id?: number
  animal_name?: string
  contact_id?: number
  contact_name?: string
  resource_id?: number
  resource_name?: string
  created_by_user_id?: number
  [key: string]: unknown
}

// ──────────────────────────── Consults (v1) ────────────────────────────
export interface EzyVetConsult {
  id: number
  consult_type_id?: number
  consult_type_name?: string
  status?: string
  animal_id?: number
  animal_name?: string
  contact_id?: number
  vet_user_id?: number
  vet_name?: string
  tech_user_id?: number
  tech_name?: string
  date_created?: string
  date_completed?: string
  [key: string]: unknown
}

// ──────────────────────────── Animals (v1) ────────────────────────────
export interface EzyVetAnimal {
  id: number
  name: string
  species_id?: number
  species_name?: string
  breed_id?: number
  breed_name?: string
  contact_id?: number
  active: boolean
  [key: string]: unknown
}

// ──────────────────────────── Invoice Lines (v1) ────────────────────────────
export interface EzyVetInvoiceLine {
  id: number
  invoice_id?: number
  invoice_line_reference?: string
  date_created?: string
  date_modified?: string
  product_id?: number
  product_name?: string
  product_group?: string
  quantity?: number
  unit_price?: number
  discount_percentage?: number
  discount_amount?: number
  line_total?: number
  total_tax?: number
  total_earned?: number
  contact_id?: number
  contact_name?: string
  contact_code?: string
  animal_id?: number
  animal_name?: string
  consult_id?: number
  staff_user_id?: number
  staff_name?: string
  case_owner_user_id?: number
  case_owner_name?: string
  department?: string
  division?: string
  account?: string
  invoice_type?: string
  payment_terms?: string
  [key: string]: unknown
}

// ──────────────────────────── Contacts (v1) ────────────────────────────
export interface EzyVetContact {
  id: number
  contact_code?: string
  first_name?: string
  last_name?: string
  email?: string
  phone_mobile?: string
  phone_home?: string
  address_physical_city?: string
  address_physical_postcode?: string
  address_physical_state?: string
  is_active?: boolean
  division?: string
  hear_about_option?: string
  created_at?: string
  modified_at?: string
  last_invoiced_date?: string
  revenue_ytd?: number
  [key: string]: unknown
}

// ──────────────────────────── Referral Report (v1) ────────────────────────────
export interface EzyVetReferralEntry {
  referring_vet_clinic?: string
  referring_vet?: string
  contact_name?: string
  animal_name?: string
  division?: string
  amount?: number
  date?: string
  [key: string]: unknown
}

// ──────────────────────────── Webhooks ────────────────────────────
export interface EzyVetWebhookPayload {
  event: string             // 'appointment.created', etc.
  items: Array<{
    id: number
    type: string
    [key: string]: unknown
  }>
  meta?: Record<string, unknown>
}

export interface EzyVetWebhookEvent {
  id?: string
  clinic_id: string | null
  event_type: string
  resource_type: string
  resource_id: number
  payload: Record<string, unknown>
  processed: boolean
  processed_at: string | null
  error: string | null
  received_at?: string
}

// ──────────────────────────── Sync Log ────────────────────────────
export type SyncType = 'users' | 'appointments' | 'consults' | 'animals' | 'invoices' | 'contacts' | 'full'
export type SyncStatus = 'running' | 'completed' | 'failed'

export interface EzyVetSyncLogEntry {
  id?: string
  clinic_id: string
  sync_type: SyncType
  status: SyncStatus
  started_at?: string
  completed_at?: string
  records_fetched: number
  records_upserted: number
  records_errored: number
  error_details?: Record<string, unknown>
  triggered_by?: string
  metadata?: Record<string, unknown>
}

// ──────────────────────────── Client Options ────────────────────────────
export interface EzyVetClientOptions {
  /** Maximum calls per minute per endpoint (default 60) */
  rateLimitPerEndpoint?: number
  /** Global calls per minute across all endpoints (default 180) */
  rateLimitGlobal?: number
  /** Maximum items per page when paginating (default 200) */
  maxPageSize?: number
  /** Number of retry attempts on 429 (default 5) */
  maxRetries?: number
  /** Use trial API base URL */
  useTrial?: boolean
}
