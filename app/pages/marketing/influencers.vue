<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const supabase = useSupabaseClient()
const route = useRoute()

// Type definitions
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
const selectedStatus = ref<string | null>(null)
const sortBy = ref<'followers' | 'name' | 'recent'>('followers')

const statusOptions = [
  { title: 'All Statuses', value: null },
  { title: 'Active', value: 'active' },
  { title: 'Prospect', value: 'prospect' },
  { title: 'Inactive', value: 'inactive' },
  { title: 'Completed', value: 'completed' }
]

// Fetch influencers
const { data: influencers, pending, refresh } = await useAsyncData('influencers', async () => {
  const { data, error } = await supabase
    .from('marketing_influencers')
    .select('*')
    .order('follower_count', { ascending: false, nullsFirst: false })
  
  if (error) throw error
  return data as Influencer[]
})

// Filtered and sorted influencers
const filteredInfluencers = computed(() => {
  let result = influencers.value || []
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(i => 
      i.contact_name.toLowerCase().includes(query) ||
      i.pet_name?.toLowerCase().includes(query) ||
      i.instagram_handle?.toLowerCase().includes(query) ||
      i.promo_code?.toLowerCase().includes(query)
    )
  }
  
  if (selectedStatus.value) {
    result = result.filter(i => i.status === selectedStatus.value)
  }
  
  // Sort
  if (sortBy.value === 'followers') {
    result = [...result].sort((a, b) => (b.follower_count || 0) - (a.follower_count || 0))
  } else if (sortBy.value === 'name') {
    result = [...result].sort((a, b) => a.contact_name.localeCompare(b.contact_name))
  } else if (sortBy.value === 'recent') {
    result = [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }
  
  return result
})

// Stats
const stats = computed(() => ({
  total: influencers.value?.length || 0,
  active: influencers.value?.filter(i => i.status === 'active').length || 0,
  totalReach: influencers.value?.reduce((sum, i) => sum + (i.follower_count || 0), 0) || 0,
  withPromoCodes: influencers.value?.filter(i => i.promo_code).length || 0
}))

