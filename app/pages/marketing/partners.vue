<script setup lang="ts">
import type { Partner, PartnerNote, PartnerContact } from '~/types/marketing.types'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'marketing-admin']
})

const supabase = useSupabaseClient()
const route = useRoute()
const user = useSupabaseUser()
const { showSuccess, showError } = useToast()

// Export dialog
const showExportDialog = ref(false)
const showImportWizard = ref(false)
const exportColumns = [
  { key: 'name', title: 'Name' },
  { key: 'partner_type', title: 'Type', format: (v: string) => v?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l.toUpperCase()) || '' },
  { key: 'status', title: 'Status' },
  { key: 'contact_name', title: 'Contact Name' },
  { key: 'contact_phone', title: 'Phone' },
  { key: 'contact_email', title: 'Email' },
  { key: 'services_provided', title: 'Services' },
  { key: 'address', title: 'Address' },
  { key: 'instagram_handle', title: 'Instagram' },
  { key: 'membership_level', title: 'Membership Level' },
  { key: 'membership_fee', title: 'Annual Fee', format: (v: number) => v ? `$${v}` : '' },
  { key: 'notes', title: 'Notes' },
  { key: 'area', title: 'Area' },
  { key: 'last_visit_date', title: 'Last Visit Date' },
  { key: 'created_at', title: 'Created' }
]

// Import field definitions
const partnerImportFields = [
  { key: 'name', label: 'Business Name', required: true },
  { key: 'partner_type', label: 'Partner Type' },
  { key: 'status', label: 'Status' },
  { key: 'area', label: 'Area' },
  { key: 'contact_name', label: 'Contact Name' },
  { key: 'contact_phone', label: 'Phone' },
  { key: 'contact_email', label: 'Email' },
  { key: 'website', label: 'Website' },
  { key: 'address', label: 'Address' },
  { key: 'services_provided', label: 'Services Provided' },
  { key: 'instagram_handle', label: 'Instagram Handle' },
  { key: 'facebook_url', label: 'Facebook URL' },
  { key: 'tiktok_handle', label: 'TikTok Handle' },
  { key: 'membership_level', label: 'Membership Level' },
  { key: 'membership_fee', label: 'Membership Fee' },
  { key: 'membership_end', label: 'Membership End Date' },
  { key: 'notes', label: 'Notes' }
]

// Area options matching referral CRM zones
const areaOptions = [
  { title: 'All Areas', value: null },
  { title: 'Westside & Coastal', value: 'Westside & Coastal' },
  { title: 'South Valley', value: 'South Valley' },
  { title: 'North Valley', value: 'North Valley' },
  { title: 'Central & Eastside', value: 'Central & Eastside' },
  { title: 'South Bay', value: 'South Bay' },
  { title: 'San Gabriel Valley', value: 'San Gabriel Valley' },
  { title: 'Online/Remote/Out of Area', value: 'Online/Remote/Out of Area' }
]

// Area edit options (without "All Areas")
const areaEditOptions = [
  { title: 'Westside & Coastal', value: 'Westside & Coastal' },
  { title: 'South Valley', value: 'South Valley' },
  { title: 'North Valley', value: 'North Valley' },
  { title: 'Central & Eastside', value: 'Central & Eastside' },
  { title: 'South Bay', value: 'South Bay' },
  { title: 'San Gabriel Valley', value: 'San Gabriel Valley' },
  { title: 'Online/Remote/Out of Area', value: 'Online/Remote/Out of Area' }
]

// Filter state
const searchQuery = ref('')
const selectedType = ref<string | null>(null)
const selectedStatus = ref<string | null>(null)
const selectedService = ref<string | null>(null)
const selectedArea = ref<string | null>(null)
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
  { title: 'Other', value: 'other' }
]

