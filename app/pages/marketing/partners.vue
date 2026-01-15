<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'marketing-admin']
})

const supabase = useSupabaseClient()
const route = useRoute()
const user = useSupabaseUser()
const { showSuccess, showError } = useToast()

// Type definitions
interface Partner {
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
  // Account credentials
  account_email?: string | null
  account_password?: string | null
  account_number?: string | null
  category?: string | null
  // Relationship fields
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
  priority?: string | null
  payment_status?: string | null
  payment_amount?: number | null
  payment_date?: string | null
  // Combined list flag
  _isInfluencer?: boolean
}

interface PartnerNote {
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

interface PartnerContact {
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

interface Influencer {
  id: string
  contact_name: string
  pet_name: string | null
  phone: string | null
  email: string | null
  status: string
  promo_code: string | null
  instagram_handle: string | null
  instagram_url: string | null
  facebook_url: string | null
  tiktok_handle: string | null
  youtube_url: string | null
  follower_count: number | null
  highest_platform: string | null
  location: string | null
  agreement_details: string | null
  notes: string | null
  posts_completed: number
  stories_completed: number
  reels_completed: number
  created_at: string
}

// Filter state
const searchQuery = ref('')
const selectedType = ref<string | null>(null)
const selectedStatus = ref<string | null>(null)
const selectedService = ref<string | null>(null)
const viewMode = ref<'list' | 'cards'>('list')

// Service options for pet businesses
const serviceOptions = [
  { title: 'All Services', value: null },
  { title: 'Groomer', value: 'Groomer' },
  { title: 'Daycare', value: 'Daycare' },
  { title: 'Retail', value: 'Retail' },
  { title: 'Hotel', value: 'Hotel' },
  { title: 'Rescue/Shelter', value: 'Rescue' },
  { title: 'Trainer', value: 'Trainer' },
  { title: 'Other', value: 'Other' }
]

// Partner type options
const partnerTypes = [
  { title: 'All Types', value: null },
  { title: 'Pet Business', value: 'pet_business' },
  { title: 'Exotic Shop', value: 'exotic_shop' },
  { title: 'Rescue', value: 'rescue' },
  { title: 'Influencer', value: 'influencer' },
  { title: 'Entertainment', value: 'entertainment' },
  { title: 'Print Vendor', value: 'print_vendor' },
  { title: 'Chamber of Commerce', value: 'chamber' },
  { title: 'Food & Beverage', value: 'food_vendor' },
  { title: 'Association', value: 'association' },
  { title: 'Spay & Neuter', value: 'spay_neuter' },
  { title: 'Other', value: 'other' }
]

// Partner type options for profile editing (without "All Types")
const partnerTypeEditOptions = [
  { title: 'Pet Business', value: 'pet_business' },
  { title: 'Exotic Shop', value: 'exotic_shop' },
  { title: 'Rescue', value: 'rescue' },
  { title: 'Influencer', value: 'influencer' },
  { title: 'Entertainment', value: 'entertainment' },
  { title: 'Print Vendor', value: 'print_vendor' },
  { title: 'Chamber of Commerce', value: 'chamber' },
  { title: 'Food & Beverage', value: 'food_vendor' },
  { title: 'Association', value: 'association' },
  { title: 'Spay & Neuter', value: 'spay_neuter' },
  { title: 'Other', value: 'other' }
]

const statusOptions = [
  { title: 'All Statuses', value: null },
  { title: 'Active', value: 'active' },
  { title: 'Pending', value: 'pending' },
  { title: 'Expired', value: 'expired' },
  { title: 'Inactive', value: 'inactive' },
  { title: 'Prospect', value: 'prospect' },
  { title: 'Completed', value: 'completed' }
]

// Status options for profile editing (without "All Statuses")
const statusEditOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Pending', value: 'pending' },
  { title: 'Expired', value: 'expired' },
  { title: 'Inactive', value: 'inactive' },
  { title: 'Prospect', value: 'prospect' },
  { title: 'Completed', value: 'completed' }
]

// Fetch partners
const { data: partners, pending, refresh } = await useAsyncData('partners', async () => {
  const { data, error } = await supabase
    .from('marketing_partners')
    .select('*')
    .order('name')
  
  if (error) throw error
  return data as Partner[]
})

// Fetch influencers
const { data: influencers, pending: influencersPending, refresh: refreshInfluencers } = await useAsyncData('influencers', async () => {
  const { data, error } = await supabase
    .from('marketing_influencers')
    .select('*')
    .order('contact_name')
  
  if (error) throw error
  return data as Influencer[]
})

// Combined list: partners + influencers transformed to partner-like format
const combinedList = computed(() => {
  const partnerList = (partners.value || []).map(p => ({ ...p, _isInfluencer: false }))
  
  // Transform influencers to partner-like format for unified display
  const influencerList = (influencers.value || []).map(inf => ({
    id: inf.id,
    name: inf.contact_name + (inf.pet_name ? ` (${inf.pet_name})` : ''),
    partner_type: 'influencer',
    status: inf.status,
    contact_name: inf.contact_name,
    contact_phone: inf.phone,
    contact_email: inf.email,
    website: inf.instagram_url,
    address: inf.location,
    membership_level: null,
    membership_fee: null,
    membership_end: null,
    instagram_handle: inf.instagram_handle,
    services_provided: inf.promo_code ? `Promo: ${inf.promo_code}` : null,
    notes: inf.notes,
    proximity_to_location: null,
    created_at: inf.created_at,
    _isInfluencer: true,
    // Keep original influencer data for edit dialog
    _influencerData: inf
  })) as (Partner & { _influencerData?: Influencer })[]
  
  return [...partnerList, ...influencerList]
})

// Filtered partners (now uses combined list)
const filteredPartners = computed(() => {
  let result = combinedList.value || []
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.contact_name?.toLowerCase().includes(query) ||
      p.contact_email?.toLowerCase().includes(query) ||
      p.notes?.toLowerCase().includes(query) ||
      p.services_provided?.toLowerCase().includes(query) ||
      p.address?.toLowerCase().includes(query)
    )
  }
  
  if (selectedType.value) {
    result = result.filter(p => p.partner_type === selectedType.value)
  }
  
  if (selectedStatus.value) {
    result = result.filter(p => p.status === selectedStatus.value)
  }
  
  if (selectedService.value) {
    result = result.filter(p => 
      p.services_provided?.toLowerCase().includes(selectedService.value!.toLowerCase())
    )
  }
  
  return result
})

// Stats by type (includes influencers)
const statsByType = computed(() => {
  const stats: Record<string, number> = {}
  for (const p of combinedList.value || []) {
    stats[p.partner_type] = (stats[p.partner_type] || 0) + 1
  }
  return stats
})

// Summary stats for header cards
const summaryStats = computed(() => {
  const all = combinedList.value || []
  return {
    total: all.length,
    active: all.filter(p => p.status === 'active' || p.status === 'current').length,
    prospects: all.filter(p => p.status === 'prospect').length,
    needsFollowup: all.filter(p => p.needs_followup).length,
    inactive: all.filter(p => p.status === 'inactive' || p.status === 'former').length
  }
})

// Dialog state
const dialogOpen = ref(false)
const saving = ref(false)
const editingPartner = ref<Partner | null>(null)
const formData = ref({
  name: '',
  partner_type: 'other',
  status: 'prospect',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  website: '',
  address: '',
  membership_level: '',
  membership_fee: null as number | null,
  membership_end: '',
  instagram_handle: '',
  services_provided: '',
  notes: '',
  account_email: '',
  account_password: '',
  account_number: '',
  category: ''
})

// Influencer dialog state
const influencerDialogOpen = ref(false)
const editingInfluencer = ref<Influencer | null>(null)
const influencerForm = ref({
  contact_name: '',
  pet_name: '',
  phone: '',
  email: '',
  status: 'prospect',
  promo_code: '',
  instagram_handle: '',
  instagram_url: '',
  facebook_url: '',
  tiktok_handle: '',
  youtube_url: '',
  follower_count: null as number | null,
  highest_platform: 'IG',
  location: '',
  agreement_details: '',
  notes: ''
})

const influencerStatusOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Prospect', value: 'prospect' },
  { title: 'Inactive', value: 'inactive' },
  { title: 'Completed', value: 'completed' }
]

// Profile Dialog State (comprehensive view)
const profileDialogOpen = ref(false)
const selectedPartner = ref<Partner | null>(null)
const profileTab = ref('overview')
const partnerNotes = ref<PartnerNote[]>([])
const partnerContacts = ref<PartnerContact[]>([])
const newNoteContent = ref('')
const newNoteType = ref('general')
const loadingProfile = ref(false)

// Password visibility for form
const showPassword = ref(false)

// Note type options
const noteTypeOptions = [
  { title: 'General', value: 'general' },
  { title: 'Visit', value: 'visit' },
  { title: 'Call', value: 'call' },
  { title: 'Email', value: 'email' },
  { title: 'Meeting', value: 'meeting' },
  { title: 'Follow-up', value: 'follow_up' },
  { title: 'Issue', value: 'issue' },
  { title: 'Opportunity', value: 'opportunity' }
]

// Relationship status options
const relationshipStatusOptions = [
  { title: 'Prospect', value: 'prospect' },
  { title: 'Developing', value: 'developing' },
  { title: 'Active', value: 'active' },
  { title: 'Strong', value: 'strong' },
  { title: 'At Risk', value: 'at_risk' },
  { title: 'Dormant', value: 'dormant' }
]

// Visit frequency options
const visitFrequencyOptions = [
  { title: 'Weekly', value: 'weekly' },
  { title: 'Bi-weekly', value: 'bi-weekly' },
  { title: 'Monthly', value: 'monthly' },
  { title: 'Quarterly', value: 'quarterly' },
  { title: 'Semi-annually', value: 'semi-annually' },
  { title: 'Annually', value: 'annually' },
  { title: 'As Needed', value: 'as-needed' }
]

// Priority options
const priorityOptions = [
  { title: 'Critical', value: 'critical' },
  { title: 'High', value: 'high' },
  { title: 'Medium', value: 'medium' },
  { title: 'Low', value: 'low' }
]

// Partnership value options
const partnershipValueOptions = [
  { title: 'Strategic', value: 'strategic' },
  { title: 'High', value: 'high' },
  { title: 'Medium', value: 'medium' },
  { title: 'Low', value: 'low' },
  { title: 'Potential', value: 'potential' }
]

// Contact form state
const showContactDialog = ref(false)
const contactForm = ref({
  name: '',
  title: '',
  email: '',
  phone: '',
  is_primary: false,
  notes: '',
  category: null as string | null
})

// Contact category options (same as partner types for filtering)
const contactCategoryOptions = [
  { title: 'None', value: null },
  { title: 'Pet Business', value: 'pet_business' },
  { title: 'Exotic Shop', value: 'exotic_shop' },
  { title: 'Rescue', value: 'rescue' },
  { title: 'Influencer', value: 'influencer' },
  { title: 'Entertainment', value: 'entertainment' },
  { title: 'Print Vendor', value: 'print_vendor' },
  { title: 'Chamber of Commerce', value: 'chamber' },
  { title: 'Food & Beverage', value: 'food_vendor' },
  { title: 'Association', value: 'association' },
  { title: 'Spay & Neuter', value: 'spay_neuter' },
  { title: 'Other', value: 'other' }
]

// Category options for partner form (alias for consistency)
const categoryOptions = contactCategoryOptions

// Check if we should open add dialog or apply filter from URL
onMounted(() => {
  if (route.query.action === 'add') {
    openAddDialog()
  }
  if (route.query.filter && typeof route.query.filter === 'string') {
    selectedType.value = route.query.filter
  }
})

function openAddDialog() {
  editingPartner.value = null
  formData.value = {
    name: '',
    partner_type: 'other',
    status: 'prospect',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    website: '',
    address: '',
    membership_level: '',
    membership_fee: null,
    membership_end: '',
    instagram_handle: '',
    services_provided: '',
    notes: '',
    account_email: '',
    account_password: '',
    account_number: '',
    category: ''
  }
  dialogOpen.value = true
}

function openEditDialog(partner: Partner) {
  editingPartner.value = partner
  formData.value = {
    name: partner.name,
    partner_type: partner.partner_type,
    status: partner.status,
    contact_name: partner.contact_name || '',
    contact_phone: partner.contact_phone || '',
    contact_email: partner.contact_email || '',
    website: partner.website || '',
    address: partner.address || '',
    membership_level: partner.membership_level || '',
    membership_fee: partner.membership_fee,
    membership_end: partner.membership_end || '',
    instagram_handle: partner.instagram_handle || '',
    services_provided: partner.services_provided || '',
    notes: partner.notes || '',
    account_email: partner.account_email || '',
    account_password: partner.account_password || '',
    account_number: partner.account_number || '',
    category: partner.category || ''
  }
  dialogOpen.value = true
}

async function savePartner() {
  if (!formData.value.name) {
    showError('Partner name is required')
    return
  }
  if (!formData.value.partner_type) {
    showError('Category is required')
    return
  }
  
  saving.value = true
  
  const payload = {
    name: formData.value.name,
    partner_type: formData.value.partner_type,
    status: formData.value.status,
    contact_name: formData.value.contact_name || null,
    contact_phone: formData.value.contact_phone || null,
    contact_email: formData.value.contact_email || null,
    website: formData.value.website || null,
    address: formData.value.address || null,
    membership_level: formData.value.membership_level || null,
    membership_fee: formData.value.membership_fee,
    membership_end: formData.value.membership_end || null,
    instagram_handle: formData.value.instagram_handle || null,
    services_provided: formData.value.services_provided || null,
    notes: formData.value.notes || null,
    account_email: formData.value.account_email || null,
    account_password: formData.value.account_password || null,
    account_number: formData.value.account_number || null,
    category: formData.value.category || null
  }
  
  try {
    if (editingPartner.value) {
      const { error } = await supabase
        .from('marketing_partners')
        .update(payload)
        .eq('id', editingPartner.value.id)
      
      if (error) throw error
      showSuccess('Partner updated successfully')
    } else {
      const { error } = await supabase
        .from('marketing_partners')
        .insert(payload)
      
      if (error) throw error
      showSuccess('Partner added successfully')
    }
    
    dialogOpen.value = false
    await refresh()
  } catch (err: any) {
    console.error('[Partners] Save error:', err)
    showError('Failed to save partner: ' + (err.message || 'Unknown error'))
  } finally {
    saving.value = false
  }
}

async function deletePartner(id: string) {
  if (!confirm('Are you sure you want to delete this partner?')) return
  
  await supabase
    .from('marketing_partners')
    .delete()
    .eq('id', id)
  
  refresh()
}

// Influencer functions
function openAddInfluencerDialog() {
  editingInfluencer.value = null
  influencerForm.value = {
    contact_name: '',
    pet_name: '',
    phone: '',
    email: '',
    status: 'prospect',
    promo_code: '',
    instagram_handle: '',
    instagram_url: '',
    facebook_url: '',
    tiktok_handle: '',
    youtube_url: '',
    follower_count: null,
    highest_platform: 'IG',
    location: '',
    agreement_details: '',
    notes: ''
  }
  influencerDialogOpen.value = true
}

function openEditInfluencerDialog(influencer: Influencer) {
  editingInfluencer.value = influencer
  influencerForm.value = {
    contact_name: influencer.contact_name,
    pet_name: influencer.pet_name || '',
    phone: influencer.phone || '',
    email: influencer.email || '',
    status: influencer.status,
    promo_code: influencer.promo_code || '',
    instagram_handle: influencer.instagram_handle || '',
    instagram_url: influencer.instagram_url || '',
    facebook_url: influencer.facebook_url || '',
    tiktok_handle: influencer.tiktok_handle || '',
    youtube_url: influencer.youtube_url || '',
    follower_count: influencer.follower_count,
    highest_platform: influencer.highest_platform || 'IG',
    location: influencer.location || '',
    agreement_details: influencer.agreement_details || '',
    notes: influencer.notes || ''
  }
  influencerDialogOpen.value = true
}

