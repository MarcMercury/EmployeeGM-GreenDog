/**
 * Centralized constants for Marketing pages.
 *
 * All option arrays live here so every page shares a single source of truth.
 * Nuxt auto-imports these from `app/utils/`, so no explicit import is required.
 *
 * Convention:
 *   - "filter" arrays include an `{ title: 'All …', value: null }` first entry.
 *   - "edit" arrays omit the "All" entry (suitable for form selects).
 *   - Plain string arrays (e.g. REFERRAL_TIERS) are used where Vuetify accepts
 *     simple item lists.
 */

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

type SelectOption<T = string> = { title: string; value: T | null }

/**
 * Prepend an "All …" entry to an edit-option list for use as a filter select.
 */
export function withAllOption<T extends string>(
  items: readonly { title: string; value: T | null }[],
  allLabel = 'All',
): SelectOption<T>[] {
  return [{ title: allLabel, value: null }, ...items]
}

// ---------------------------------------------------------------------------
// Geographic Zones (shared between Partners & Partnerships)
// ---------------------------------------------------------------------------

export const ZONE_DEFINITIONS = [
  { value: 'Westside & Coastal', title: 'Westside & Coastal 🌊', description: 'Santa Monica, Venice, Marina del Rey, Culver City, Beverly Hills, Westwood, Malibu, Pacific Palisades, Brentwood' },
  { value: 'South Valley', title: 'South Valley 🎬', description: 'Studio City, Sherman Oaks, Encino, Tarzana, Woodland Hills, Burbank, Toluca Lake, Universal City' },
  { value: 'North Valley', title: 'North Valley 🏘️', description: 'Northridge, Chatsworth, Granada Hills, Porter Ranch, Van Nuys, Reseda, Canoga Park, North Hollywood, Sun Valley, Sylmar' },
  { value: 'Central & Eastside', title: 'Central & Eastside 🏙️', description: 'DTLA, Silver Lake, Echo Park, Hollywood, West Hollywood, Los Feliz, Eagle Rock, Boyle Heights' },
  { value: 'South Bay', title: 'South Bay & Airport ✈️', description: 'El Segundo, Manhattan Beach, Torrance, Redondo Beach, Hawthorne, Inglewood, Gardena' },
  { value: 'San Gabriel Valley', title: 'San Gabriel Valley 🥡', description: 'Pasadena, Glendale, Arcadia, Alhambra, Monterey Park, San Marino' },
] as const

export const AREA_EDIT_OPTIONS = [
  { title: 'Westside & Coastal', value: 'Westside & Coastal' },
  { title: 'South Valley', value: 'South Valley' },
  { title: 'North Valley', value: 'North Valley' },
  { title: 'Central & Eastside', value: 'Central & Eastside' },
  { title: 'South Bay', value: 'South Bay' },
  { title: 'San Gabriel Valley', value: 'San Gabriel Valley' },
  { title: 'Online/Remote/Out of Area', value: 'Online/Remote/Out of Area' },
] as const

export const AREA_FILTER_OPTIONS = withAllOption(AREA_EDIT_OPTIONS, 'All Areas')

// ---------------------------------------------------------------------------
// Marketing Partner constants (partners.vue, partner/[id].vue)
// ---------------------------------------------------------------------------

export const PARTNER_TYPE_EDIT_OPTIONS = [
  { title: 'Other Pet Business', value: 'pet_business' },
  { title: 'Exotic Shop', value: 'exotic_shop' },
  { title: 'Rescue', value: 'rescue' },
  { title: 'Entertainment', value: 'entertainment' },
  { title: 'Print Vendor', value: 'print_vendor' },
  { title: 'Chamber/Association', value: 'chamber' },
  { title: 'Food & Beverage', value: 'food_vendor' },
  { title: 'Media', value: 'media' },
  { title: 'Groomer', value: 'groomer' },
  { title: 'Daycare/Boarding', value: 'daycare_boarding' },
  { title: 'Pet Retail', value: 'pet_retail' },
  { title: 'Charity', value: 'charity' },
  { title: 'Merch Vendor', value: 'merch_vendor' },
  { title: 'Designers/Graphics', value: 'designers_graphics' },
  { title: 'Other', value: 'other' },
] as const

