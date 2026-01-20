<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'marketing-admin']
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { showSuccess, showError } = useToast()

// =====================================================
// TYPE DEFINITIONS
// =====================================================
interface Influencer {
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

interface InfluencerNote {
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

interface Campaign {
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

// =====================================================
// STATE
// =====================================================
const searchQuery = ref('')
const selectedTier = ref<string | null>(null)
const selectedStatus = ref<string | null>(null)
const selectedPlatform = ref<string | null>(null)
const selectedPriority = ref<string | null>(null)
const viewMode = ref<'list' | 'cards'>('cards')

// Dialog states
const addDialogOpen = ref(false)
const profileDialogOpen = ref(false)
const saving = ref(false)
const loadingProfile = ref(false)

// Selected data
const selectedInfluencer = ref<Influencer | null>(null)
const influencerNotes = ref<InfluencerNote[]>([])
const influencerCampaigns = ref<Campaign[]>([])
const profileTab = ref('overview')

// Note form
const newNoteContent = ref('')
const newNoteType = ref('general')

// =====================================================
// FILTER OPTIONS
// =====================================================
const tierOptions = [
  { title: 'All Tiers', value: null },
  { title: 'Nano (<10K)', value: 'nano' },
  { title: 'Micro (10K-50K)', value: 'micro' },
  { title: 'Macro (50K-500K)', value: 'macro' },
  { title: 'Mega (500K+)', value: 'mega' }
]

const statusOptions = [
  { title: 'All Statuses', value: null },
  { title: 'Active', value: 'active' },
  { title: 'Prospect', value: 'prospect' },
  { title: 'Inactive', value: 'inactive' },
  { title: 'Completed', value: 'completed' }
]

const statusEditOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Prospect', value: 'prospect' },
  { title: 'Inactive', value: 'inactive' },
  { title: 'Completed', value: 'completed' }
]

const platformOptions = [
  { title: 'All Platforms', value: null },
  { title: 'Instagram', value: 'IG' },
  { title: 'TikTok', value: 'TikTok' },
  { title: 'YouTube', value: 'YouTube' },
  { title: 'Facebook', value: 'Facebook' }
]

const priorityOptions = [
  { title: 'All Priorities', value: null },
  { title: 'High', value: 'high' },
  { title: 'Medium', value: 'medium' },
  { title: 'Low', value: 'low' }
]

const priorityEditOptions = [
  { title: 'High', value: 'high' },
  { title: 'Medium', value: 'medium' },
  { title: 'Low', value: 'low' }
]

const relationshipStatusOptions = [
  { title: 'New', value: 'new' },
  { title: 'Outreach', value: 'outreach' },
  { title: 'Negotiating', value: 'negotiating' },
  { title: 'Active Partner', value: 'active_partner' },
  { title: 'Dormant', value: 'dormant' },
  { title: 'Past Partner', value: 'past_partner' }
]

const collaborationTypeOptions = [
  { title: 'Gifted', value: 'gifted' },
  { title: 'Paid', value: 'paid' },
  { title: 'Affiliate', value: 'affiliate' },
  { title: 'Ambassador', value: 'ambassador' },
  { title: 'UGC Creator', value: 'ugc' },
  { title: 'Event', value: 'event' }
]

const compensationTypeOptions = [
  { title: 'Free Services', value: 'services' },
  { title: 'Flat Fee', value: 'flat_fee' },
  { title: 'Per Post', value: 'per_post' },
  { title: 'Commission', value: 'commission' },
  { title: 'Product/Gifts', value: 'product' },
  { title: 'Hybrid', value: 'hybrid' }
]

const nicheOptions = [
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
  { title: 'Other', value: 'other' }
]

const noteTypeOptions = [
  { title: 'General', value: 'general' },
  { title: 'Outreach', value: 'outreach' },
  { title: 'Call', value: 'call' },
  { title: 'Email', value: 'email' },
  { title: 'Meeting', value: 'meeting' },
  { title: 'Content Review', value: 'content_review' },
  { title: 'Payment', value: 'payment' },
  { title: 'Issue', value: 'issue' }
]

const petTypeOptions = [
  { title: 'Dog', value: 'dog' },
  { title: 'Cat', value: 'cat' },
  { title: 'Multiple', value: 'multiple' },
  { title: 'Exotic', value: 'exotic' },
  { title: 'None/Unknown', value: null }
]

// =====================================================
// FORM STATE
// =====================================================
const formData = ref({
  contact_name: '',
  pet_name: '',
  phone: '',
  email: '',
  status: 'prospect',
  promo_code: '',
  content_niche: '',
  location: '',
  bio: '',
  
  // Social
  instagram_handle: '',
  instagram_url: '',
  tiktok_handle: '',
  youtube_url: '',
  facebook_url: '',
  
  // Followers
  instagram_followers: null as number | null,
  tiktok_followers: null as number | null,
  youtube_subscribers: null as number | null,
  highest_platform: 'IG',
  
  // Engagement
  engagement_rate: null as number | null,
  avg_likes: null as number | null,
  avg_comments: null as number | null,
  
  // Pet info
  pet_type: null as string | null,
  pet_breed: '',
  pet_age: '',
  pet_instagram: '',
  
  // Audience
  audience_age_range: '',
  audience_location: '',
  
  // Collaboration
  collaboration_type: '',
  compensation_type: '',
  compensation_rate: null as number | null,
  
  // Content
  preferred_content_types: [] as string[],
  content_guidelines: '',
  
  // Agreement
  agreement_details: '',
  contract_start_date: '',
  contract_end_date: '',
  
  // Other
  notes: '',
  media_kit_url: '',
  source: '',
  tags: [] as string[]
})

const editingInfluencer = ref<Influencer | null>(null)

// =====================================================
// DATA FETCHING
// =====================================================
const { data: influencers, pending, refresh } = await useAsyncData('influencers', async () => {
  const { data, error } = await supabase
    .from('marketing_influencers')
    .select('*')
    .order('contact_name')
  
  if (error) throw error
  return data as Influencer[]
})

// =====================================================
// COMPUTED PROPERTIES
// =====================================================
const filteredInfluencers = computed(() => {
  let result = influencers.value || []
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(i =>
      i.contact_name.toLowerCase().includes(query) ||
      i.pet_name?.toLowerCase().includes(query) ||
      i.email?.toLowerCase().includes(query) ||
      i.instagram_handle?.toLowerCase().includes(query) ||
      i.tiktok_handle?.toLowerCase().includes(query) ||
      i.promo_code?.toLowerCase().includes(query) ||
      i.notes?.toLowerCase().includes(query)
    )
  }
  
  if (selectedTier.value) {
    result = result.filter(i => i.tier === selectedTier.value)
  }
  
  if (selectedStatus.value) {
    result = result.filter(i => i.status === selectedStatus.value)
  }
  
  if (selectedPlatform.value) {
    result = result.filter(i => i.highest_platform === selectedPlatform.value)
  }
  
  if (selectedPriority.value) {
    result = result.filter(i => i.priority === selectedPriority.value)
  }
  
  return result
})

const summaryStats = computed(() => {
  const all = influencers.value || []
  const totalFollowers = all.reduce((sum, i) => {
    const max = Math.max(
      i.instagram_followers || 0,
      i.tiktok_followers || 0,
      i.youtube_subscribers || 0,
      i.follower_count || 0
    )
    return sum + max
  }, 0)
  
  return {
    total: all.length,
    active: all.filter(i => i.status === 'active').length,
    prospects: all.filter(i => i.status === 'prospect').length,
    needsFollowup: all.filter(i => i.needs_followup).length,
    totalReach: totalFollowers,
    avgEngagement: all.reduce((sum, i) => sum + (i.engagement_rate || 0), 0) / (all.length || 1)
  }
})

const tierBreakdown = computed(() => {
  const all = influencers.value || []
  return {
    nano: all.filter(i => i.tier === 'nano').length,
    micro: all.filter(i => i.tier === 'micro').length,
    macro: all.filter(i => i.tier === 'macro').length,
    mega: all.filter(i => i.tier === 'mega').length
  }
})

// =====================================================
// HELPER FUNCTIONS
// =====================================================
function formatFollowers(count: number | null | undefined): string {
  if (!count) return '0'
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return count.toString()
}

function getMaxFollowers(influencer: Influencer): number {
  return Math.max(
    influencer.instagram_followers || 0,
    influencer.tiktok_followers || 0,
    influencer.youtube_subscribers || 0,
    influencer.follower_count || 0
  )
}

function getTierColor(tier: string | null): string {
  const colors: Record<string, string> = {
    nano: 'grey',
    micro: 'info',
    macro: 'success',
    mega: 'warning'
  }
  return colors[tier || ''] || 'grey'
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'success',
    prospect: 'info',
    inactive: 'grey',
    completed: 'warning'
  }
  return colors[status] || 'grey'
}

