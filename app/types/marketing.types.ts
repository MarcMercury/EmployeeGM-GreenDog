// =============================================================================
// Marketing / Growth / Events — Shared Type Definitions
// =============================================================================
// Consolidated from duplicate interface definitions across:
//   - app/pages/growth/events.vue
//   - app/pages/growth/leads.vue
//   - app/pages/marketing/calendar.vue
//   - app/pages/marketing/influencers.vue
//   - app/pages/marketing/inventory.vue
//   - app/pages/marketing/partners.vue
//   - app/pages/marketing/partnerships.vue
//   - app/pages/public/lead-capture/[eventId].vue
//   - app/components/growth/EventFormDialog.vue
//   - app/components/growth/EventProfileDialog.vue
//   - app/components/growth/EventSupplies.vue
//   - app/components/marketing/PartnershipDetailDialog.vue
//   - app/components/marketing/PartnershipQuickVisitDialog.vue
// =============================================================================

// -----------------------------------------------------------------------------
// Event Types
// -----------------------------------------------------------------------------

export interface EventAttachment {
  name: string
  url: string
  file_type: string
  uploaded_at: string
  type?: string
}

export interface ExternalLink {
  title: string
  url: string
  description?: string
}

export interface CommunicationLogEntry {
  date: string
  type: string
  contact: string
  summary: string
  notes?: string
}

export interface MarketingEvent {
  id: string
  name: string
  description: string | null
  event_type: string
  event_category?: string | null
  event_date: string
  start_time: string | null
  end_time: string | null
  location: string | null
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  staffing_needs: string | null
  supplies_needed: string | null
  budget: number | null
  expected_attendance: number | null
  staffing_status: string
  status: string
  registration_required: boolean
  registration_link: string | null
  notes: string | null
  post_event_notes: string | null
  actual_attendance: number | null
  leads_collected: number
  attachments: EventAttachment[]
  external_links: ExternalLink[]
  visitors_count: number
  revenue_generated: number
  inventory_used: InventoryUsedItem[]
  hosted_by: string | null
  event_cost: number | null
  expectations: string | null
  physical_setup: string | null
  communication_log: CommunicationLogEntry[]
  vendor_status: string | null
  payment_date: string | null
  payment_status: string
}

export interface EventPartner {
  id: string
  event_id: string
  partner_id: string
  role: string
  booth_info: string | null
  notes: string | null
  is_confirmed: boolean
  created_at: string
  partner?: MarketingPartner
}

export interface Supply {
  id: string
  name: string
  category: string
  unit_cost: number
  quantity_on_hand: number
}

export interface EventSupply {
  id: string
  event_id: string
  supply_id: string
  quantity_allocated: number
  quantity_used: number | null
  unit_cost_at_time: number
  total_cost: number
  supply?: Supply
}

// -----------------------------------------------------------------------------
// Lead Types
// -----------------------------------------------------------------------------

export interface Lead {
  id: string
  event_id: string | null
  source_event_id: string | null
  lead_name: string
  email: string | null
  phone: string | null
  source: string | null
  status: string
  notes: string | null
  created_at: string
  source_event?: { id: string; name: string } | null
  prize_inventory_item_id: string | null
  prize_quantity: number | null
  prize_location: string | null
  prize_item?: { id: string; name: string } | null
}

// -----------------------------------------------------------------------------
// Inventory Types
// -----------------------------------------------------------------------------

export interface InventoryItem {
  id: string
  item_name: string
  category: string
  description: string | null
  quantity_venice: number
  quantity_sherman_oaks: number
  quantity_valley: number
  quantity_mpmv: number
  quantity_offsite: number
  boxes_on_hand: number | null
  units_per_box: number | null
  total_quantity: number
  reorder_point: number
  is_low_stock: boolean
  last_ordered: string | null
  order_quantity: number | null
  supplier: string | null
  unit_cost: number | null
  notes: string | null
  created_at: string
}

export interface InventoryUsedItem {
  item_id: string
  item_name: string
  quantity_used: number
  location?: string
  inventory_item_id?: string
}

export interface PrizeItem {
  id: string
  name: string
  category: string
}

// -----------------------------------------------------------------------------
// Partner / Clinic Types
// -----------------------------------------------------------------------------

/**
 * Marketing Partner (groomers, retail, daycares, etc.)
 * Used by: app/pages/marketing/partners.vue
 */
export interface Partner {
  id: string
  name: string
  partner_type: string
  status: string
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  website: string | null
  address: string | null
  membership_level: string | null
  membership_fee: number | null
  membership_end: string | null
  instagram_handle: string | null
  facebook_url: string | null
  tiktok_handle: string | null
  services_provided: string | null
  notes: string | null
  proximity_to_location: string | null
  created_at: string
  updated_at?: string
  last_contact_date?: string | null
  account_email?: string | null
  account_password?: string | null
  account_number?: string | null
  category?: string | null
  relationship_score?: number | null
  relationship_status?: string | null
  last_visit_date?: string | null
  next_followup_date?: string | null
  needs_followup?: boolean
  visit_frequency?: string | null
  preferred_contact_time?: string | null
  preferred_visit_day?: string | null
  best_contact_person?: string | null
  partnership_value?: string | null
  area?: string | null
  priority?: string | null
  payment_status?: string | null
  payment_amount?: number | null
  payment_date?: string | null
  _isInfluencer?: boolean
}

/**
 * Referral Partner (veterinary clinics, referral hospitals)
 * Used by: app/pages/marketing/partnerships.vue, PartnershipDetailDialog, PartnershipQuickVisitDialog
 * Based on: referral_partners table (migrations 054, 084, 191, 195)
 */
export interface ReferralPartner {
  id: string
  name: string
  hospital_name?: string | null
  status: string
  contact_name?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  notes?: string | null
  description?: string | null
  website?: string | null