export const PARTNER_TYPE_FILTER_OPTIONS = withAllOption(PARTNER_TYPE_EDIT_OPTIONS, 'All Types')

export const PARTNER_STATUS_EDIT_OPTIONS = [
  { title: 'Active', value: 'active' },
  { title: 'Pending', value: 'pending' },
  { title: 'Expired', value: 'expired' },
  { title: 'Inactive', value: 'inactive' },
  { title: 'Prospect', value: 'prospect' },
  { title: 'Completed', value: 'completed' },
] as const

export const PARTNER_STATUS_FILTER_OPTIONS = withAllOption(PARTNER_STATUS_EDIT_OPTIONS, 'All Statuses')

export const PARTNER_SERVICE_FILTER_OPTIONS = [
  { title: 'All Services', value: null },
  { title: 'Groomer', value: 'Groomer' },
  { title: 'Daycare', value: 'Daycare' },
  { title: 'Retail', value: 'Retail' },
  { title: 'Hotel', value: 'Hotel' },
  { title: 'Rescue/Shelter', value: 'Rescue' },
  { title: 'Trainer', value: 'Trainer' },
  { title: 'Other', value: 'Other' },
] as const

// ---------------------------------------------------------------------------
// Influencer constants (influencers.vue)
// ---------------------------------------------------------------------------

export const INFLUENCER_TIER_EDIT_OPTIONS = [
  { title: 'Nano (<10K)', value: 'nano' },
  { title: 'Micro (10K-50K)', value: 'micro' },
  { title: 'Macro (50K-500K)', value: 'macro' },
  { title: 'Mega (500K+)', value: 'mega' },
] as const

export const INFLUENCER_TIER_FILTER_OPTIONS = withAllOption(INFLUENCER_TIER_EDIT_OPTIONS, 'All Tiers')

export const INFLUENCER_STATUS_EDIT_OPTIONS = [
  { title: 'Active', value: 'active' },
  { title: 'Prospect', value: 'prospect' },
  { title: 'Inactive', value: 'inactive' },
  { title: 'Completed', value: 'completed' },
] as const

export const INFLUENCER_STATUS_FILTER_OPTIONS = withAllOption(INFLUENCER_STATUS_EDIT_OPTIONS, 'All Statuses')

export const PLATFORM_EDIT_OPTIONS = [
  { title: 'Instagram', value: 'IG' },
  { title: 'TikTok', value: 'TikTok' },
  { title: 'YouTube', value: 'YouTube' },
  { title: 'Facebook', value: 'Facebook' },
] as const

export const PLATFORM_FILTER_OPTIONS = withAllOption(PLATFORM_EDIT_OPTIONS, 'All Platforms')

export const INFLUENCER_PRIORITY_EDIT_OPTIONS = [
  { title: 'High', value: 'high' },
  { title: 'Medium', value: 'medium' },
  { title: 'Low', value: 'low' },
] as const

export const INFLUENCER_PRIORITY_FILTER_OPTIONS = withAllOption(INFLUENCER_PRIORITY_EDIT_OPTIONS, 'All Priorities')

export const RELATIONSHIP_STATUS_OPTIONS = [
  { title: 'New', value: 'new' },
  { title: 'Outreach', value: 'outreach' },
  { title: 'Negotiating', value: 'negotiating' },
  { title: 'Active Partner', value: 'active_partner' },
  { title: 'Dormant', value: 'dormant' },
  { title: 'Past Partner', value: 'past_partner' },
] as const

export const COLLABORATION_TYPE_OPTIONS = [
  { title: 'Gifted', value: 'gifted' },
  { title: 'Paid', value: 'paid' },
  { title: 'Affiliate', value: 'affiliate' },
  { title: 'Ambassador', value: 'ambassador' },
  { title: 'UGC Creator', value: 'ugc' },
  { title: 'Event', value: 'event' },
] as const

export const COMPENSATION_TYPE_OPTIONS = [
  { title: 'Free Services', value: 'services' },
  { title: 'Flat Fee', value: 'flat_fee' },
  { title: 'Per Post', value: 'per_post' },
  { title: 'Commission', value: 'commission' },
  { title: 'Product/Gifts', value: 'product' },
  { title: 'Hybrid', value: 'hybrid' },
] as const