// Partner type options for profile editing (without "All Types")
const partnerTypeEditOptions = [
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

// Partner list (no longer includes influencers - they have their own page)
const combinedList = computed(() => {
  return (partners.value || []).map(p => ({ ...p, _isInfluencer: false }))
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
      p.address?.toLowerCase().includes(query) ||
      p.area?.toLowerCase().includes(query)
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

  if (selectedArea.value) {
    result = result.filter(p => p.area === selectedArea.value)
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
    active: all.filter(p => p.status === 'active').length,
    prospects: all.filter(p => p.status === 'prospect').length,
    needsFollowup: all.filter(p => p.needs_followup).length,
    inactive: all.filter(p => p.status === 'inactive').length
  }
})

// =====================================================
// PARTNER SCORING LOGIC
// Matches referral partner scoring with modified visit thresholds:
//   Top third: within 4 months
//   Middle third: within 8 months
//   Bottom third: within 12 months
// =====================================================

function computeVisitScore(lastVisitDate: string | null | undefined): number {
  if (!lastVisitDate) return 0
  const last = new Date(lastVisitDate)
  const now = new Date()
  const months = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  if (months <= 4) return 50   // Top third
  if (months <= 8) return 33   // Middle third
  if (months <= 12) return 17  // Bottom third
  return 0                     // Beyond 12 months
}

function computePriorityScore(priority: string | null | undefined): number {
  const scores: Record<string, number> = {
    critical: 50, high: 38, medium: 25, low: 12
  }
  return scores[priority || ''] || 15
}

function computeRelationshipScore(partner: Partner): number {
  return computeVisitScore(partner.last_visit_date) + computePriorityScore(partner.priority)
}

function getPartnerTier(score: number): string {
  if (score >= 80) return 'Platinum'
  if (score >= 60) return 'Gold'
  if (score >= 40) return 'Silver'
  if (score >= 20) return 'Bronze'
  return 'Coal'
}

function getPartnerTierColor(tier: string): string {
  const colors: Record<string, string> = {
    Platinum: '#E5E4E2', Gold: '#FFD700', Silver: '#C0C0C0', Bronze: '#CD7F32', Coal: '#36454F'
  }
  return colors[tier] || '#9E9E9E'
}

function getPartnerTierLabel(tier: string): string {
  const labels: Record<string, string> = {
    Platinum: 'P', Gold: 'G', Silver: 'S', Bronze: 'B', Coal: 'C'
  }
  return labels[tier] || '?'
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'success'
  if (score >= 60) return 'info'
  if (score >= 40) return 'warning'
  return 'error'
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Needs Attention'
  return 'At Risk'
}

// Table headers (matching Referral CRM grid style)
const tableHeaders = [
  { title: 'Priority', key: 'priority', sortable: true, width: '100px' },
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Service', key: 'services_provided', sortable: true },
  { title: 'Area', key: 'area', sortable: true },
  { title: 'Address', key: 'address', sortable: true },
  { title: 'Email', key: 'contact_email', sortable: true },
  { title: 'Last Visit', key: 'last_visit_date', sortable: true },
  { title: 'Score', key: 'computed_score', sortable: true, width: '120px' },
  { title: '', key: 'actions', sortable: false, width: '100px' }
]

// Scored and filtered partners for the data table
const scoredPartners = computed(() => {
  return (filteredPartners.value || []).map(p => {
    const score = computeRelationshipScore(p)
    return {
      ...p,
      computed_score: score,
      computed_tier: getPartnerTier(score)
    }
  })
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
  category: '',
  area: '',
  facebook_url: '',
  tiktok_handle: ''
})

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
    category: '',
    area: '',
    facebook_url: '',
    tiktok_handle: ''
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
    category: partner.category || '',
    area: partner.area || '',
    facebook_url: partner.facebook_url || '',
    tiktok_handle: partner.tiktok_handle || ''
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
    category: formData.value.category || null,
    area: formData.value.area || null,
    facebook_url: formData.value.facebook_url || null,
    tiktok_handle: formData.value.tiktok_handle || null
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

// Handle clicking on list item
function handleItemClick(partner: Partner) {
  // Open profile dialog for partners
  openPartnerProfile(partner)
}

// Handle delete
function handleDelete(partner: Partner) {
  deletePartner(partner.id)
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    pet_business: 'teal',
    exotic_shop: 'lime',
    rescue: 'pink',
    entertainment: 'purple',
    print_vendor: 'brown',
    chamber: 'primary',
    food_vendor: 'orange',
    media: 'deep-purple',
    groomer: 'light-blue',
    daycare_boarding: 'amber',
    pet_retail: 'teal-darken-2',
    charity: 'red',
    merch_vendor: 'blue-grey',
    designers_graphics: 'deep-orange',
    other: 'grey'
  }
  return colors[type] || 'grey'
}