function getPlatformIcon(platform: string | null): string {
  const icons: Record<string, string> = {
    IG: 'mdi-instagram',
    Instagram: 'mdi-instagram',
    TikTok: 'mdi-music-note',
    YouTube: 'mdi-youtube',
    Facebook: 'mdi-facebook'
  }
  return icons[platform || ''] || 'mdi-account-star'
}

function getPlatformColor(platform: string | null): string {
  const colors: Record<string, string> = {
    IG: 'pink',
    Instagram: 'pink',
    TikTok: 'cyan',
    YouTube: 'red',
    Facebook: 'blue'
  }
  return colors[platform || ''] || 'secondary'
}

function getRelationshipScoreColor(score: number | null): string {
  if (!score) return 'grey'
  if (score >= 80) return 'success'
  if (score >= 60) return 'info'
  if (score >= 40) return 'warning'
  return 'error'
}

function getNoteTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    general: 'mdi-note-text',
    outreach: 'mdi-send',
    call: 'mdi-phone',
    email: 'mdi-email',
    meeting: 'mdi-account-group',
    content_review: 'mdi-image-check',
    payment: 'mdi-currency-usd',
    issue: 'mdi-alert-circle'
  }
  return icons[type] || 'mdi-note'
}

function getNoteTypeColor(type: string): string {
  const colors: Record<string, string> = {
    general: 'grey',
    outreach: 'primary',
    call: 'info',
    email: 'purple',
    meeting: 'success',
    content_review: 'warning',
    payment: 'teal',
    issue: 'error'
  }
  return colors[type] || 'grey'
}

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

// =====================================================
// CRUD OPERATIONS
// =====================================================
function openAddDialog() {
  editingInfluencer.value = null
  formData.value = {
    contact_name: '',
    pet_name: '',
    phone: '',
    email: '',
    status: 'prospect',
    promo_code: '',
    content_niche: '',
    location: '',
    bio: '',
    instagram_handle: '',
    instagram_url: '',
    tiktok_handle: '',
    youtube_url: '',
    facebook_url: '',
    instagram_followers: null,
    tiktok_followers: null,
    youtube_subscribers: null,
    highest_platform: 'IG',
    engagement_rate: null,
    avg_likes: null,
    avg_comments: null,
    pet_type: null,
    pet_breed: '',
    pet_age: '',
    pet_instagram: '',
    audience_age_range: '',
    audience_location: '',
    collaboration_type: '',
    compensation_type: '',
    compensation_rate: null,
    preferred_content_types: [],
    content_guidelines: '',
    agreement_details: '',
    contract_start_date: '',
    contract_end_date: '',
    notes: '',
    media_kit_url: '',
    source: '',
    tags: []
  }
  addDialogOpen.value = true
}

function openEditDialog(influencer: Influencer) {
  editingInfluencer.value = influencer
  formData.value = {
    contact_name: influencer.contact_name,
    pet_name: influencer.pet_name || '',
    phone: influencer.phone || '',
    email: influencer.email || '',
    status: influencer.status,
    promo_code: influencer.promo_code || '',
    content_niche: influencer.content_niche || '',
    location: influencer.location || '',
    bio: influencer.bio || '',
    instagram_handle: influencer.instagram_handle || '',
    instagram_url: influencer.instagram_url || '',
    tiktok_handle: influencer.tiktok_handle || '',
    youtube_url: influencer.youtube_url || '',
    facebook_url: influencer.facebook_url || '',
    instagram_followers: influencer.instagram_followers,
    tiktok_followers: influencer.tiktok_followers,
    youtube_subscribers: influencer.youtube_subscribers,
    highest_platform: influencer.highest_platform || 'IG',
    engagement_rate: influencer.engagement_rate,
    avg_likes: influencer.avg_likes,
    avg_comments: influencer.avg_comments,
    pet_type: influencer.pet_type,
    pet_breed: influencer.pet_breed || '',
    pet_age: influencer.pet_age || '',
    pet_instagram: influencer.pet_instagram || '',
    audience_age_range: influencer.audience_age_range || '',
    audience_location: influencer.audience_location || '',
    collaboration_type: influencer.collaboration_type || '',
    compensation_type: influencer.compensation_type || '',
    compensation_rate: influencer.compensation_rate,
    preferred_content_types: influencer.preferred_content_types || [],
    content_guidelines: influencer.content_guidelines || '',
    agreement_details: influencer.agreement_details || '',
    contract_start_date: influencer.contract_start_date || '',
    contract_end_date: influencer.contract_end_date || '',
    notes: influencer.notes || '',
    media_kit_url: influencer.media_kit_url || '',
    source: influencer.source || '',
    tags: influencer.tags || []
  }
  addDialogOpen.value = true
}