export const NICHE_OPTIONS = [
  { title: 'Dog Mom/Dad', value: 'dog_parent' },
  { title: 'Cat Parent', value: 'cat_parent' },
  { title: 'Multi-Pet', value: 'multi_pet' },
  { title: 'Pet Lifestyle', value: 'pet_lifestyle' },
  { title: 'Pet Health/Wellness', value: 'pet_wellness' },
  { title: 'Pet Training', value: 'pet_training' },
  { title: 'Pet Fashion', value: 'pet_fashion' },
  { title: 'Pet Travel', value: 'pet_travel' },
  { title: 'Exotic Pets', value: 'exotic' },
  { title: 'General Lifestyle', value: 'lifestyle' },
  { title: 'Local/Community', value: 'local' },
  { title: 'Other', value: 'other' },
] as const

export const NOTE_TYPE_OPTIONS = [
  { title: 'General', value: 'general' },
  { title: 'Outreach', value: 'outreach' },
  { title: 'Call', value: 'call' },
  { title: 'Email', value: 'email' },
  { title: 'Meeting', value: 'meeting' },
  { title: 'Content Review', value: 'content_review' },
  { title: 'Payment', value: 'payment' },
  { title: 'Issue', value: 'issue' },
] as const

export const PET_TYPE_OPTIONS = [
  { title: 'Dog', value: 'dog' },
  { title: 'Cat', value: 'cat' },
  { title: 'Multiple', value: 'multiple' },
  { title: 'Exotic', value: 'exotic' },
  { title: 'None/Unknown', value: null },
] as const

// ---------------------------------------------------------------------------
// Referral Partnership constants (partnerships.vue)
// ---------------------------------------------------------------------------

export const REFERRAL_TIERS = ['Platinum', 'Gold', 'Silver', 'Bronze', 'Coal'] as const
export const REFERRAL_PRIORITIES = ['Very High', 'High', 'Medium', 'Low'] as const

export const CLINIC_TYPE_OPTIONS = ['general', 'specialty', 'emergency', 'urgent_care', 'mobile', 'shelter', 'corporate', 'independent'] as const
export const CLINIC_SIZE_OPTIONS = ['small', 'medium', 'large', 'enterprise'] as const
export const ORGANIZATION_TYPE_OPTIONS = ['independent', 'corporate', 'franchise', 'nonprofit', 'university', 'government'] as const

export const VET_SERVICE_OPTIONS = [
  'Dentistry', 'GP', 'Urg Care', 'Emergency', '24Hr Care',
  'Internal Med', 'Cardio', 'Exotics', 'CT/Imaging', 'Derm',
  'Optho', 'Accup', 'Other',
] as const

export const VISIT_FREQUENCY_OPTIONS = ['weekly', 'biweekly', 'monthly', 'quarterly', 'annually', 'as_needed'] as const
export const PREFERRED_DAY_OPTIONS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const
export const PREFERRED_TIME_OPTIONS = ['morning', 'midday', 'afternoon'] as const
export const AGREEMENT_TYPE_OPTIONS = ['none', 'informal', 'formal', 'exclusive'] as const
export const VISIT_OUTCOME_OPTIONS = ['successful', 'follow_up_needed', 'no_answer', 'voicemail', 'rescheduled', 'declined'] as const

// ---------------------------------------------------------------------------
// Inventory constants (inventory.vue)
// ---------------------------------------------------------------------------

export const INVENTORY_CATEGORY_EDIT_OPTIONS = [
  { title: 'Apparel', value: 'apparel' },
  { title: 'EMP Apparel', value: 'emp_apparel' },
  { title: 'Print', value: 'print' },
  { title: 'Prize', value: 'prize' },
  { title: 'Product', value: 'product' },
  { title: 'Supply', value: 'supply' },
  { title: 'Other', value: 'other' },
] as const

export const INVENTORY_CATEGORY_FILTER_OPTIONS = withAllOption(INVENTORY_CATEGORY_EDIT_OPTIONS, 'All Categories')