function getCategoryLabel(category: string | null): string {
  if (!category) return ''
  const labels: Record<string, string> = {
    pet_business: 'Other Pet Business',
    exotic_shop: 'Exotic Shop',
    rescue: 'Rescue',
    influencer: 'Influencer',
    entertainment: 'Entertainment',
    print_vendor: 'Print Vendor',
    chamber: 'Chamber/Association',
    food_vendor: 'Food & Beverage',
    media: 'Media',
    groomer: 'Groomer',
    daycare_boarding: 'Daycare/Boarding',
    pet_retail: 'Pet Retail',
    charity: 'Charity',
    merch_vendor: 'Merch Vendor',
    designers_graphics: 'Designers/Graphics',
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
    media: 'mdi-newspaper',
    groomer: 'mdi-content-cut',
    daycare_boarding: 'mdi-home-heart',
    pet_retail: 'mdi-store',
    charity: 'mdi-hand-heart',
    merch_vendor: 'mdi-tshirt-crew',
    designers_graphics: 'mdi-palette',
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
    media: 'deep-purple',
    groomer: 'light-blue',
    daycare_boarding: 'amber',
    pet_retail: 'teal-darken-2',
    charity: 'red',
    merch_vendor: 'blue-grey',
    designers_graphics: 'deep-orange',
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
    prospect: 'info',
    completed: 'blue-grey'
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
  <div>
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap gap-3">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Partnership CRM Hub</h1>
        <p class="text-body-2 text-grey-darken-1">
          Manage chambers, vendors, rescues, and business partners
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn
          variant="outlined"
          prepend-icon="mdi-file-import-outline"
          size="small"
          @click="showImportWizard = true"
        >
          Import
        </v-btn>
        <v-btn
          variant="outlined"
          prepend-icon="mdi-file-export-outline"
          size="small"
          @click="showExportDialog = true"
        >
          Export
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          size="small"
          @click="openAddDialog"
        >
          Add Partner
        </v-btn>
      </div>
    </div>

    <!-- Import Wizard -->
    <SharedCrmImportWizard
      v-model="showImportWizard"
      entity-label="Partners"
      table-name="marketing_partners"
      duplicate-check-field="contact_email"
      :entity-fields="partnerImportFields"
      @imported="refresh"
    />

    <!-- Stats Row -->
    <UiStatsRow
      :stats="[
        { value: summaryStats.total, label: 'Total Partners', color: 'primary' },
        { value: summaryStats.active, label: 'Active', color: 'success' },
        { value: summaryStats.prospects, label: 'Prospects', color: 'info' },
        { value: summaryStats.needsFollowup, label: 'Needs Follow-up', color: 'warning' },
        { value: summaryStats.inactive, label: 'Inactive', color: 'secondary' }
      ]"
      layout="5-col"
    />

    <!-- Filters -->
    <v-card class="mb-4" variant="outlined">
      <v-card-text class="py-3">
        <!-- Row 1: Type Filter Pills -->
        <div class="d-flex flex-wrap gap-2 mb-3">
          <v-chip
            v-for="(count, type) in statsByType"
            :key="type"
            :color="selectedType === type ? getTypeColor(type as string) : undefined"
            :variant="selectedType === type ? 'elevated' : 'outlined'"
            size="small"
            @click="selectedType = selectedType === type ? null : (type as string)"
          >
            {{ formatTypeName(type as string) }}
            <template #append>
              <v-avatar size="18" class="ml-1" :color="getTypeColor(type as string)">
                <span class="text-caption">{{ count }}</span>
              </v-avatar>
            </template>
          </v-chip>
        </div>

        <!-- Row 2: Primary Filters -->
        <v-row dense align="center">
          <v-col cols="12" md="4">
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
          <v-col cols="4" md="3">
            <v-select
              v-model="selectedType"
              :items="partnerTypes"
              label="Type"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="4" md="2">
            <v-select
              v-model="selectedStatus"
              :items="statusOptions"
              label="Status"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="4" md="3">
            <v-select
              v-model="selectedArea"
              :items="areaOptions"
              label="Area"
              variant="outlined"
              density="compact"
              hide-details
            />
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

    <!-- Partners Data Table (Referral CRM grid style) -->
    <v-card variant="outlined">
      <v-data-table-virtual
        :headers="tableHeaders"
        :items="scoredPartners"
        :loading="pending"
        hover
        height="calc(100vh - 340px)"
        @click:row="(_e: any, { item }: any) => handleItemClick(item)"
      >
        <template #item.priority="{ item }">
          <v-chip :color="getPriorityColor(item.priority)" size="x-small" variant="flat">
            {{ item.priority || 'Medium' }}
          </v-chip>
        </template>

        <template #item.name="{ item }">
          <div class="d-flex align-center py-2">
            <v-avatar :color="getPartnerTierColor(item.computed_tier)" size="36" class="mr-3">
              <span class="text-white text-caption font-weight-bold">{{ getPartnerTierLabel(item.computed_tier) }}</span>
            </v-avatar>
            <div>
              <div class="font-weight-medium">{{ item.name }}</div>
              <div class="text-caption text-grey">{{ formatTypeName(item.partner_type) }}</div>
            </div>
          </div>
        </template>

        <template #item.services_provided="{ item }">
          <v-chip v-if="item.services_provided" size="x-small" color="info" variant="tonal">
            {{ item.services_provided }}
          </v-chip>
          <span v-else class="text-grey">—</span>
        </template>

        <template #item.area="{ item }">
          <v-chip v-if="item.area" size="x-small" :color="item.area === 'Online/Remote/Out of Area' ? 'grey' : 'teal'" variant="tonal">
            {{ item.area }}
          </v-chip>
          <span v-else class="text-grey">—</span>
        </template>

        <template #item.address="{ item }">
          <span v-if="item.address" class="text-body-2">{{ item.address }}</span>
          <span v-else class="text-grey">—</span>
        </template>

        <template #item.contact_email="{ item }">
          <span v-if="item.contact_email" class="text-body-2">{{ item.contact_email }}</span>
          <span v-else class="text-grey">—</span>
        </template>

        <template #item.last_visit_date="{ item }">
          <div v-if="item.last_visit_date">
            {{ new Date(item.last_visit_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}
            <div v-if="computeVisitScore(item.last_visit_date) === 0" class="text-caption text-error">
              <v-icon size="10">mdi-alert</v-icon> Overdue
            </div>
          </div>
          <span v-else class="text-grey">Never</span>
        </template>

        <template #item.computed_score="{ item }">
          <div class="d-flex align-center" style="min-width: 80px;">
            <v-progress-linear
              :model-value="item.computed_score"
              :color="getScoreColor(item.computed_score)"
              height="8"
              rounded
              style="width: 60px;"
            />
            <span class="text-caption ml-2">{{ item.computed_score }}%</span>
          </div>
        </template>

        <template #item.actions="{ item }">
          <v-btn icon="mdi-eye" size="x-small" variant="text" title="View Profile" aria-label="View partner profile" @click.stop="handleItemClick(item)" />
          <v-btn icon="mdi-pencil" size="x-small" variant="text" title="Edit" aria-label="Edit partner" @click.stop="openEditDialog(item)" />
          <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" title="Delete" aria-label="Delete partner" @click.stop="handleDelete(item)" />
        </template>

        <template #no-data>
          <div class="text-center py-12">
            <v-icon size="64" color="grey-lighten-1">mdi-handshake-outline</v-icon>
            <div class="text-h6 mt-4">No contacts found</div>
            <div class="text-body-2 text-medium-emphasis">
              {{ searchQuery || selectedType || selectedStatus ? 'Try adjusting your filters' : 'Add your first partner to get started' }}
            </div>
            <v-btn
              v-if="!searchQuery && !selectedType && !selectedStatus"
              color="primary"
              class="mt-4"
              @click="openAddDialog"
            >
              Add Partner
            </v-btn>
          </div>
        </template>
      </v-data-table-virtual>
    </v-card>

    <!-- Add/Edit Dialog -->
    <v-dialog v-model="dialogOpen" max-width="700" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">{{ editingPartner ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
          {{ editingPartner ? 'Edit Partner' : 'Add Partner' }}
          <v-spacer />
          <v-btn icon variant="text" aria-label="Close" @click="dialogOpen = false">
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
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.facebook_url"
                label="Facebook URL"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-facebook"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.tiktok_handle"
                label="TikTok Handle"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-music-note"
              />
            </v-col>
            
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.address"
                label="Address"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.area"
                :items="areaEditOptions"
                label="Area"
                variant="outlined"
                density="compact"
                clearable
                prepend-inner-icon="mdi-map-marker"
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
          <v-btn icon variant="text" aria-label="Close" @click="profileDialogOpen = false">
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

        <v-card-text class="min-h-400 scrollable-60vh">
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
                    <v-chip v-if="selectedPartner.area" :color="selectedPartner.area === 'Online/Remote/Out of Area' ? 'grey' : 'teal'" variant="tonal" size="small">
                      <v-icon start size="16">mdi-map-marker</v-icon>
                      {{ selectedPartner.area }}
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
                    <v-list-item v-if="selectedPartner.facebook_url">
                      <template #prepend>
                        <v-icon size="small">mdi-facebook</v-icon>
                      </template>
                      <v-list-item-title>
                        <a :href="selectedPartner.facebook_url" target="_blank">{{ selectedPartner.facebook_url }}</a>
                      </v-list-item-title>
                    </v-list-item>
                    <v-list-item v-if="selectedPartner.tiktok_handle">
                      <template #prepend>
                        <v-icon size="small">mdi-music-note</v-icon>
                      </template>
                      <v-list-item-title>@{{ selectedPartner.tiktok_handle }}</v-list-item-title>
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
                      <v-btn icon variant="text" size="small" aria-label="Edit contact" @click="openEditContactDialog(contact)">
                        <v-icon size="small">mdi-pencil</v-icon>
                      </v-btn>
                      <v-btn icon variant="text" size="small" color="error" aria-label="Delete contact" @click="deleteContact(contact.id)">
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
                <!-- Computed Score & Tier -->
                <v-col cols="12">
                  <v-card variant="outlined" class="mb-4">
                    <v-card-text>
                      <div class="d-flex align-center justify-space-between mb-3">
                        <div class="text-subtitle-2">Computed Relationship Score</div>
                        <v-chip
                          :color="getPartnerTierColor(getPartnerTier(computeRelationshipScore(selectedPartner)))"
                          variant="elevated"
                          size="small"
                          class="font-weight-bold"
                        >
                          {{ getPartnerTier(computeRelationshipScore(selectedPartner)) }} Tier
                        </v-chip>
                      </div>
                      <div class="d-flex align-center">
                        <v-progress-linear
                          :model-value="computeRelationshipScore(selectedPartner)"
                          :color="getScoreColor(computeRelationshipScore(selectedPartner))"
                          height="24"
                          rounded
                        >
                          <template #default>
                            <strong>{{ computeRelationshipScore(selectedPartner) }}%</strong>
                          </template>
                        </v-progress-linear>
                      </div>
                      <div class="d-flex gap-4 mt-3 text-caption text-medium-emphasis">
                        <div>
                          <v-icon size="12">mdi-flag</v-icon>
                          Priority Score: {{ computePriorityScore(selectedPartner.priority) }}/50
                        </div>
                        <div>
                          <v-icon size="12">mdi-calendar</v-icon>
                          Visit Score: {{ computeVisitScore(selectedPartner.last_visit_date) }}/50
                          <span class="ml-1">(4mo / 8mo / 12mo thresholds)</span>
                        </div>
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>

                <v-col cols="12" md="6">
                  <v-card variant="outlined" class="mb-4">
                    <v-card-text>
                      <div class="text-subtitle-2 mb-3">Manual Relationship Score Override</div>
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

    <!-- Export Dialog -->
    <SharedCrmExportDialog
      v-model="showExportDialog"
      entity-label="Partners"
      :data="filteredPartners"
      :columns="exportColumns"
      filename="partners_export"
    />
  </div>
</template>