// Dialog state
const dialogOpen = ref(false)
const editingInfluencer = ref<Influencer | null>(null)
const formData = ref({
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

onMounted(() => {
  if (route.query.action === 'add') {
    openAddDialog()
  }
})

function openAddDialog() {
  editingInfluencer.value = null
  formData.value = {
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
  dialogOpen.value = true
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
  dialogOpen.value = true
}

async function saveInfluencer() {
  const payload = {
    contact_name: formData.value.contact_name,
    pet_name: formData.value.pet_name || null,
    phone: formData.value.phone || null,
    email: formData.value.email || null,
    status: formData.value.status,
    promo_code: formData.value.promo_code || null,
    instagram_handle: formData.value.instagram_handle || null,
    instagram_url: formData.value.instagram_url || null,
    facebook_url: formData.value.facebook_url || null,
    tiktok_handle: formData.value.tiktok_handle || null,
    youtube_url: formData.value.youtube_url || null,
    follower_count: formData.value.follower_count,
    highest_platform: formData.value.highest_platform || null,
    location: formData.value.location || null,
    agreement_details: formData.value.agreement_details || null,
    notes: formData.value.notes || null
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
  
  dialogOpen.value = false
  refresh()
}

async function deleteInfluencer(id: string) {
  if (!confirm('Are you sure you want to delete this influencer?')) return
  
  await supabase
    .from('marketing_influencers')
    .delete()
    .eq('id', id)
  
  refresh()
}

function formatFollowers(count: number | null): string {
  if (!count) return '—'
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`
  return count.toString()
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'success',
    prospect: 'info',
    inactive: 'grey',
    completed: 'primary'
  }
  return colors[status] || 'grey'
}

function getPlatformIcon(platform: string | null): string {
  const icons: Record<string, string> = {
    IG: 'mdi-instagram',
    Instagram: 'mdi-instagram',
    TikTok: 'mdi-music-note',
    YouTube: 'mdi-youtube',
    Facebook: 'mdi-facebook',
    Twitter: 'mdi-twitter'
  }
  return icons[platform || ''] || 'mdi-account-star'
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
        <h1 class="text-h4 font-weight-bold">Influencer Roster Hub</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Manage social media influencer collaborations
        </p>
      </div>
      <v-spacer />
      <v-btn
        color="secondary"
        prepend-icon="mdi-account-plus"
        @click="openAddDialog"
      >
        Add Influencer
      </v-btn>
    </div>

    <!-- Stats -->
    <v-row class="mb-4">
      <v-col cols="6" sm="3">
        <v-card variant="tonal" color="primary">
          <v-card-text class="text-center">
            <div class="text-h4 font-weight-bold">{{ stats.total }}</div>
            <div class="text-caption">Total Influencers</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card variant="tonal" color="success">
          <v-card-text class="text-center">
            <div class="text-h4 font-weight-bold">{{ stats.active }}</div>
            <div class="text-caption">Active</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card variant="tonal" color="secondary">
          <v-card-text class="text-center">
            <div class="text-h4 font-weight-bold">{{ formatFollowers(stats.totalReach) }}</div>
            <div class="text-caption">Total Reach</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card variant="tonal" color="warning">
          <v-card-text class="text-center">
            <div class="text-h4 font-weight-bold">{{ stats.withPromoCodes }}</div>
            <div class="text-caption">With Promo Codes</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filters -->
    <v-card class="mb-4">
      <v-card-text>
        <v-row dense align="center">
          <v-col cols="12" md="5">
            <v-text-field
              v-model="searchQuery"
              label="Search by name, pet, handle, or promo code..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="6" md="3">
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
              v-model="sortBy"
              :items="[
                { title: 'Top Followers', value: 'followers' },
                { title: 'Name A-Z', value: 'name' },
                { title: 'Recently Added', value: 'recent' }
              ]"
              label="Sort By"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="2" class="text-right">
            <v-chip color="primary" variant="tonal">
              {{ filteredInfluencers.length }} Results
            </v-chip>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Influencer Cards Grid -->
    <v-progress-linear v-if="pending" indeterminate color="secondary" class="mb-4" />
    
    <v-row v-if="filteredInfluencers.length > 0">
      <v-col
        v-for="influencer in filteredInfluencers"
        :key="influencer.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card class="h-100 influencer-card" hover @click="openEditDialog(influencer)">
          <!-- Header with follower count -->
          <div class="influencer-header pa-4 text-center">
            <v-avatar size="64" color="secondary" class="mb-2">
              <v-icon size="32" color="white">{{ getPlatformIcon(influencer.highest_platform) }}</v-icon>
            </v-avatar>
            <h3 class="text-h6">{{ influencer.contact_name }}</h3>
            <div v-if="influencer.pet_name" class="text-body-2 text-medium-emphasis">
              🐕 {{ influencer.pet_name }}
            </div>
          </div>
          
          <!-- Follower Count Badge -->
          <div class="text-center mt-n2 mb-2">
            <v-chip
              v-if="influencer.follower_count"
              color="secondary"
              size="large"
              class="font-weight-bold"
            >
              {{ formatFollowers(influencer.follower_count) }} followers
            </v-chip>
            <v-chip v-else size="small" variant="outlined">
              Followers unknown
            </v-chip>
          </div>
          
          <v-divider />
          
          <v-card-text class="pt-3">
            <!-- Status & Promo Code -->
            <div class="d-flex align-center gap-2 mb-3">
              <v-chip size="small" :color="getStatusColor(influencer.status)" variant="flat">
                {{ influencer.status }}
              </v-chip>
              <v-chip v-if="influencer.promo_code" size="small" color="warning" variant="tonal">
                {{ influencer.promo_code }}
              </v-chip>
            </div>
            
            <!-- Social Links -->
            <div class="d-flex gap-1 mb-3">
              <v-btn
                v-if="influencer.instagram_url || influencer.instagram_handle"
                icon
                size="small"
                variant="tonal"
                color="pink"
                :href="influencer.instagram_url || `https://instagram.com/${influencer.instagram_handle}`"
                target="_blank"
                @click.stop
              >
                <v-icon>mdi-instagram</v-icon>
              </v-btn>
              <v-btn
                v-if="influencer.tiktok_handle"
                icon
                size="small"
                variant="tonal"
                color="grey-darken-3"
                target="_blank"
                @click.stop
              >
                <v-icon>mdi-music-note</v-icon>
              </v-btn>
              <v-btn
                v-if="influencer.youtube_url"
                icon
                size="small"
                variant="tonal"
                color="red"
                :href="influencer.youtube_url"
                target="_blank"
                @click.stop
              >
                <v-icon>mdi-youtube</v-icon>
              </v-btn>
              <v-btn
                v-if="influencer.facebook_url"
                icon
                size="small"
                variant="tonal"
                color="blue"
                :href="influencer.facebook_url"
                target="_blank"
                @click.stop
              >
                <v-icon>mdi-facebook</v-icon>
              </v-btn>
            </div>
            
            <!-- Location -->
            <div v-if="influencer.location" class="text-caption text-medium-emphasis mb-2">
              <v-icon size="x-small">mdi-map-marker</v-icon>
              {{ influencer.location }}
            </div>
            
            <!-- Content Stats -->
            <div class="d-flex justify-space-around text-center">
              <div>
                <div class="text-h6">{{ influencer.posts_completed || 0 }}</div>
                <div class="text-caption text-medium-emphasis">Posts</div>
              </div>
              <div>
                <div class="text-h6">{{ influencer.stories_completed || 0 }}</div>
                <div class="text-caption text-medium-emphasis">Stories</div>
              </div>
              <div>
                <div class="text-h6">{{ influencer.reels_completed || 0 }}</div>
                <div class="text-caption text-medium-emphasis">Reels</div>
              </div>
            </div>
          </v-card-text>
          
          <v-card-actions>
            <v-btn
              v-if="influencer.email"
              size="small"
              variant="text"
              :href="`mailto:${influencer.email}`"
              @click.stop
            >
              <v-icon start>mdi-email</v-icon>
              Contact
            </v-btn>
            <v-spacer />
            <v-btn
              icon
              size="small"
              variant="text"
              color="error"
              @click.stop="deleteInfluencer(influencer.id)"
            >
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-card v-else class="text-center py-12">
      <v-icon size="64" color="grey-lighten-1">mdi-star-circle-outline</v-icon>
      <div class="text-h6 mt-4">No influencers found</div>
      <div class="text-body-2 text-medium-emphasis">
        {{ searchQuery || selectedStatus ? 'Try adjusting your filters' : 'Add your first influencer to get started' }}
      </div>
      <v-btn
        v-if="!searchQuery && !selectedStatus"
        color="secondary"
        class="mt-4"
        @click="openAddDialog"
      >
        Add Influencer
      </v-btn>
    </v-card>

    <!-- Add/Edit Dialog -->
    <v-dialog v-model="dialogOpen" max-width="700" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">{{ editingInfluencer ? 'mdi-pencil' : 'mdi-account-plus' }}</v-icon>
          {{ editingInfluencer ? 'Edit Influencer' : 'Add Influencer' }}
          <v-spacer />
          <v-btn icon variant="text" @click="dialogOpen = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        
        <v-divider />
        
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.contact_name"
                label="Contact Name *"
                variant="outlined"
                required
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.pet_name"
                label="Pet Name"
                variant="outlined"
                prepend-inner-icon="mdi-paw"
              />
            </v-col>
            
            <v-col cols="6" md="4">
              <v-select
                v-model="formData.status"
                :items="statusOptions.filter(s => s.value !== null)"
                label="Status *"
                variant="outlined"
              />
            </v-col>
            <v-col cols="6" md="4">
              <v-text-field
                v-model="formData.promo_code"
                label="Promo Code"
                variant="outlined"
                placeholder="e.g., SAWYER20"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.location"
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
                v-model="formData.phone"
                label="Phone"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.email"
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
                v-model="formData.instagram_handle"
                label="Instagram Handle"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-instagram"
                prefix="@"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.instagram_url"
                label="Instagram URL"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.tiktok_handle"
                label="TikTok Handle"
                variant="outlined"
                density="compact"
                prefix="@"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.youtube_url"
                label="YouTube URL"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.facebook_url"
                label="Facebook URL"
                variant="outlined"
                density="compact"
              />
            </v-col>
            
            <v-col cols="6" md="4">
              <v-text-field
                v-model.number="formData.follower_count"
                label="Follower Count"
                variant="outlined"
                density="compact"
                type="number"
              />
            </v-col>
            <v-col cols="6" md="4">
              <v-select
                v-model="formData.highest_platform"
                :items="['IG', 'TikTok', 'YouTube', 'Facebook', 'Twitter']"
                label="Primary Platform"
                variant="outlined"
                density="compact"
              />
            </v-col>
            
            <v-col cols="12">
              <v-textarea
                v-model="formData.agreement_details"
                label="Agreement Details"
                variant="outlined"
                rows="3"
                placeholder="e.g., Collaboration Reel with promo code, 2 IG Stories, Green Dog Experience filming..."
              />
            </v-col>
            
            <v-col cols="12">
              <v-textarea
                v-model="formData.notes"
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
          <v-btn variant="text" @click="dialogOpen = false">Cancel</v-btn>
          <v-btn color="secondary" @click="saveInfluencer">
            {{ editingInfluencer ? 'Save Changes' : 'Add Influencer' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.influencer-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.influencer-card:hover {
  transform: translateY(-4px);
}

.influencer-header {
  background: linear-gradient(135deg, rgba(var(--v-theme-secondary), 0.1), rgba(var(--v-theme-primary), 0.05));
}
</style>