async function saveInfluencer() {
  const payload = {
    contact_name: influencerForm.value.contact_name,
    pet_name: influencerForm.value.pet_name || null,
    phone: influencerForm.value.phone || null,
    email: influencerForm.value.email || null,
    status: influencerForm.value.status,
    promo_code: influencerForm.value.promo_code || null,
    instagram_handle: influencerForm.value.instagram_handle || null,
    instagram_url: influencerForm.value.instagram_url || null,
    facebook_url: influencerForm.value.facebook_url || null,
    tiktok_handle: influencerForm.value.tiktok_handle || null,
    youtube_url: influencerForm.value.youtube_url || null,
    follower_count: influencerForm.value.follower_count,
    highest_platform: influencerForm.value.highest_platform || null,
    location: influencerForm.value.location || null,
    agreement_details: influencerForm.value.agreement_details || null,
    notes: influencerForm.value.notes || null
  }
  
  if (editingInfluencer.value) {
    await supabase
      .from('marketing_influencers')
      .update(payload)
      .eq('id', editingInfluencer.value.id)
  } else {
    await supabase
      .from('marketing_influencers')
      .insert(payload)
  }
  
  influencerDialogOpen.value = false
  refreshInfluencers()
}

async function deleteInfluencer(id: string) {
  if (!confirm('Are you sure you want to delete this influencer?')) return
  
  await supabase
    .from('marketing_influencers')
    .delete()
    .eq('id', id)
  
  refreshInfluencers()
}

// Handle clicking on list item - route to correct dialog based on type
function handleItemClick(partner: Partner & { _influencerData?: Influencer }) {
  if (partner._isInfluencer && partner._influencerData) {
    openEditInfluencerDialog(partner._influencerData)
  } else {
    // Open profile dialog for partners (not edit)
    openPartnerProfile(partner)
  }
}

// Handle delete - route to correct function based on type
function handleDelete(partner: Partner & { _isInfluencer?: boolean }) {
  if (partner._isInfluencer) {
    deleteInfluencer(partner.id)
  } else {
    deletePartner(partner.id)
  }
}