  // Classification (054)
  category?: string | null
  icon?: string | null
  color?: string | null
  products?: string[]
  clinic_type?: string | null
  size?: string | null
  organization_type?: string | null
  employee_count?: number | null

  // CRM fields (054)
  tier: string
  priority?: string | null
  zone?: string | null
  visit_frequency?: string | null
  preferred_visit_day?: string | null
  preferred_visit_time?: string | null
  best_contact_person?: string | null
  needs_followup?: boolean
  followup_reason?: string | null
  tags?: string[]

  // Agreements (054)
  referral_agreement_type?: string | null
  ce_event_host?: boolean
  lunch_and_learn_eligible?: boolean
  drop_off_materials?: boolean

  // Goals (054)
  monthly_referral_goal?: number
  quarterly_revenue_goal?: number
  current_month_referrals?: number
  current_quarter_revenue?: number

  // Revenue tracking (054 + 084)
  revenue_ytd?: number
  revenue_last_year?: number
  average_monthly_revenue?: number
  total_referrals_all_time?: number
  total_referrals_ytd?: number
  total_revenue_all_time?: number
  last_sync_date?: string | null
  last_data_source?: string | null

  // Dates (054 + 195)
  last_visit_date?: string | null
  last_contact_date?: string | null
  last_referral_date?: string | null
  next_followup_date?: string | null
  created_at: string
  updated_at?: string

  // Derived metrics (191 - recalculate_partner_metrics)
  visit_tier?: string | null
  expected_visit_frequency_days?: number | null
  days_since_last_visit?: number | null
  visit_overdue?: boolean | null
  relationship_health?: number | null
  relationship_score?: number | null
  relationship_status?: string | null

  // Social (optional additions)
  instagram_handle?: string | null
  facebook_url?: string | null
  linkedin_url?: string | null

  // Payment (optional)
  payment_status?: string | null
  payment_amount?: number | null
  payment_date?: string | null
}

export interface MarketingPartner {
  id: string
  name: string
  partner_type: string
  status: string
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  address: string | null
}

export interface PartnerNote {
  id: string
  partner_id: string
  note_type: string
  content: string
  is_pinned: boolean
  created_by: string | null
  created_by_name: string | null
  author_initials: string | null
  edited_at: string | null
  edited_by: string | null
  edited_by_initials: string | null
  category: string | null
  created_at: string
  updated_at: string
}

export interface PartnerContact {
  id: string
  partner_id: string
  name: string
  title: string | null
  email: string | null
  phone: string | null
  is_primary: boolean
  notes: string | null
  category: string | null
  created_at: string
}

// -----------------------------------------------------------------------------
// Influencer Types
// -----------------------------------------------------------------------------

export interface Influencer {
  id: string
  contact_name: string
  pet_name: string | null
  phone: string | null
  email: string | null
  status: string
  tier: string | null
  promo_code: string | null
  content_niche: string | null

  // Social handles
  instagram_handle: string | null
  instagram_url: string | null
  tiktok_handle: string | null
  youtube_url: string | null
  facebook_url: string | null

  // Platform-specific followers
  instagram_followers: number | null
  tiktok_followers: number | null
  youtube_subscribers: number | null
  facebook_followers: number | null
  follower_count: number | null
  highest_platform: string | null

  // Engagement metrics
  engagement_rate: number | null
  avg_likes: number | null
  avg_comments: number | null
  avg_views: number | null

  // Relationship
  relationship_status: string | null
  relationship_score: number | null
  last_contact_date: string | null
  next_followup_date: string | null
  needs_followup: boolean
  priority: string | null

  // Collaboration
  collaboration_type: string | null
  compensation_type: string | null
  compensation_rate: number | null
  total_paid: number | null
  total_value_generated: number | null

  // Campaign performance
  total_campaigns: number | null
  posts_completed: number
  stories_completed: number
  reels_completed: number
  total_impressions: number | null
  total_conversions: number | null
  roi: number | null

  // Pet info
  pet_breed: string | null
  pet_age: string | null
  pet_type: string | null
  pet_instagram: string | null

  // Content
  content_rights: string | null
  preferred_content_types: string[] | null
  content_guidelines: string | null
  brand_alignment_score: number | null

  // Audience
  audience_age_range: string | null
  audience_gender_split: string | null
  audience_location: string | null

  // Other
  location: string | null
  agreement_details: string | null
  bio: string | null
  notes: string | null
  media_kit_url: string | null
  profile_image_url: string | null
  source: string | null
  tags: string[] | null

  // Dates
  contract_start_date: string | null
  contract_end_date: string | null
  created_at: string
  updated_at: string | null
}

export interface InfluencerNote {
  id: string
  influencer_id: string
  note_type: string
  content: string
  is_pinned: boolean
  created_by: string | null
  created_by_name: string | null
  author_initials: string | null
  created_at: string
}

// -----------------------------------------------------------------------------
// Campaign Types
// -----------------------------------------------------------------------------

export interface Campaign {
  id: string
  influencer_id: string
  campaign_name: string
  campaign_type: string | null
  status: string
  start_date: string | null
  end_date: string | null
  posts_required: number
  stories_required: number
  reels_required: number
  posts_delivered: number
  stories_delivered: number
  reels_delivered: number
  impressions: number
  clicks: number
  conversions: number
  compensation_amount: number | null
  compensation_type: string | null
  payment_status: string
  notes: string | null
  created_at: string
}

// -----------------------------------------------------------------------------
// Calendar Types
// -----------------------------------------------------------------------------

export interface CalendarNote {
  id: string
  note_date: string
  title: string
  content: string | null
  color: string
  created_by: string | null
  created_at: string
}

// CalendarDay is exported from app/types/index.ts (has additional fields)