async function saveInfluencer() {
  if (!formData.value.contact_name) {
    showError('Contact name is required')
    return
  }
  
  saving.value = true
  
  const payload = {
    contact_name: formData.value.contact_name,
    pet_name: formData.value.pet_name || null,
    phone: formData.value.phone || null,
    email: formData.value.email || null,
    status: formData.value.status,
    promo_code: formData.value.promo_code || null,
    content_niche: formData.value.content_niche || null,
    location: formData.value.location || null,
    bio: formData.value.bio || null,
    instagram_handle: formData.value.instagram_handle || null,
    instagram_url: formData.value.instagram_url || null,
    tiktok_handle: formData.value.tiktok_handle || null,
    youtube_url: formData.value.youtube_url || null,
    facebook_url: formData.value.facebook_url || null,
    instagram_followers: formData.value.instagram_followers,
    tiktok_followers: formData.value.tiktok_followers,
    youtube_subscribers: formData.value.youtube_subscribers,
    highest_platform: formData.value.highest_platform || null,
    engagement_rate: formData.value.engagement_rate,
    avg_likes: formData.value.avg_likes,
    avg_comments: formData.value.avg_comments,
    pet_type: formData.value.pet_type,
    pet_breed: formData.value.pet_breed || null,
    pet_age: formData.value.pet_age || null,
    pet_instagram: formData.value.pet_instagram || null,
    audience_age_range: formData.value.audience_age_range || null,
    audience_location: formData.value.audience_location || null,
    collaboration_type: formData.value.collaboration_type || null,
    compensation_type: formData.value.compensation_type || null,
    compensation_rate: formData.value.compensation_rate,
    preferred_content_types: formData.value.preferred_content_types.length ? formData.value.preferred_content_types : null,
    content_guidelines: formData.value.content_guidelines || null,
    agreement_details: formData.value.agreement_details || null,
    contract_start_date: formData.value.contract_start_date || null,
    contract_end_date: formData.value.contract_end_date || null,
    notes: formData.value.notes || null,
    media_kit_url: formData.value.media_kit_url || null,
    source: formData.value.source || null,
    tags: formData.value.tags.length ? formData.value.tags : null
  }
  
  try {
    if (editingInfluencer.value) {
      const { error } = await supabase
        .from('marketing_influencers')
        .update(payload)
        .eq('id', editingInfluencer.value.id)
      
      if (error) throw error
      showSuccess('Influencer updated successfully')
    } else {
      const { error } = await supabase
        .from('marketing_influencers')
        .insert(payload)
      
      if (error) throw error
      showSuccess('Influencer added successfully')
    }
    
    addDialogOpen.value = false
    await refresh()
  } catch (err: any) {
    console.error('[Influencers] Save error:', err)
    showError('Failed to save influencer: ' + (err.message || 'Unknown error'))
  } finally {
    saving.value = false
  }
}

async function deleteInfluencer(id: string) {
  if (!confirm('Are you sure you want to delete this influencer?')) return
  
  const { error } = await supabase
    .from('marketing_influencers')
    .delete()
    .eq('id', id)
  
  if (error) {
    showError('Failed to delete influencer')
    return
  }
  
  showSuccess('Influencer deleted')
  await refresh()
}

// =====================================================
// PROFILE DIALOG
// =====================================================
async function openProfile(influencer: Influencer) {
  selectedInfluencer.value = influencer
  profileTab.value = 'overview'
  profileDialogOpen.value = true
  loadingProfile.value = true
  
  try {
    await Promise.all([
      loadInfluencerNotes(influencer.id),
      loadInfluencerCampaigns(influencer.id)
    ])
  } catch (error) {
    console.error('Error loading profile:', error)
  } finally {
    loadingProfile.value = false
  }
}