// Influencer helper functions
function formatFollowers(count: number | null): string {
  if (!count) return ''
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`
  return count.toString()
}

function getInfluencerFollowerCount(partner: Partner & { _influencerData?: Influencer }): number | null {
  return partner._influencerData?.follower_count || null
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    pet_business: 'teal',
    exotic_shop: 'lime',
    rescue: 'pink',
    influencer: 'secondary',
    entertainment: 'purple',
    print_vendor: 'brown',
    chamber: 'primary',
    food_vendor: 'orange',
    association: 'indigo',
    spay_neuter: 'cyan',
    other: 'grey'
  }
  return colors[type] || 'grey'
}

function getCategoryLabel(category: string | null): string {
  if (!category) return ''
  const labels: Record<string, string> = {
    pet_business: 'Pet Business',
    exotic_shop: 'Exotic Shop',
    rescue: 'Rescue',
    influencer: 'Influencer',
    entertainment: 'Entertainment',
    print_vendor: 'Print Vendor',
    chamber: 'Chamber',
    food_vendor: 'Food & Beverage',
    association: 'Association',
    spay_neuter: 'Spay & Neuter',
    other: 'Other'
  }
  return labels[category] || category
}

function getCategoryIcon(category: string | null): string {
  if (!category) return 'mdi-tag'
  const icons: Record<string, string> = {
    pet_business: 'mdi-paw',
    exotic_shop: 'mdi-snake',
    rescue: 'mdi-heart',
    influencer: 'mdi-account-star',
    entertainment: 'mdi-party-popper',
    print_vendor: 'mdi-printer',
    chamber: 'mdi-domain',
    food_vendor: 'mdi-food',
    association: 'mdi-account-group',
    spay_neuter: 'mdi-medical-bag',
    other: 'mdi-tag'
  }
  return icons[category] || 'mdi-tag'
}

function getCategoryColor(category: string | null): string {
  if (!category) return 'grey'
  const colors: Record<string, string> = {
    pet_business: 'teal',
    exotic_shop: 'lime',
    rescue: 'pink',
    influencer: 'secondary',
    entertainment: 'purple',
    print_vendor: 'brown',
    chamber: 'primary',
    food_vendor: 'orange',
    association: 'indigo',
    spay_neuter: 'cyan',
    other: 'grey'
  }
  return colors[category] || 'grey'
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'success',
    pending: 'warning',
    expired: 'error',
    inactive: 'grey',
    prospect: 'info'
  }
  return colors[status] || 'grey'
}

function formatTypeName(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// =====================================================
// PARTNER PROFILE FUNCTIONS
// =====================================================

// Open partner profile with notes and contacts
async function openPartnerProfile(partner: Partner) {
  selectedPartner.value = partner
  profileTab.value = 'overview'
  profileDialogOpen.value = true
  loadingProfile.value = true
  
  try {
    await Promise.all([
      loadPartnerNotes(partner.id),
      loadPartnerContacts(partner.id)
    ])
  } catch (error) {
    console.error('Error loading partner profile:', error)
    showError('Failed to load partner details')
  } finally {
    loadingProfile.value = false
  }
}

// Load notes for a partner
async function loadPartnerNotes(partnerId: string) {
  const { data, error } = await supabase
    .from('marketing_partner_notes')
    .select('*')
    .eq('partner_id', partnerId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error loading notes:', error)
    return
  }
  
  partnerNotes.value = data as PartnerNote[]
}

// Load contacts for a partner
async function loadPartnerContacts(partnerId: string) {
  const { data, error } = await supabase
    .from('marketing_partner_contacts')
    .select('*')
    .eq('partner_id', partnerId)
    .order('is_primary', { ascending: false })
    .order('name')
  
  if (error) {
    console.error('Error loading contacts:', error)
    return
  }
  
  partnerContacts.value = data as PartnerContact[]
}

// Add a new note
async function addNote() {
  if (!selectedPartner.value || !newNoteContent.value.trim()) return
  
  const { error } = await supabase
    .from('marketing_partner_notes')
    .insert({
      partner_id: selectedPartner.value.id,
      note_type: newNoteType.value,
      content: newNoteContent.value.trim(),
      created_by: user.value?.id
    })
  
  if (error) {
    console.error('Error adding note:', error)
    showError('Failed to add note')
    return
  }
  
  showSuccess('Note added')
  newNoteContent.value = ''
  newNoteType.value = 'general'
  await loadPartnerNotes(selectedPartner.value.id)
}

// Toggle note pinned status
async function toggleNotePin(note: PartnerNote) {
  const { error } = await supabase
    .from('marketing_partner_notes')
    .update({ is_pinned: !note.is_pinned })
    .eq('id', note.id)
  
  if (error) {
    showError('Failed to update note')
    return
  }
  
  if (selectedPartner.value) {
    await loadPartnerNotes(selectedPartner.value.id)
  }
}

// Delete a note
async function deleteNote(noteId: string) {
  if (!confirm('Delete this note?')) return
  
  const { error } = await supabase
    .from('marketing_partner_notes')
    .delete()
    .eq('id', noteId)
  
  if (error) {
    showError('Failed to delete note')
    return
  }
  
  showSuccess('Note deleted')
  if (selectedPartner.value) {
    await loadPartnerNotes(selectedPartner.value.id)
  }
}

// Open contact dialog
function openAddContactDialog() {
  contactForm.value = {
    name: '',
    title: '',
    email: '',
    phone: '',
    is_primary: false,
    notes: '',
    category: null
  }
  editingContactId.value = null
  showContactDialog.value = true
}

// Edit contact category
const editingContactId = ref<string | null>(null)

function openEditContactDialog(contact: PartnerContact) {
  contactForm.value = {
    name: contact.name,
    title: contact.title || '',
    email: contact.email || '',
    phone: contact.phone || '',
    is_primary: contact.is_primary,
    notes: contact.notes || '',
    category: contact.category
  }
  editingContactId.value = contact.id
  showContactDialog.value = true
}

// Save new or update existing contact
async function saveContact() {
  console.log('[Partners] saveContact called', { 
    selectedPartner: selectedPartner.value?.id, 
    contactName: contactForm.value.name,
    editingContactId: editingContactId.value 
  })
  
  if (!selectedPartner.value || !contactForm.value.name.trim()) {
    console.log('[Partners] saveContact early return - missing selectedPartner or name')
    return
  }
  
  const contactData = {
    name: contactForm.value.name.trim(),
    title: contactForm.value.title || null,
    email: contactForm.value.email || null,
    phone: contactForm.value.phone || null,
    is_primary: contactForm.value.is_primary,
    notes: contactForm.value.notes || null,
    category: contactForm.value.category || null
  }
  
  console.log('[Partners] Saving contact data:', contactData)
  
  let error
  let count = 0
  
  if (editingContactId.value) {
    // Update existing contact
    const result = await supabase
      .from('marketing_partner_contacts')
      .update(contactData)
      .eq('id', editingContactId.value)
      .select()
    error = result.error
    count = result.data?.length || 0
    console.log('[Partners] Update result:', { error, count, data: result.data })
  } else {
    // Insert new contact
    const result = await supabase
      .from('marketing_partner_contacts')
      .insert({
        ...contactData,
        partner_id: selectedPartner.value.id,
        created_by: user.value?.id
      })
      .select()
    error = result.error
    count = result.data?.length || 0
    console.log('[Partners] Insert result:', { error, count, data: result.data })
  }
  
  if (error) {
    console.error('[Partners] Save contact error:', error)
    showError(editingContactId.value ? 'Failed to update contact' : 'Failed to add contact')
    return
  }
  
  if (editingContactId.value && count === 0) {
    console.error('[Partners] No rows updated - possible RLS issue')
    showError('Failed to update contact - permission denied')
    return
  }
  
  showSuccess(editingContactId.value ? 'Contact updated' : 'Contact added')
  showContactDialog.value = false
  editingContactId.value = null
  await loadPartnerContacts(selectedPartner.value.id)
}

// Delete contact
async function deleteContact(contactId: string) {
  if (!confirm('Delete this contact?')) return
  
  const { error } = await supabase
    .from('marketing_partner_contacts')
    .delete()
    .eq('id', contactId)
  
  if (error) {
    showError('Failed to delete contact')
    return
  }
  
  showSuccess('Contact deleted')
  if (selectedPartner.value) {
    await loadPartnerContacts(selectedPartner.value.id)
  }
}

// Update relationship fields
async function updatePartnerRelationship(field: string, value: any) {
  if (!selectedPartner.value) {
    console.error('[Partners] No selectedPartner for update')
    return
  }
  
  console.log('[Partners] Updating field:', field, 'to value:', value, 'for partner:', selectedPartner.value.id)
  
  const { data, error } = await supabase
    .from('marketing_partners')
    .update({ [field]: value })
    .eq('id', selectedPartner.value.id)
    .select()
  
  console.log('[Partners] Update result - data:', data, 'error:', error)
  
  if (error) {
    console.error('[Partners] Update failed:', error)
    showError('Failed to update: ' + error.message)
    return
  }
  
  // Update local state
  if (selectedPartner.value) {
    (selectedPartner.value as any)[field] = value
  }
  
  // Also update the partner in the main list
  if (partners.value) {
    const partnerIndex = partners.value.findIndex(p => p.id === selectedPartner.value?.id)
    if (partnerIndex !== -1) {
      (partners.value[partnerIndex] as any)[field] = value
    }
  }
  
  showSuccess('Updated')
  await refresh()
}

// Get note type icon
function getNoteTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    general: 'mdi-note-text',
    visit: 'mdi-walk',
    call: 'mdi-phone',
    email: 'mdi-email',
    meeting: 'mdi-account-group',
    follow_up: 'mdi-clock-outline',
    issue: 'mdi-alert-circle',
    opportunity: 'mdi-lightbulb'
  }
  return icons[type] || 'mdi-note'
}

// Get note type color
function getNoteTypeColor(type: string): string {
  const colors: Record<string, string> = {
    general: 'grey',
    visit: 'success',
    call: 'info',
    email: 'primary',
    meeting: 'purple',
    follow_up: 'warning',
    issue: 'error',
    opportunity: 'amber'
  }
  return colors[type] || 'grey'
}

// Format date relative
function formatRelativeDate(date: string): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return d.toLocaleDateString()
}

// Get relationship score color
function getRelationshipScoreColor(score: number | null | undefined): string {
  if (!score) return 'grey'
  if (score >= 80) return 'success'
  if (score >= 60) return 'info'
  if (score >= 40) return 'warning'
  return 'error'
}

// Get priority color
function getPriorityColor(priority: string | null | undefined): string {
  const colors: Record<string, string> = {
    critical: 'error',
    high: 'warning',
    medium: 'info',
    low: 'grey'
  }
  return colors[priority || ''] || 'grey'
}
</script>

<template>
  <v-container fluid class="pa-6">
    <!-- Header -->
    <div class="d-flex align-center mb-4">
      <v-btn icon variant="text" to="/marketing/command-center" class="mr-2">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <div>
        <h1 class="text-h4 font-weight-bold">Partnership CRM Hub</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Manage chambers, vendors, rescues, influencers, and business partners
        </p>
      </div>
      <v-spacer />
      <v-btn
        color="secondary"
        prepend-icon="mdi-star-circle"
        class="mr-2"
        @click="openAddInfluencerDialog"
      >
        Add Influencer
      </v-btn>
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        @click="openAddDialog"
      >
        Add Partner
      </v-btn>
    </div>

    <!-- Stats Row -->
    <UiStatsRow
      :stats="[
        { value: summaryStats.total, label: 'Total Partners', color: 'primary' },
        { value: summaryStats.active, label: 'Active', color: 'success' },
        { value: summaryStats.prospects, label: 'Prospects', color: 'info' },
        { value: summaryStats.needsFollowup, label: 'Needs Follow-up', color: 'warning' },
        { value: summaryStats.inactive, label: 'Inactive', color: 'secondary' },
        { value: statsByType['influencer'] || 0, label: 'Influencers', color: 'teal' }
      ]"
      layout="6-col"
    />

    <!-- Type Pills -->
    <div class="d-flex flex-wrap gap-2 mb-4">
      <v-chip
        v-for="(count, type) in statsByType"
        :key="type"
        :color="selectedType === type ? getTypeColor(type as string) : undefined"
        :variant="selectedType === type ? 'elevated' : 'outlined'"
        @click="selectedType = selectedType === type ? null : (type as string)"
      >
        {{ formatTypeName(type as string) }}
        <template #append>
          <v-avatar size="20" class="ml-1" :color="getTypeColor(type as string)">
            {{ count }}
          </v-avatar>
        </template>
      </v-chip>
    </div>

    <!-- Filters -->
    <v-card class="mb-4" variant="outlined">
      <v-card-text class="py-3">
        <v-row dense>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="searchQuery"
              label="Search partners..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="6" md="3">
            <v-select
              v-model="selectedType"
              :items="partnerTypes"
              label="Type"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="6" md="3" class="d-flex align-center gap-2">
            <v-select
              v-model="selectedStatus"
              :items="statusOptions"
              label="Status"
              variant="outlined"
              density="compact"
              hide-details
              class="flex-grow-1"
            />
            <v-btn-toggle v-model="viewMode" mandatory density="compact" color="primary">
              <v-btn value="list" size="small">
                <v-icon size="18">mdi-format-list-bulleted</v-icon>
              </v-btn>
              <v-btn value="cards" size="small">
                <v-icon size="18">mdi-view-grid</v-icon>
              </v-btn>
            </v-btn-toggle>
          </v-col>
        </v-row>
        <v-row v-if="selectedType === 'pet_business' || selectedType === 'rescue'" dense class="mt-2">
          <v-col cols="12" md="4">
            <v-select
              v-model="selectedService"
              :items="serviceOptions"
              label="Filter by Service"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="8" class="d-flex align-center">
            <span class="text-caption text-medium-emphasis">
              Showing {{ filteredPartners.length }} of {{ combinedList?.length || 0 }} contacts
            </span>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Partners List View -->
    <v-card v-if="viewMode === 'list'" variant="outlined">
      <v-progress-linear v-if="pending || influencersPending" indeterminate color="primary" />
      
      <v-list v-if="filteredPartners.length > 0" lines="two">
        <template v-for="(partner, index) in filteredPartners" :key="partner.id">
          <v-divider v-if="index > 0" />
          <v-list-item @click="handleItemClick(partner)">
            <template #prepend>
              <v-avatar :color="getTypeColor(partner.partner_type)" size="40">
                <v-icon color="white">
                  {{
                    partner.partner_type === 'pet_business' ? 'mdi-dog' :
                    partner.partner_type === 'exotic_shop' ? 'mdi-snake' :
                    partner.partner_type === 'rescue' ? 'mdi-paw' :
                    partner.partner_type === 'influencer' ? 'mdi-star-circle' :
                    partner.partner_type === 'entertainment' ? 'mdi-party-popper' :
                    partner.partner_type === 'print_vendor' ? 'mdi-printer' :
                    partner.partner_type === 'chamber' ? 'mdi-office-building' :
                    partner.partner_type === 'food_vendor' ? 'mdi-food' :
                    partner.partner_type === 'association' ? 'mdi-account-group' :
                    partner.partner_type === 'spay_neuter' ? 'mdi-medical-bag' :
                    'mdi-handshake'
                  }}
                </v-icon>
              </v-avatar>
            </template>
            
            <v-list-item-title class="font-weight-medium">
              {{ partner.name }}
              <v-chip v-if="partner._isInfluencer && getInfluencerFollowerCount(partner)" size="x-small" color="secondary" variant="tonal" class="ml-2">
                {{ formatFollowers(getInfluencerFollowerCount(partner)) }} followers
              </v-chip>
            </v-list-item-title>
            
            <v-list-item-subtitle>
              <div class="d-flex align-center flex-wrap gap-2 mt-1">
                <v-chip size="x-small" :color="getStatusColor(partner.status)" variant="flat">
                  {{ partner.status }}
                </v-chip>
                <v-chip v-if="partner.services_provided" size="x-small" color="info" variant="tonal">
                  {{ partner.services_provided }}
                </v-chip>
                <span v-if="partner.contact_phone">
                  <v-icon size="x-small">mdi-phone</v-icon>
                  {{ partner.contact_phone }}
                </span>
                <span v-if="partner.contact_email">
                  <v-icon size="x-small">mdi-email</v-icon>
                  {{ partner.contact_email }}
                </span>
              </div>
              <div v-if="partner.notes" class="text-truncate mt-1" style="max-width: 500px;">
                {{ partner.notes }}
              </div>
            </v-list-item-subtitle>

            <template #append>
              <div class="d-flex flex-column align-end gap-1">
                <v-chip
                  v-if="partner.membership_end"
                  size="x-small"
                  :color="new Date(partner.membership_end) < new Date() ? 'error' : 'success'"
                  variant="tonal"
                >
                  {{ new Date(partner.membership_end) < new Date() ? 'Expired' : 'Expires' }}
                  {{ new Date(partner.membership_end).toLocaleDateString() }}
                </v-chip>
                <div v-if="partner.membership_fee" class="text-caption">
                  ${{ partner.membership_fee }}/year
                </div>
              </div>
              <v-btn
                icon
                variant="text"
                size="small"
                color="error"
                class="ml-2"
                @click.stop="handleDelete(partner)"
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </template>
          </v-list-item>
          <v-divider v-if="index < filteredPartners.length - 1" />
        </template>
      </v-list>

      <v-card-text v-else class="text-center py-12">
        <v-icon size="64" color="grey-lighten-1">mdi-handshake-outline</v-icon>
        <div class="text-h6 mt-4">No contacts found</div>
        <div class="text-body-2 text-medium-emphasis">
          {{ searchQuery || selectedType || selectedStatus ? 'Try adjusting your filters' : 'Add your first partner or influencer to get started' }}
        </div>
        <v-btn
          v-if="!searchQuery && !selectedType && !selectedStatus"
          color="primary"
          class="mt-4"
          @click="openAddDialog"
        >
          Add Partner
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- Partners Card Grid View -->
    <div v-else>
      <v-progress-linear v-if="pending || influencersPending" indeterminate color="primary" class="mb-4" />
      
      <v-row v-if="filteredPartners.length > 0">
        <v-col
          v-for="partner in filteredPartners"
          :key="partner.id"
          cols="12"
          sm="6"
          md="4"
          lg="3"
        >
          <v-card 
            rounded="lg" 
            elevation="2" 
            class="h-100 cursor-pointer"
            hover
            @click="handleItemClick(partner)"
          >
            <v-card-text class="text-center pb-2">
              <v-avatar :color="getTypeColor(partner.partner_type)" size="64" class="mb-3">
                <v-icon color="white" size="28">
                  {{
                    partner.partner_type === 'pet_business' ? 'mdi-dog' :
                    partner.partner_type === 'exotic_shop' ? 'mdi-snake' :
                    partner.partner_type === 'rescue' ? 'mdi-paw' :
                    partner.partner_type === 'influencer' ? 'mdi-star-circle' :
                    partner.partner_type === 'entertainment' ? 'mdi-party-popper' :
                    partner.partner_type === 'print_vendor' ? 'mdi-printer' :
                    partner.partner_type === 'chamber' ? 'mdi-office-building' :
                    partner.partner_type === 'food_vendor' ? 'mdi-food' :
                    partner.partner_type === 'association' ? 'mdi-account-group' :
                    partner.partner_type === 'spay_neuter' ? 'mdi-medical-bag' :
                    'mdi-handshake'
                  }}
                </v-icon>
              </v-avatar>
              <h3 class="text-subtitle-1 font-weight-bold mb-1 text-truncate">{{ partner.name }}</h3>
              <p class="text-caption text-grey mb-2">{{ formatTypeName(partner.partner_type) }}</p>
              <v-chip :color="getStatusColor(partner.status)" size="x-small" variant="flat">
                {{ partner.status }}
              </v-chip>
            </v-card-text>
            <v-divider />
            <v-card-text class="py-2">
              <div class="d-flex flex-column gap-1 text-caption">
                <div v-if="partner.contact_email" class="d-flex align-center gap-1">
                  <v-icon size="14" color="grey">mdi-email</v-icon>
                  <span class="text-truncate">{{ partner.contact_email }}</span>
                </div>
                <div v-if="partner.contact_phone" class="d-flex align-center gap-1">
                  <v-icon size="14" color="grey">mdi-phone</v-icon>
                  <span>{{ partner.contact_phone }}</span>
                </div>
                <div v-if="partner.services_provided" class="d-flex align-center gap-1">
                  <v-icon size="14" color="grey">mdi-tag</v-icon>
                  <span>{{ partner.services_provided }}</span>
                </div>
              </div>
            </v-card-text>
            <v-card-actions class="px-4 pb-3">
              <v-chip v-if="partner._isInfluencer && getInfluencerFollowerCount(partner)" size="x-small" color="secondary" variant="tonal">
                {{ formatFollowers(getInfluencerFollowerCount(partner)) }}
              </v-chip>
              <v-spacer />
              <v-btn icon size="x-small" variant="text" color="error" @click.stop="handleDelete(partner)">
                <v-icon size="16">mdi-delete</v-icon>
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>

      <v-card v-else class="text-center py-12" variant="outlined">
        <v-icon size="64" color="grey-lighten-1">mdi-handshake-outline</v-icon>
        <div class="text-h6 mt-4">No contacts found</div>
        <div class="text-body-2 text-medium-emphasis">
          {{ searchQuery || selectedType || selectedStatus ? 'Try adjusting your filters' : 'Add your first partner or influencer to get started' }}
        </div>
        <v-btn
          v-if="!searchQuery && !selectedType && !selectedStatus"
          color="primary"
          class="mt-4"
          @click="openAddDialog"
        >
          Add Partner
        </v-btn>
      </v-card>
    </div>

    <!-- Add/Edit Dialog -->
    <v-dialog v-model="dialogOpen" max-width="700" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">{{ editingPartner ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
          {{ editingPartner ? 'Edit Partner' : 'Add Partner' }}
          <v-spacer />
          <v-btn icon variant="text" @click="dialogOpen = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        
        <v-divider />
        
        <v-card-text>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="formData.name"
                label="Partner Name *"
                variant="outlined"
                required
              />
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="formData.partner_type"
                :items="partnerTypes.filter(t => t.value !== null)"
                label="Category *"
                variant="outlined"
              />
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="formData.status"
                :items="statusOptions.filter(s => s.value !== null)"
                label="Status *"
                variant="outlined"
              />
            </v-col>
            
            <v-col cols="12">
              <v-divider class="my-2" />
              <div class="text-subtitle-2 text-medium-emphasis mb-2">Contact Information</div>
            </v-col>
            
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.contact_name"
                label="Contact Name"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.contact_phone"
                label="Phone"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.contact_email"
                label="Email"
                variant="outlined"
                density="compact"
                type="email"
              />
            </v-col>
            
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.website"
                label="Website"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-web"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.instagram_handle"
                label="Instagram Handle"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-instagram"
              />
            </v-col>
            
            <v-col cols="12">
              <v-text-field
                v-model="formData.address"
                label="Address"
                variant="outlined"
                density="compact"
              />
            </v-col>
            
            <v-col cols="12">
              <v-divider class="my-2" />
              <div class="text-subtitle-2 text-medium-emphasis mb-2">Account Credentials</div>
            </v-col>
            
            <v-col cols="12" md="4">
              <v-select
                v-model="formData.category"
                :items="categoryOptions"
                label="Partner Category"
                variant="outlined"
                density="compact"
                clearable
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.account_email"
                label="Login Email"
                variant="outlined"
                density="compact"
                type="email"
                prepend-inner-icon="mdi-email-lock"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.account_password"
                label="Password"
                variant="outlined"
                density="compact"
                :type="showPassword ? 'text' : 'password'"
                prepend-inner-icon="mdi-lock"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="showPassword = !showPassword"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.account_number"
                label="Account Number"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-pound"
              />
            </v-col>
            
            <v-col cols="12">
              <v-divider class="my-2" />
              <div class="text-subtitle-2 text-medium-emphasis mb-2">Membership Details</div>
            </v-col>
            
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.membership_level"
                label="Membership Level"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model.number="formData.membership_fee"
                label="Annual Fee ($)"
                variant="outlined"
                density="compact"
                type="number"
                prefix="$"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.membership_end"
                label="Expiration Date"
                variant="outlined"
                density="compact"
                type="date"
              />
            </v-col>
            
            <v-col cols="12">
              <v-textarea
                v-model="formData.services_provided"
                label="Services Provided"
                variant="outlined"
                density="compact"
                rows="2"
              />
            </v-col>
            
            <v-col cols="12">
              <v-textarea
                v-model="formData.notes"
                label="Notes"
                variant="outlined"
                rows="3"
              />
            </v-col>
          </v-row>
        </v-card-text>
        
        <v-divider />
        
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialogOpen = false" :disabled="saving">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="savePartner">
            {{ editingPartner ? 'Save Changes' : 'Add Partner' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add/Edit Influencer Dialog -->
    <v-dialog v-model="influencerDialogOpen" max-width="700" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">{{ editingInfluencer ? 'mdi-pencil' : 'mdi-star-circle' }}</v-icon>
          {{ editingInfluencer ? 'Edit Influencer' : 'Add Influencer' }}
          <v-spacer />
          <v-btn icon variant="text" @click="influencerDialogOpen = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        
        <v-divider />
        
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="influencerForm.contact_name"
                label="Contact Name *"
                variant="outlined"
                required
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="influencerForm.pet_name"
                label="Pet Name"
                variant="outlined"
                prepend-inner-icon="mdi-paw"
              />
            </v-col>
            
            <v-col cols="6" md="4">
              <v-select
                v-model="influencerForm.status"
                :items="influencerStatusOptions"
                label="Status *"
                variant="outlined"
              />
            </v-col>
            <v-col cols="6" md="4">
              <v-text-field
                v-model="influencerForm.promo_code"
                label="Promo Code"
                variant="outlined"
                placeholder="e.g., SAWYER20"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="influencerForm.location"
                label="Location"
                variant="outlined"
                prepend-inner-icon="mdi-map-marker"
              />
            </v-col>
            
            <v-col cols="12">
              <v-divider class="my-2" />
              <div class="text-subtitle-2 text-medium-emphasis mb-2">Contact Information</div>
            </v-col>
            
            <v-col cols="12" md="6">
              <v-text-field
                v-model="influencerForm.phone"
                label="Phone"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="influencerForm.email"
                label="Email"
                variant="outlined"
                density="compact"
                type="email"
              />
            </v-col>
            
            <v-col cols="12">
              <v-divider class="my-2" />
              <div class="text-subtitle-2 text-medium-emphasis mb-2">Social Media</div>
            </v-col>
            
            <v-col cols="12" md="6">
              <v-text-field
                v-model="influencerForm.instagram_handle"
                label="Instagram Handle"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-instagram"
                prefix="@"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="influencerForm.instagram_url"
                label="Instagram URL"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="influencerForm.tiktok_handle"
                label="TikTok Handle"
                variant="outlined"
                density="compact"
                prefix="@"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="influencerForm.youtube_url"
                label="YouTube URL"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="influencerForm.facebook_url"
                label="Facebook URL"
                variant="outlined"
                density="compact"
              />
            </v-col>
            
            <v-col cols="6" md="4">
              <v-text-field
                v-model.number="influencerForm.follower_count"
                label="Follower Count"
                variant="outlined"
                density="compact"
                type="number"
              />
            </v-col>
            <v-col cols="6" md="4">
              <v-select
                v-model="influencerForm.highest_platform"
                :items="['IG', 'TikTok', 'YouTube', 'Facebook', 'Twitter']"
                label="Primary Platform"
                variant="outlined"
                density="compact"
              />
            </v-col>
            
            <v-col cols="12">
              <v-textarea
                v-model="influencerForm.agreement_details"
                label="Agreement Details"
                variant="outlined"
                rows="3"
                placeholder="e.g., Collaboration Reel with promo code, 2 IG Stories, Green Dog Experience filming..."
              />
            </v-col>
            
            <v-col cols="12">
              <v-textarea
                v-model="influencerForm.notes"
                label="Notes"
                variant="outlined"
                rows="2"
              />
            </v-col>
          </v-row>
        </v-card-text>
        
        <v-divider />
        
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="influencerDialogOpen = false">Cancel</v-btn>
          <v-btn color="secondary" @click="saveInfluencer">
            {{ editingInfluencer ? 'Save Changes' : 'Add Influencer' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Partner Profile Dialog -->
    <v-dialog v-model="profileDialogOpen" max-width="900" scrollable>
      <v-card v-if="selectedPartner">
        <v-card-title class="d-flex align-center">
          <v-avatar :color="getTypeColor(selectedPartner.partner_type)" size="40" class="mr-3">
            <v-icon color="white">mdi-handshake</v-icon>
          </v-avatar>
          <div>
            <span class="text-h6">{{ selectedPartner.name }}</span>
            <div class="text-caption text-medium-emphasis">
              {{ formatTypeName(selectedPartner.partner_type) }}
            </div>
          </div>
          <v-spacer />
          <v-chip :color="getStatusColor(selectedPartner.status)" size="small" class="mr-2">
            {{ selectedPartner.status }}
          </v-chip>
          <v-btn icon variant="text" @click="profileDialogOpen = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-divider />

        <v-progress-linear v-if="loadingProfile" indeterminate color="primary" />

        <v-tabs v-model="profileTab" bg-color="transparent">
          <v-tab value="overview">Overview</v-tab>
          <v-tab value="notes">
            Notes
            <v-badge
              v-if="partnerNotes.length"
              :content="partnerNotes.length"
              color="primary"
              inline
              class="ml-1"
            />
          </v-tab>
          <v-tab value="contacts">
            Contacts
            <v-badge
              v-if="partnerContacts.length"
              :content="partnerContacts.length"
              color="primary"
              inline
              class="ml-1"
            />
          </v-tab>
          <v-tab value="relationship">Relationship</v-tab>
        </v-tabs>

        <v-divider />

        <v-card-text style="min-height: 400px; max-height: 60vh; overflow-y: auto;">
          <v-tabs-window v-model="profileTab">
            <!-- Overview Tab -->
            <v-tabs-window-item value="overview">
              <v-row>
                <!-- Category & Status Display (read-only - edit via Edit Partner button) -->
                <v-col cols="12">
                  <div class="d-flex flex-wrap gap-2 mb-4">
                    <v-chip :color="getCategoryColor(selectedPartner.partner_type)" variant="elevated" size="small">
                      <v-icon start size="16">{{ getCategoryIcon(selectedPartner.partner_type) }}</v-icon>
                      {{ getCategoryLabel(selectedPartner.partner_type) || 'Other' }}
                    </v-chip>
                    <v-chip :color="selectedPartner.status === 'active' ? 'success' : selectedPartner.status === 'inactive' ? 'grey' : 'warning'" variant="tonal" size="small">
                      {{ selectedPartner.status || 'Unknown' }}
                    </v-chip>
                  </div>
                  <v-alert type="info" variant="tonal" density="compact" class="mb-4">
                    <template #prepend>
                      <v-icon size="small">mdi-information</v-icon>
                    </template>
                    To change Category or Status, click <strong>Edit Partner</strong> below.
                  </v-alert>
                </v-col>

                <v-col cols="12" md="6">
                  <v-list density="compact">
                    <v-list-subheader>Contact Information</v-list-subheader>
                    <v-list-item v-if="selectedPartner.contact_name">
                      <template #prepend>
                        <v-icon size="small">mdi-account</v-icon>
                      </template>
                      <v-list-item-title>{{ selectedPartner.contact_name }}</v-list-item-title>
                      <v-list-item-subtitle>Primary Contact</v-list-item-subtitle>
                    </v-list-item>
                    <v-list-item v-if="selectedPartner.contact_phone">
                      <template #prepend>
                        <v-icon size="small">mdi-phone</v-icon>
                      </template>
                      <v-list-item-title>{{ selectedPartner.contact_phone }}</v-list-item-title>
                    </v-list-item>
                    <v-list-item v-if="selectedPartner.contact_email">
                      <template #prepend>
                        <v-icon size="small">mdi-email</v-icon>
                      </template>
                      <v-list-item-title>{{ selectedPartner.contact_email }}</v-list-item-title>
                    </v-list-item>
                    <v-list-item v-if="selectedPartner.address">
                      <template #prepend>
                        <v-icon size="small">mdi-map-marker</v-icon>
                      </template>
                      <v-list-item-title>{{ selectedPartner.address }}</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-col>
                <v-col cols="12" md="6">
                  <v-list density="compact">
                    <v-list-subheader>Social & Web</v-list-subheader>
                    <v-list-item v-if="selectedPartner.website">
                      <template #prepend>
                        <v-icon size="small">mdi-web</v-icon>
                      </template>
                      <v-list-item-title>
                        <a :href="selectedPartner.website" target="_blank">{{ selectedPartner.website }}</a>
                      </v-list-item-title>
                    </v-list-item>
                    <v-list-item v-if="selectedPartner.instagram_handle">
                      <template #prepend>
                        <v-icon size="small">mdi-instagram</v-icon>
                      </template>
                      <v-list-item-title>@{{ selectedPartner.instagram_handle }}</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-col>
                <v-col v-if="selectedPartner.membership_level || selectedPartner.membership_fee" cols="12">
                  <v-alert type="info" variant="tonal" density="compact" class="mb-3">
                    <div class="d-flex align-center justify-space-between">
                      <div>
                        <strong>{{ selectedPartner.membership_level || 'Member' }}</strong>
                        <span v-if="selectedPartner.membership_fee"> - ${{ selectedPartner.membership_fee }}/year</span>
                      </div>
                      <v-chip
                        v-if="selectedPartner.membership_end"
                        size="small"
                        :color="new Date(selectedPartner.membership_end) < new Date() ? 'error' : 'success'"
                      >
                        {{ new Date(selectedPartner.membership_end) < new Date() ? 'Expired' : 'Expires' }}
                        {{ new Date(selectedPartner.membership_end).toLocaleDateString() }}
                      </v-chip>
                    </div>
                  </v-alert>
                </v-col>
                <v-col v-if="selectedPartner.services_provided" cols="12">
                  <div class="text-subtitle-2 mb-1">Services</div>
                  <p class="text-body-2">{{ selectedPartner.services_provided }}</p>
                </v-col>
                <v-col v-if="selectedPartner.notes" cols="12">
                  <div class="text-subtitle-2 mb-1">Notes</div>
                  <p class="text-body-2">{{ selectedPartner.notes }}</p>
                </v-col>
                
                <!-- Account Credentials Section -->
                <v-col 
                  v-if="selectedPartner.account_email || selectedPartner.account_password || selectedPartner.account_number" 
                  cols="12"
                >
                  <v-divider class="my-3" />
                  <div class="text-subtitle-2 mb-3">
                    <v-icon size="small" class="mr-1">mdi-lock</v-icon>
                    Account Credentials
                  </div>
                  <v-row dense>
                    <v-col v-if="selectedPartner.account_email" cols="12" md="4">
                      <div class="text-caption text-medium-emphasis mb-1">Login Email</div>
                      <UiSecureField 
                        :value="selectedPartner.account_email" 
                        label="Login Email"
                        maskType="partial"
                        :showLabel="false"
                      />
                    </v-col>
                    <v-col v-if="selectedPartner.account_password" cols="12" md="4">
                      <div class="text-caption text-medium-emphasis mb-1">Password</div>
                      <UiSecureField 
                        :value="selectedPartner.account_password" 
                        label="Password"
                        maskType="password"
                        :showLabel="false"
                      />
                    </v-col>
                    <v-col v-if="selectedPartner.account_number" cols="12" md="4">
                      <div class="text-caption text-medium-emphasis mb-1">Account Number</div>
                      <UiSecureField 
                        :value="selectedPartner.account_number" 
                        label="Account Number"
                        maskType="account"
                        :showLabel="false"
                      />
                    </v-col>
                  </v-row>
                </v-col>
              </v-row>
            </v-tabs-window-item>

            <!-- Notes Tab -->
            <v-tabs-window-item value="notes">
              <!-- Add Note Form -->
              <v-card variant="outlined" class="mb-4">
                <v-card-text>
                  <v-row dense>
                    <v-col cols="12" md="3">
                      <v-select
                        v-model="newNoteType"
                        :items="noteTypeOptions"
                        label="Note Type"
                        variant="outlined"
                        density="compact"
                        hide-details
                      />
                    </v-col>
                    <v-col cols="12" md="7">
                      <v-textarea
                        v-model="newNoteContent"
                        label="Add a note..."
                        variant="outlined"
                        density="compact"
                        rows="2"
                        hide-details
                      />
                    </v-col>
                    <v-col cols="12" md="2" class="d-flex align-center">
                      <v-btn
                        color="primary"
                        :disabled="!newNoteContent.trim()"
                        block
                        @click="addNote"
                      >
                        Add
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>

              <!-- Notes List -->
              <div v-if="partnerNotes.length === 0" class="text-center py-8">
                <v-icon size="48" color="grey-lighten-1">mdi-note-text-outline</v-icon>
                <div class="text-body-2 text-medium-emphasis mt-2">No notes yet</div>
              </div>

              <v-list v-else lines="three" class="pa-0">
                <template v-for="(note, index) in partnerNotes" :key="note.id">
                  <v-list-item>
                    <template #prepend>
                      <v-avatar size="36" :color="getNoteTypeColor(note.note_type)" variant="tonal">
                        <v-icon size="small">{{ getNoteTypeIcon(note.note_type) }}</v-icon>
                      </v-avatar>
                    </template>

                    <v-list-item-title class="d-flex align-center">
                      <v-chip size="x-small" :color="getNoteTypeColor(note.note_type)" class="mr-2">
                        {{ note.note_type }}
                      </v-chip>
                      <span class="text-caption text-medium-emphasis">
                        {{ formatRelativeDate(note.created_at) }}
                        <template v-if="note.author_initials">
                          by <strong>{{ note.author_initials }}</strong>
                        </template>
                      </span>
                      <v-icon v-if="note.is_pinned" size="small" color="warning" class="ml-2">mdi-pin</v-icon>
                    </v-list-item-title>

                    <v-list-item-subtitle class="text-wrap mt-1">
                      {{ note.content }}
                    </v-list-item-subtitle>

                    <template #append>
                      <v-btn
                        icon
                        variant="text"
                        size="small"
                        :color="note.is_pinned ? 'warning' : 'default'"
                        @click="toggleNotePin(note)"
                      >
                        <v-icon size="small">{{ note.is_pinned ? 'mdi-pin-off' : 'mdi-pin' }}</v-icon>
                      </v-btn>
                      <v-btn
                        icon
                        variant="text"
                        size="small"
                        color="error"
                        @click="deleteNote(note.id)"
                      >
                        <v-icon size="small">mdi-delete</v-icon>
                      </v-btn>
                    </template>
                  </v-list-item>
                  <v-divider v-if="index < partnerNotes.length - 1" />
                </template>
              </v-list>
            </v-tabs-window-item>

            <!-- Contacts Tab -->
            <v-tabs-window-item value="contacts">
              <div class="d-flex justify-end mb-3">
                <v-btn color="primary" size="small" prepend-icon="mdi-plus" @click="openAddContactDialog">
                  Add Contact
                </v-btn>
              </div>

              <div v-if="partnerContacts.length === 0" class="text-center py-8">
                <v-icon size="48" color="grey-lighten-1">mdi-account-outline</v-icon>
                <div class="text-body-2 text-medium-emphasis mt-2">No contacts added yet</div>
              </div>

              <v-list v-else lines="two">
                <template v-for="(contact, index) in partnerContacts" :key="contact.id">
                  <v-list-item>
                    <template #prepend>
                      <v-avatar color="primary" size="40">
                        <span class="text-body-2">{{ contact.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) }}</span>
                      </v-avatar>
                    </template>

                    <v-list-item-title>
                      {{ contact.name }}
                      <v-chip v-if="contact.is_primary" size="x-small" color="success" class="ml-2">Primary</v-chip>
                      <v-chip v-if="contact.category" size="x-small" :color="getTypeColor(contact.category)" class="ml-2">
                        {{ getCategoryLabel(contact.category) }}
                      </v-chip>
                    </v-list-item-title>

                    <v-list-item-subtitle>
                      <span v-if="contact.title">{{ contact.title }}</span>
                      <span v-if="contact.phone" class="ml-3">
                        <v-icon size="x-small">mdi-phone</v-icon> {{ contact.phone }}
                      </span>
                      <span v-if="contact.email" class="ml-3">
                        <v-icon size="x-small">mdi-email</v-icon> {{ contact.email }}
                      </span>
                    </v-list-item-subtitle>

                    <template #append>
                      <v-btn icon variant="text" size="small" @click="openEditContactDialog(contact)">
                        <v-icon size="small">mdi-pencil</v-icon>
                      </v-btn>
                      <v-btn icon variant="text" size="small" color="error" @click="deleteContact(contact.id)">
                        <v-icon size="small">mdi-delete</v-icon>
                      </v-btn>
                    </template>
                  </v-list-item>
                  <v-divider v-if="index < partnerContacts.length - 1" />
                </template>
              </v-list>
            </v-tabs-window-item>

            <!-- Relationship Tab -->
            <v-tabs-window-item value="relationship">
              <v-row>
                <v-col cols="12" md="6">
                  <v-card variant="outlined" class="mb-4">
                    <v-card-text>
                      <div class="text-subtitle-2 mb-3">Relationship Score</div>
                      <div class="d-flex align-center">
                        <v-progress-linear
                          :model-value="selectedPartner.relationship_score || 50"
                          :color="getRelationshipScoreColor(selectedPartner.relationship_score)"
                          height="24"
                          rounded
                        >
                          <template #default>
                            <strong>{{ selectedPartner.relationship_score || 50 }}%</strong>
                          </template>
                        </v-progress-linear>
                      </div>
                      <v-slider
                        :model-value="selectedPartner.relationship_score || 50"
                        min="0"
                        max="100"
                        step="5"
                        class="mt-4"
                        hide-details
                        @update:model-value="updatePartnerRelationship('relationship_score', $event)"
                      />
                    </v-card-text>
                  </v-card>
                </v-col>

                <v-col cols="12" md="6">
                  <v-select
                    :model-value="selectedPartner.relationship_status"
                    :items="relationshipStatusOptions"
                    label="Relationship Status"
                    variant="outlined"
                    density="compact"
                    class="mb-4"
                    @update:model-value="updatePartnerRelationship('relationship_status', $event)"
                  />

                  <v-select
                    :model-value="selectedPartner.priority"
                    :items="priorityOptions"
                    label="Priority"
                    variant="outlined"
                    density="compact"
                    class="mb-4"
                    @update:model-value="updatePartnerRelationship('priority', $event)"
                  />

                  <v-select
                    :model-value="selectedPartner.partnership_value"
                    :items="partnershipValueOptions"
                    label="Partnership Value"
                    variant="outlined"
                    density="compact"
                    @update:model-value="updatePartnerRelationship('partnership_value', $event)"
                  />
                </v-col>

                <v-col cols="12">
                  <v-divider class="my-2" />
                  <div class="text-subtitle-2 mb-3">Visit & Follow-up Tracking</div>
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    :model-value="selectedPartner.last_visit_date"
                    label="Last Visit Date"
                    type="date"
                    variant="outlined"
                    density="compact"
                    @update:model-value="updatePartnerRelationship('last_visit_date', $event)"
                  />
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    :model-value="selectedPartner.next_followup_date"
                    label="Next Follow-up Date"
                    type="date"
                    variant="outlined"
                    density="compact"
                    @update:model-value="updatePartnerRelationship('next_followup_date', $event)"
                  />
                </v-col>

                <v-col cols="12" md="4">
                  <v-select
                    :model-value="selectedPartner.visit_frequency"
                    :items="visitFrequencyOptions"
                    label="Visit Frequency"
                    variant="outlined"
                    density="compact"
                    @update:model-value="updatePartnerRelationship('visit_frequency', $event)"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    :model-value="selectedPartner.preferred_visit_day"
                    label="Preferred Visit Day"
                    variant="outlined"
                    density="compact"
                    placeholder="e.g., Tuesday afternoon"
                    @update:model-value="updatePartnerRelationship('preferred_visit_day', $event)"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    :model-value="selectedPartner.best_contact_person"
                    label="Best Contact Person"
                    variant="outlined"
                    density="compact"
                    @update:model-value="updatePartnerRelationship('best_contact_person', $event)"
                  />
                </v-col>

                <v-col cols="12">
                  <v-switch
                    :model-value="selectedPartner.needs_followup"
                    label="Needs Follow-up"
                    color="warning"
                    hide-details
                    @update:model-value="updatePartnerRelationship('needs_followup', $event)"
                  />
                </v-col>
              </v-row>
            </v-tabs-window-item>
          </v-tabs-window>
        </v-card-text>

        <v-divider />

        <v-card-actions>
          <v-btn variant="text" prepend-icon="mdi-pencil" @click="profileDialogOpen = false; openEditDialog(selectedPartner)">
            Edit Partner
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="profileDialogOpen = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add/Edit Contact Dialog -->
    <v-dialog v-model="showContactDialog" max-width="500">
      <v-card>
        <v-card-title>{{ editingContactId ? 'Edit Contact' : 'Add Contact' }}</v-card-title>
        <v-divider />
        <v-card-text>
          <v-row dense>
            <v-col cols="12">
              <v-text-field
                v-model="contactForm.name"
                label="Name *"
                variant="outlined"
                required
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="contactForm.title"
                label="Title / Role"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12">
              <v-select
                v-model="contactForm.category"
                :items="contactCategoryOptions"
                label="Category"
                variant="outlined"
                clearable
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="contactForm.phone"
                label="Phone"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="contactForm.email"
                label="Email"
                variant="outlined"
                type="email"
              />
            </v-col>
            <v-col cols="12">
              <v-switch
                v-model="contactForm.is_primary"
                label="Primary Contact"
                color="primary"
                hide-details
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="contactForm.notes"
                label="Notes"
                variant="outlined"
                rows="2"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showContactDialog = false; editingContactId = null">Cancel</v-btn>
          <v-btn color="primary" :disabled="!contactForm.name.trim()" @click="saveContact">
            {{ editingContactId ? 'Save Changes' : 'Add Contact' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