async function loadInfluencerNotes(influencerId: string) {
  const { data, error } = await supabase
    .from('influencer_notes')
    .select('*')
    .eq('influencer_id', influencerId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
  
  if (!error) {
    influencerNotes.value = data as InfluencerNote[]
  }
}

async function loadInfluencerCampaigns(influencerId: string) {
  const { data, error } = await supabase
    .from('influencer_campaigns')
    .select('*')
    .eq('influencer_id', influencerId)
    .order('created_at', { ascending: false })
  
  if (!error) {
    influencerCampaigns.value = data as Campaign[]
  }
}

async function addNote() {
  if (!selectedInfluencer.value || !newNoteContent.value.trim()) return
  
  const { error } = await supabase
    .from('influencer_notes')
    .insert({
      influencer_id: selectedInfluencer.value.id,
      note_type: newNoteType.value,
      content: newNoteContent.value.trim(),
      created_by: user.value?.id
    })
  
  if (error) {
    showError('Failed to add note')
    return
  }
  
  showSuccess('Note added')
  newNoteContent.value = ''
  newNoteType.value = 'general'
  await loadInfluencerNotes(selectedInfluencer.value.id)
}

async function deleteNote(noteId: string) {
  if (!confirm('Delete this note?')) return
  
  const { error } = await supabase
    .from('influencer_notes')
    .delete()
    .eq('id', noteId)
  
  if (error) {
    showError('Failed to delete note')
    return
  }
  
  showSuccess('Note deleted')
  if (selectedInfluencer.value) {
    await loadInfluencerNotes(selectedInfluencer.value.id)
  }
}

async function updateInfluencerField(field: string, value: any) {
  if (!selectedInfluencer.value) return
  
  const { error } = await supabase
    .from('marketing_influencers')
    .update({ [field]: value })
    .eq('id', selectedInfluencer.value.id)
  
  if (error) {
    showError('Failed to update')
    return
  }
  
  // Update local state
  (selectedInfluencer.value as any)[field] = value
  showSuccess('Updated')
  await refresh()
}
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap gap-3">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Influencer Management</h1>
        <p class="text-body-2 text-grey-darken-1">
          Track and manage influencer partnerships, campaigns, and performance
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn color="secondary" prepend-icon="mdi-plus" @click="openAddDialog">
          Add Influencer
        </v-btn>
      </div>
    </div>

    <!-- Stats Row -->
    <v-row class="mb-4">
      <v-col cols="6" md="2">
        <v-card variant="outlined" class="text-center pa-3">
          <div class="text-h5 font-weight-bold text-primary">{{ summaryStats.total }}</div>
          <div class="text-caption text-medium-emphasis">Total Influencers</div>
        </v-card>
      </v-col>
      <v-col cols="6" md="2">
        <v-card variant="outlined" class="text-center pa-3">
          <div class="text-h5 font-weight-bold text-success">{{ summaryStats.active }}</div>
          <div class="text-caption text-medium-emphasis">Active Partners</div>
        </v-card>
      </v-col>
      <v-col cols="6" md="2">
        <v-card variant="outlined" class="text-center pa-3">
          <div class="text-h5 font-weight-bold text-info">{{ summaryStats.prospects }}</div>
          <div class="text-caption text-medium-emphasis">Prospects</div>
        </v-card>
      </v-col>
      <v-col cols="6" md="2">
        <v-card variant="outlined" class="text-center pa-3">
          <div class="text-h5 font-weight-bold text-warning">{{ summaryStats.needsFollowup }}</div>
          <div class="text-caption text-medium-emphasis">Needs Follow-up</div>
        </v-card>
      </v-col>
      <v-col cols="6" md="2">
        <v-card variant="outlined" class="text-center pa-3">
          <div class="text-h5 font-weight-bold text-secondary">{{ formatFollowers(summaryStats.totalReach) }}</div>
          <div class="text-caption text-medium-emphasis">Total Reach</div>
        </v-card>
      </v-col>
      <v-col cols="6" md="2">
        <v-card variant="outlined" class="text-center pa-3">
          <div class="text-h5 font-weight-bold text-teal">{{ summaryStats.avgEngagement.toFixed(1) }}%</div>
          <div class="text-caption text-medium-emphasis">Avg Engagement</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Tier Breakdown -->
    <v-card variant="outlined" class="mb-4">
      <v-card-text class="py-2">
        <div class="d-flex align-center justify-space-between flex-wrap gap-2">
          <div class="d-flex gap-3">
            <v-chip
              :color="selectedTier === 'nano' ? 'grey' : undefined"
              :variant="selectedTier === 'nano' ? 'elevated' : 'outlined'"
              size="small"
              @click="selectedTier = selectedTier === 'nano' ? null : 'nano'"
            >
              <v-icon start size="16">mdi-account</v-icon>
              Nano: {{ tierBreakdown.nano }}
            </v-chip>
            <v-chip
              :color="selectedTier === 'micro' ? 'info' : undefined"
              :variant="selectedTier === 'micro' ? 'elevated' : 'outlined'"
              size="small"
              @click="selectedTier = selectedTier === 'micro' ? null : 'micro'"
            >
              <v-icon start size="16">mdi-account-group</v-icon>
              Micro: {{ tierBreakdown.micro }}
            </v-chip>
            <v-chip
              :color="selectedTier === 'macro' ? 'success' : undefined"
              :variant="selectedTier === 'macro' ? 'elevated' : 'outlined'"
              size="small"
              @click="selectedTier = selectedTier === 'macro' ? null : 'macro'"
            >
              <v-icon start size="16">mdi-account-multiple</v-icon>
              Macro: {{ tierBreakdown.macro }}
            </v-chip>
            <v-chip
              :color="selectedTier === 'mega' ? 'warning' : undefined"
              :variant="selectedTier === 'mega' ? 'elevated' : 'outlined'"
              size="small"
              @click="selectedTier = selectedTier === 'mega' ? null : 'mega'"
            >
              <v-icon start size="16">mdi-crown</v-icon>
              Mega: {{ tierBreakdown.mega }}
            </v-chip>
          </div>
          <div class="text-caption text-medium-emphasis">
            Showing {{ filteredInfluencers.length }} of {{ influencers?.length || 0 }} influencers
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Filters -->
    <v-card variant="outlined" class="mb-4">
      <v-card-text class="py-3">
        <v-row dense align="center">
          <v-col cols="12" md="4">
            <v-text-field
              v-model="searchQuery"
              prepend-inner-icon="mdi-magnify"
              placeholder="Search influencers..."
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="selectedStatus"
              :items="statusOptions"
              label="Status"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="selectedPlatform"
              :items="platformOptions"
              label="Platform"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="selectedPriority"
              :items="priorityOptions"
              label="Priority"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="6" md="2" class="d-flex justify-end">
            <v-btn-toggle v-model="viewMode" mandatory density="compact" color="secondary">
              <v-btn value="cards" size="small">
                <v-icon size="18">mdi-view-grid</v-icon>
              </v-btn>
              <v-btn value="list" size="small">
                <v-icon size="18">mdi-format-list-bulleted</v-icon>
              </v-btn>
            </v-btn-toggle>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Loading -->
    <v-progress-linear v-if="pending" indeterminate color="secondary" class="mb-4" />

    <!-- Card Grid View -->
    <v-row v-if="viewMode === 'cards' && filteredInfluencers.length > 0">
      <v-col
        v-for="influencer in filteredInfluencers"
        :key="influencer.id"
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
          @click="openProfile(influencer)"
        >
          <v-card-text class="text-center pb-2">
            <v-avatar :color="getPlatformColor(influencer.highest_platform)" size="72" class="mb-3">
              <v-icon color="white" size="32">{{ getPlatformIcon(influencer.highest_platform) }}</v-icon>
            </v-avatar>
            <h3 class="text-subtitle-1 font-weight-bold mb-1 text-truncate">
              {{ influencer.contact_name }}
            </h3>
            <p v-if="influencer.pet_name" class="text-caption text-grey mb-2">
              🐾 {{ influencer.pet_name }}
            </p>
            <div class="d-flex justify-center gap-1 mb-2">
              <v-chip :color="getStatusColor(influencer.status)" size="x-small" variant="flat">
                {{ influencer.status }}
              </v-chip>
              <v-chip :color="getTierColor(influencer.tier)" size="x-small" variant="tonal">
                {{ influencer.tier || 'unknown' }}
              </v-chip>
            </div>
            <div class="text-h6 font-weight-bold text-secondary">
              {{ formatFollowers(getMaxFollowers(influencer)) }}
            </div>
            <div class="text-caption text-medium-emphasis">followers</div>
          </v-card-text>
          
          <v-divider />
          
          <v-card-text class="py-2">
            <div class="d-flex flex-column gap-1 text-caption">
              <div v-if="influencer.instagram_handle" class="d-flex align-center gap-1">
                <v-icon size="14" color="pink">mdi-instagram</v-icon>
                <span>@{{ influencer.instagram_handle }}</span>
              </div>
              <div v-if="influencer.tiktok_handle" class="d-flex align-center gap-1">
                <v-icon size="14" color="cyan">mdi-music-note</v-icon>
                <span>@{{ influencer.tiktok_handle }}</span>
              </div>
              <div v-if="influencer.promo_code" class="d-flex align-center gap-1">
                <v-icon size="14" color="success">mdi-ticket-percent</v-icon>
                <span class="font-weight-medium">{{ influencer.promo_code }}</span>
              </div>
              <div v-if="influencer.engagement_rate" class="d-flex align-center gap-1">
                <v-icon size="14" color="warning">mdi-chart-line</v-icon>
                <span>{{ influencer.engagement_rate }}% engagement</span>
              </div>
            </div>
          </v-card-text>
          
          <v-card-actions class="px-4 pb-3">
            <v-chip v-if="influencer.needs_followup" size="x-small" color="warning" variant="tonal">
              <v-icon start size="12">mdi-clock-alert</v-icon>
              Follow-up
            </v-chip>
            <v-chip v-if="influencer.priority === 'high'" size="x-small" color="error" variant="tonal">
              High Priority
            </v-chip>
            <v-spacer />
            <v-btn icon size="x-small" variant="text" color="error" @click.stop="deleteInfluencer(influencer.id)">
              <v-icon size="16">mdi-delete</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- List View -->
    <v-card v-else-if="viewMode === 'list' && filteredInfluencers.length > 0" variant="outlined">
      <v-list lines="two">
        <template v-for="(influencer, index) in filteredInfluencers" :key="influencer.id">
          <v-divider v-if="index > 0" />
          <v-list-item @click="openProfile(influencer)">
            <template #prepend>
              <v-avatar :color="getPlatformColor(influencer.highest_platform)" size="48">
                <v-icon color="white" size="24">{{ getPlatformIcon(influencer.highest_platform) }}</v-icon>
              </v-avatar>
            </template>
            
            <v-list-item-title class="font-weight-medium">
              {{ influencer.contact_name }}
              <span v-if="influencer.pet_name" class="text-medium-emphasis ml-2">
                (🐾 {{ influencer.pet_name }})
              </span>
            </v-list-item-title>
            
            <v-list-item-subtitle>
              <div class="d-flex align-center flex-wrap gap-2 mt-1">
                <v-chip :color="getStatusColor(influencer.status)" size="x-small" variant="flat">
                  {{ influencer.status }}
                </v-chip>
                <v-chip :color="getTierColor(influencer.tier)" size="x-small" variant="tonal">
                  {{ formatFollowers(getMaxFollowers(influencer)) }} • {{ influencer.tier }}
                </v-chip>
                <span v-if="influencer.instagram_handle">
                  <v-icon size="12" color="pink">mdi-instagram</v-icon>
                  @{{ influencer.instagram_handle }}
                </span>
                <span v-if="influencer.promo_code" class="font-weight-medium text-success">
                  {{ influencer.promo_code }}
                </span>
              </div>
            </v-list-item-subtitle>

            <template #append>
              <div class="d-flex align-center gap-2">
                <v-chip v-if="influencer.needs_followup" size="x-small" color="warning" variant="tonal">
                  Follow-up
                </v-chip>
                <v-chip v-if="influencer.engagement_rate" size="x-small" variant="tonal">
                  {{ influencer.engagement_rate }}% eng
                </v-chip>
                <v-btn icon variant="text" size="small" color="error" @click.stop="deleteInfluencer(influencer.id)">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </div>
            </template>
          </v-list-item>
        </template>
      </v-list>
    </v-card>

    <!-- Empty State -->
    <v-card v-else class="text-center py-12" variant="outlined">
      <v-icon size="64" color="grey-lighten-1">mdi-account-star-outline</v-icon>
      <div class="text-h6 mt-4">No influencers found</div>
      <div class="text-body-2 text-medium-emphasis">
        {{ searchQuery || selectedTier || selectedStatus ? 'Try adjusting your filters' : 'Add your first influencer to get started' }}
      </div>
      <v-btn
        v-if="!searchQuery && !selectedTier && !selectedStatus"
        color="secondary"
        class="mt-4"
        @click="openAddDialog"
      >
        Add Influencer
      </v-btn>
    </v-card>

    <!-- Add/Edit Dialog -->
    <v-dialog v-model="addDialogOpen" max-width="900" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">{{ editingInfluencer ? 'mdi-pencil' : 'mdi-account-star' }}</v-icon>
          {{ editingInfluencer ? 'Edit Influencer' : 'Add Influencer' }}
          <v-spacer />
          <v-btn icon variant="text" @click="addDialogOpen = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        
        <v-divider />
        
        <v-card-text style="max-height: 70vh; overflow-y: auto;">
          <v-row>
            <!-- Basic Info -->
            <v-col cols="12">
              <div class="text-subtitle-2 text-medium-emphasis mb-2">Basic Information</div>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="formData.contact_name" label="Contact Name *" variant="outlined" required />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="formData.pet_name" label="Pet Name" variant="outlined" prepend-inner-icon="mdi-paw" />
            </v-col>
            <v-col cols="6" md="3">
              <v-select v-model="formData.status" :items="statusEditOptions" label="Status" variant="outlined" />
            </v-col>
            <v-col cols="6" md="3">
              <v-text-field v-model="formData.promo_code" label="Promo Code" variant="outlined" placeholder="e.g., SAWYER20" />
            </v-col>
            <v-col cols="12" md="3">
              <v-select v-model="formData.content_niche" :items="nicheOptions" label="Content Niche" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="formData.location" label="Location" variant="outlined" prepend-inner-icon="mdi-map-marker" />
            </v-col>

            <!-- Contact Info -->
            <v-col cols="12">
              <v-divider class="my-2" />
              <div class="text-subtitle-2 text-medium-emphasis mb-2">Contact Information</div>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="formData.phone" label="Phone" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="formData.email" label="Email" variant="outlined" density="compact" type="email" />
            </v-col>

            <!-- Social Media -->
            <v-col cols="12">
              <v-divider class="my-2" />
              <div class="text-subtitle-2 text-medium-emphasis mb-2">Social Media</div>
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="formData.instagram_handle" label="Instagram Handle" variant="outlined" density="compact" prepend-inner-icon="mdi-instagram" prefix="@" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model.number="formData.instagram_followers" label="IG Followers" variant="outlined" density="compact" type="number" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="formData.instagram_url" label="Instagram URL" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="formData.tiktok_handle" label="TikTok Handle" variant="outlined" density="compact" prefix="@" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model.number="formData.tiktok_followers" label="TikTok Followers" variant="outlined" density="compact" type="number" />
            </v-col>
            <v-col cols="12" md="4">
              <v-select v-model="formData.highest_platform" :items="['IG', 'TikTok', 'YouTube', 'Facebook']" label="Primary Platform" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="formData.youtube_url" label="YouTube URL" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model.number="formData.youtube_subscribers" label="YouTube Subscribers" variant="outlined" density="compact" type="number" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model.number="formData.engagement_rate" label="Engagement Rate %" variant="outlined" density="compact" type="number" step="0.1" />
            </v-col>

            <!-- Pet Info -->
            <v-col cols="12">
              <v-divider class="my-2" />
              <div class="text-subtitle-2 text-medium-emphasis mb-2">Pet Information</div>
            </v-col>
            <v-col cols="6" md="3">
              <v-select v-model="formData.pet_type" :items="petTypeOptions" label="Pet Type" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="6" md="3">
              <v-text-field v-model="formData.pet_breed" label="Pet Breed" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="6" md="3">
              <v-text-field v-model="formData.pet_age" label="Pet Age" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="6" md="3">
              <v-text-field v-model="formData.pet_instagram" label="Pet's Instagram" variant="outlined" density="compact" prefix="@" />
            </v-col>

            <!-- Collaboration -->
            <v-col cols="12">
              <v-divider class="my-2" />
              <div class="text-subtitle-2 text-medium-emphasis mb-2">Collaboration Details</div>
            </v-col>
            <v-col cols="6" md="3">
              <v-select v-model="formData.collaboration_type" :items="collaborationTypeOptions" label="Collaboration Type" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="6" md="3">
              <v-select v-model="formData.compensation_type" :items="compensationTypeOptions" label="Compensation Type" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="6" md="3">
              <v-text-field v-model.number="formData.compensation_rate" label="Rate ($)" variant="outlined" density="compact" type="number" prefix="$" />
            </v-col>
            <v-col cols="6" md="3">
              <v-text-field v-model="formData.source" label="Source/Referral" variant="outlined" density="compact" placeholder="How did you find them?" />
            </v-col>

            <!-- Agreement -->
            <v-col cols="12">
              <v-textarea v-model="formData.agreement_details" label="Agreement Details" variant="outlined" rows="3" placeholder="e.g., Collaboration Reel with promo code, 2 IG Stories..." />
            </v-col>

            <!-- Notes -->
            <v-col cols="12">
              <v-textarea v-model="formData.notes" label="Notes" variant="outlined" rows="2" />
            </v-col>
          </v-row>
        </v-card-text>
        
        <v-divider />
        
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="addDialogOpen = false" :disabled="saving">Cancel</v-btn>
          <v-btn color="secondary" :loading="saving" @click="saveInfluencer">
            {{ editingInfluencer ? 'Save Changes' : 'Add Influencer' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Profile Dialog -->
    <v-dialog v-model="profileDialogOpen" max-width="1000" scrollable>
      <v-card v-if="selectedInfluencer">
        <v-card-title class="d-flex align-center">
          <v-avatar :color="getPlatformColor(selectedInfluencer.highest_platform)" size="48" class="mr-3">
            <v-icon color="white" size="24">{{ getPlatformIcon(selectedInfluencer.highest_platform) }}</v-icon>
          </v-avatar>
          <div>
            <span class="text-h6">{{ selectedInfluencer.contact_name }}</span>
            <div class="text-caption text-medium-emphasis">
              {{ selectedInfluencer.pet_name ? `🐾 ${selectedInfluencer.pet_name}` : '' }}
              {{ formatFollowers(getMaxFollowers(selectedInfluencer)) }} followers
            </div>
          </div>
          <v-spacer />
          <v-chip :color="getStatusColor(selectedInfluencer.status)" size="small" class="mr-2">
            {{ selectedInfluencer.status }}
          </v-chip>
          <v-chip :color="getTierColor(selectedInfluencer.tier)" size="small" variant="tonal" class="mr-2">
            {{ selectedInfluencer.tier || 'unknown' }}
          </v-chip>
          <v-btn icon variant="text" @click="profileDialogOpen = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-divider />

        <v-progress-linear v-if="loadingProfile" indeterminate color="secondary" />

        <v-tabs v-model="profileTab" bg-color="transparent">
          <v-tab value="overview">Overview</v-tab>
          <v-tab value="social">Social & Metrics</v-tab>
          <v-tab value="notes">
            Notes
            <v-badge v-if="influencerNotes.length" :content="influencerNotes.length" color="secondary" inline class="ml-1" />
          </v-tab>
          <v-tab value="campaigns">
            Campaigns
            <v-badge v-if="influencerCampaigns.length" :content="influencerCampaigns.length" color="secondary" inline class="ml-1" />
          </v-tab>
          <v-tab value="relationship">Relationship</v-tab>
        </v-tabs>

        <v-divider />

        <v-card-text style="min-height: 400px; max-height: 60vh; overflow-y: auto;">
          <v-tabs-window v-model="profileTab">
            <!-- Overview Tab -->
            <v-tabs-window-item value="overview">
              <v-row>
                <v-col cols="12" md="6">
                  <v-list density="compact">
                    <v-list-subheader>Contact Information</v-list-subheader>
                    <v-list-item v-if="selectedInfluencer.email">
                      <template #prepend><v-icon size="small">mdi-email</v-icon></template>
                      <v-list-item-title>{{ selectedInfluencer.email }}</v-list-item-title>
                    </v-list-item>
                    <v-list-item v-if="selectedInfluencer.phone">
                      <template #prepend><v-icon size="small">mdi-phone</v-icon></template>
                      <v-list-item-title>{{ selectedInfluencer.phone }}</v-list-item-title>
                    </v-list-item>
                    <v-list-item v-if="selectedInfluencer.location">
                      <template #prepend><v-icon size="small">mdi-map-marker</v-icon></template>
                      <v-list-item-title>{{ selectedInfluencer.location }}</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-col>
                <v-col cols="12" md="6">
                  <v-list density="compact">
                    <v-list-subheader>Pet Information</v-list-subheader>
                    <v-list-item v-if="selectedInfluencer.pet_name">
                      <template #prepend><v-icon size="small">mdi-paw</v-icon></template>
                      <v-list-item-title>{{ selectedInfluencer.pet_name }}</v-list-item-title>
                      <v-list-item-subtitle>
                        {{ [selectedInfluencer.pet_breed, selectedInfluencer.pet_age].filter(Boolean).join(' • ') }}
                      </v-list-item-subtitle>
                    </v-list-item>
                    <v-list-item v-if="selectedInfluencer.pet_instagram">
                      <template #prepend><v-icon size="small" color="pink">mdi-instagram</v-icon></template>
                      <v-list-item-title>@{{ selectedInfluencer.pet_instagram }}</v-list-item-title>
                      <v-list-item-subtitle>Pet's Instagram</v-list-item-subtitle>
                    </v-list-item>
                  </v-list>
                </v-col>
                <v-col v-if="selectedInfluencer.promo_code" cols="12">
                  <v-alert type="success" variant="tonal" density="compact">
                    <strong>Promo Code:</strong> {{ selectedInfluencer.promo_code }}
                  </v-alert>
                </v-col>
                <v-col v-if="selectedInfluencer.agreement_details" cols="12">
                  <div class="text-subtitle-2 mb-1">Agreement Details</div>
                  <p class="text-body-2">{{ selectedInfluencer.agreement_details }}</p>
                </v-col>
                <v-col v-if="selectedInfluencer.notes" cols="12">
                  <div class="text-subtitle-2 mb-1">Notes</div>
                  <p class="text-body-2">{{ selectedInfluencer.notes }}</p>
                </v-col>
              </v-row>
            </v-tabs-window-item>

            <!-- Social & Metrics Tab -->
            <v-tabs-window-item value="social">
              <v-row>
                <v-col cols="12" md="6">
                  <v-card variant="outlined">
                    <v-card-text>
                      <div class="text-subtitle-2 mb-3">Platform Breakdown</div>
                      <v-list density="compact">
                        <v-list-item v-if="selectedInfluencer.instagram_followers || selectedInfluencer.instagram_handle">
                          <template #prepend>
                            <v-avatar color="pink" size="32"><v-icon size="18" color="white">mdi-instagram</v-icon></v-avatar>
                          </template>
                          <v-list-item-title>{{ formatFollowers(selectedInfluencer.instagram_followers) }} followers</v-list-item-title>
                          <v-list-item-subtitle v-if="selectedInfluencer.instagram_handle">@{{ selectedInfluencer.instagram_handle }}</v-list-item-subtitle>
                        </v-list-item>
                        <v-list-item v-if="selectedInfluencer.tiktok_followers || selectedInfluencer.tiktok_handle">
                          <template #prepend>
                            <v-avatar color="cyan" size="32"><v-icon size="18" color="white">mdi-music-note</v-icon></v-avatar>
                          </template>
                          <v-list-item-title>{{ formatFollowers(selectedInfluencer.tiktok_followers) }} followers</v-list-item-title>
                          <v-list-item-subtitle v-if="selectedInfluencer.tiktok_handle">@{{ selectedInfluencer.tiktok_handle }}</v-list-item-subtitle>
                        </v-list-item>
                        <v-list-item v-if="selectedInfluencer.youtube_subscribers">
                          <template #prepend>
                            <v-avatar color="red" size="32"><v-icon size="18" color="white">mdi-youtube</v-icon></v-avatar>
                          </template>
                          <v-list-item-title>{{ formatFollowers(selectedInfluencer.youtube_subscribers) }} subscribers</v-list-item-title>
                        </v-list-item>
                      </v-list>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="12" md="6">
                  <v-card variant="outlined">
                    <v-card-text>
                      <div class="text-subtitle-2 mb-3">Engagement Metrics</div>
                      <div v-if="selectedInfluencer.engagement_rate" class="mb-3">
                        <div class="text-caption text-medium-emphasis">Engagement Rate</div>
                        <div class="text-h5 font-weight-bold text-success">{{ selectedInfluencer.engagement_rate }}%</div>
                      </div>
                      <v-row dense>
                        <v-col v-if="selectedInfluencer.avg_likes" cols="4">
                          <div class="text-caption text-medium-emphasis">Avg Likes</div>
                          <div class="font-weight-bold">{{ formatFollowers(selectedInfluencer.avg_likes) }}</div>
                        </v-col>
                        <v-col v-if="selectedInfluencer.avg_comments" cols="4">
                          <div class="text-caption text-medium-emphasis">Avg Comments</div>
                          <div class="font-weight-bold">{{ formatFollowers(selectedInfluencer.avg_comments) }}</div>
                        </v-col>
                        <v-col v-if="selectedInfluencer.avg_views" cols="4">
                          <div class="text-caption text-medium-emphasis">Avg Views</div>
                          <div class="font-weight-bold">{{ formatFollowers(selectedInfluencer.avg_views) }}</div>
                        </v-col>
                      </v-row>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="12">
                  <v-card variant="outlined">
                    <v-card-text>
                      <div class="text-subtitle-2 mb-3">Content Performance</div>
                      <v-row dense>
                        <v-col cols="4" class="text-center">
                          <div class="text-h4 font-weight-bold text-primary">{{ selectedInfluencer.posts_completed || 0 }}</div>
                          <div class="text-caption">Posts</div>
                        </v-col>
                        <v-col cols="4" class="text-center">
                          <div class="text-h4 font-weight-bold text-secondary">{{ selectedInfluencer.stories_completed || 0 }}</div>
                          <div class="text-caption">Stories</div>
                        </v-col>
                        <v-col cols="4" class="text-center">
                          <div class="text-h4 font-weight-bold text-warning">{{ selectedInfluencer.reels_completed || 0 }}</div>
                          <div class="text-caption">Reels</div>
                        </v-col>
                      </v-row>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </v-tabs-window-item>

            <!-- Notes Tab -->
            <v-tabs-window-item value="notes">
              <v-card variant="outlined" class="mb-4">
                <v-card-text>
                  <v-row dense>
                    <v-col cols="12" md="3">
                      <v-select v-model="newNoteType" :items="noteTypeOptions" label="Note Type" variant="outlined" density="compact" hide-details />
                    </v-col>
                    <v-col cols="12" md="7">
                      <v-textarea v-model="newNoteContent" label="Add a note..." variant="outlined" density="compact" rows="2" hide-details />
                    </v-col>
                    <v-col cols="12" md="2" class="d-flex align-center">
                      <v-btn color="secondary" :disabled="!newNoteContent.trim()" block @click="addNote">Add</v-btn>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>

              <div v-if="influencerNotes.length === 0" class="text-center py-8">
                <v-icon size="48" color="grey-lighten-1">mdi-note-text-outline</v-icon>
                <div class="text-body-2 text-medium-emphasis mt-2">No notes yet</div>
              </div>

              <v-list v-else lines="three" class="pa-0">
                <template v-for="(note, index) in influencerNotes" :key="note.id">
                  <v-list-item>
                    <template #prepend>
                      <v-avatar size="36" :color="getNoteTypeColor(note.note_type)" variant="tonal">
                        <v-icon size="small">{{ getNoteTypeIcon(note.note_type) }}</v-icon>
                      </v-avatar>
                    </template>
                    <v-list-item-title class="d-flex align-center">
                      <v-chip size="x-small" :color="getNoteTypeColor(note.note_type)" class="mr-2">{{ note.note_type }}</v-chip>
                      <span class="text-caption text-medium-emphasis">{{ formatRelativeDate(note.created_at) }}</span>
                    </v-list-item-title>
                    <v-list-item-subtitle class="text-wrap mt-1">{{ note.content }}</v-list-item-subtitle>
                    <template #append>
                      <v-btn icon variant="text" size="small" color="error" @click="deleteNote(note.id)">
                        <v-icon size="small">mdi-delete</v-icon>
                      </v-btn>
                    </template>
                  </v-list-item>
                  <v-divider v-if="index < influencerNotes.length - 1" />
                </template>
              </v-list>
            </v-tabs-window-item>

            <!-- Campaigns Tab -->
            <v-tabs-window-item value="campaigns">
              <div v-if="influencerCampaigns.length === 0" class="text-center py-8">
                <v-icon size="48" color="grey-lighten-1">mdi-bullhorn-outline</v-icon>
                <div class="text-body-2 text-medium-emphasis mt-2">No campaigns yet</div>
                <div class="text-caption text-medium-emphasis">Campaign tracking coming soon</div>
              </div>

              <v-list v-else>
                <v-list-item v-for="campaign in influencerCampaigns" :key="campaign.id">
                  <v-list-item-title>{{ campaign.campaign_name }}</v-list-item-title>
                  <v-list-item-subtitle>{{ campaign.status }} • {{ campaign.campaign_type }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-tabs-window-item>

            <!-- Relationship Tab -->
            <v-tabs-window-item value="relationship">
              <v-row>
                <v-col cols="12" md="6">
                  <v-card variant="outlined" class="mb-4">
                    <v-card-text>
                      <div class="text-subtitle-2 mb-3">Relationship Score</div>
                      <v-progress-linear
                        :model-value="selectedInfluencer.relationship_score || 50"
                        :color="getRelationshipScoreColor(selectedInfluencer.relationship_score)"
                        height="24"
                        rounded
                      >
                        <template #default><strong>{{ selectedInfluencer.relationship_score || 50 }}%</strong></template>
                      </v-progress-linear>
                      <v-slider
                        :model-value="selectedInfluencer.relationship_score || 50"
                        min="0" max="100" step="5"
                        class="mt-4"
                        hide-details
                        @update:model-value="updateInfluencerField('relationship_score', $event)"
                      />
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="12" md="6">
                  <v-select
                    :model-value="selectedInfluencer.relationship_status"
                    :items="relationshipStatusOptions"
                    label="Relationship Status"
                    variant="outlined"
                    density="compact"
                    class="mb-4"
                    @update:model-value="updateInfluencerField('relationship_status', $event)"
                  />
                  <v-select
                    :model-value="selectedInfluencer.priority"
                    :items="priorityEditOptions"
                    label="Priority"
                    variant="outlined"
                    density="compact"
                    @update:model-value="updateInfluencerField('priority', $event)"
                  />
                </v-col>
                <v-col cols="12">
                  <v-divider class="my-2" />
                  <div class="text-subtitle-2 mb-3">Follow-up Tracking</div>
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    :model-value="selectedInfluencer.last_contact_date"
                    label="Last Contact Date"
                    type="date"
                    variant="outlined"
                    density="compact"
                    @update:model-value="updateInfluencerField('last_contact_date', $event)"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    :model-value="selectedInfluencer.next_followup_date"
                    label="Next Follow-up Date"
                    type="date"
                    variant="outlined"
                    density="compact"
                    @update:model-value="updateInfluencerField('next_followup_date', $event)"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-switch
                    :model-value="selectedInfluencer.needs_followup"
                    label="Needs Follow-up"
                    color="warning"
                    hide-details
                    @update:model-value="updateInfluencerField('needs_followup', $event)"
                  />
                </v-col>
              </v-row>
            </v-tabs-window-item>
          </v-tabs-window>
        </v-card-text>

        <v-divider />

        <v-card-actions>
          <v-btn variant="text" prepend-icon="mdi-pencil" @click="profileDialogOpen = false; openEditDialog(selectedInfluencer)">
            Edit Influencer
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="profileDialogOpen = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
