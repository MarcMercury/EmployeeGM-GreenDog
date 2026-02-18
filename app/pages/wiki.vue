<template>
  <div class="wiki-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Green Dog Wiki</h1>
        <p class="text-body-1 text-grey-darken-1">
          AI-powered knowledge base — search company policies, medical info, and more
        </p>
      </div>
    </div>

    <!-- Search Section -->
    <v-card rounded="lg" class="mb-6 pa-4 text-center" flat>
      <p class="text-body-2 text-grey-darken-1 mb-3">Search resources, company policies, medical knowledge, procedures, and more</p>
      <v-text-field
        v-model="searchQuery"
        placeholder="Search..."
        variant="outlined"
        prepend-inner-icon="mdi-magnify"
        density="comfortable"
        class="search-field mx-auto mb-3"
        style="max-width: 600px;"
        @keyup.enter="performSearch('both')"
        clearable
        hide-details
      />
      <v-btn color="primary" size="large" @click="performSearch('both')" :loading="searching || aiLoading">
        <v-icon start>mdi-magnify</v-icon>
        Search
      </v-btn>
    </v-card>

    <!-- Zone 1: Resources -->
    <div class="mb-6">
      <h3 class="text-subtitle-1 font-weight-bold mb-3">Resources</h3>
      <v-row>
        <v-col v-for="resource in resourceButtons" :key="resource.id" cols="6" sm="4" md="3">
          <v-card
            variant="outlined"
            rounded="lg"
            class="category-card text-center pa-4"
            @click="navigateToResource(resource)"
          >
            <v-icon :color="resource.color" size="32" class="mb-2">{{ resource.icon }}</v-icon>
            <div class="text-caption font-weight-medium">{{ resource.name }}</div>
          </v-card>
        </v-col>
      </v-row>
    </div>


    <!-- Internal Document Results -->
    <template v-if="internalResults.length > 0">
      <div class="d-flex align-center justify-space-between mb-3">
        <h3 class="text-subtitle-1 font-weight-bold">
          <v-icon color="success" size="20" class="mr-1">mdi-check-circle</v-icon>
          Internal Results
          <v-chip size="x-small" variant="tonal" color="success" class="ml-2">{{ internalResults.length }} found</v-chip>
        </h3>
        <v-btn v-if="searchResults.length > 0" variant="text" size="small" @click="clearResults">Clear</v-btn>
      </div>
      <v-row class="mb-4">
        <v-col v-for="result in internalResults" :key="result.id" cols="12" md="6">
          <v-card rounded="lg" class="result-card h-100" @click="openResult(result)">
            <v-card-text class="d-flex gap-4">
              <v-avatar :color="getSourceColor(result.source)" size="48">
                <v-icon color="white">{{ getSourceIcon(result.source) }}</v-icon>
              </v-avatar>
              <div class="flex-grow-1">
                <h4 class="text-subtitle-1 font-weight-bold mb-1">{{ result.title }}</h4>
                <p class="text-body-2 text-grey mb-2 text-truncate-2">{{ result.excerpt }}</p>
                <div class="d-flex gap-2 flex-wrap">
                  <v-chip size="x-small" variant="tonal" :color="getSourceColor(result.source)">
                    {{ getSourceLabel(result.source) }}
                  </v-chip>
                  <v-chip size="x-small" variant="outlined">{{ result.category }}</v-chip>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Medical/Topic Search Results -->
    <template v-if="topicResults.length > 0">
      <h3 class="text-subtitle-1 font-weight-bold mb-3">
        <v-icon color="blue" size="20" class="mr-1">mdi-book-open-variant</v-icon>
        Knowledge Base Results
      </h3>
      <v-row class="mb-4">
        <v-col v-for="result in topicResults" :key="result.id" cols="12" md="6">
          <v-card rounded="lg" class="result-card" @click="openArticle(result)">
            <v-card-text class="d-flex gap-4">
              <v-avatar :color="result.category_color" size="48">
                <v-icon color="white">{{ result.category_icon }}</v-icon>
              </v-avatar>
              <div class="flex-grow-1">
                <h4 class="text-subtitle-1 font-weight-bold mb-1">{{ result.title }}</h4>
                <p class="text-body-2 text-grey mb-2 text-truncate-2">{{ result.excerpt }}</p>
                <div class="d-flex gap-2">
                  <v-chip size="x-small" variant="tonal">{{ result.category }}</v-chip>
                  <v-chip size="x-small" variant="outlined">{{ result.read_time }} min read</v-chip>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- AI Response -->
    <v-card v-if="aiResponse" rounded="lg" class="mb-6">
      <v-card-title class="d-flex align-center">
        <v-icon color="primary" class="mr-2">mdi-robot</v-icon>
        AI Assistant Response
        <v-chip size="x-small" variant="tonal" color="primary" class="ml-2">
          <v-icon start size="12">mdi-brain</v-icon>
          AI Generated
        </v-chip>
      </v-card-title>
      <v-card-text>
        <div class="ai-response" v-html="sanitize(formattedAiResponse)"></div>
        <v-alert type="info" variant="tonal" density="compact" class="mt-4">
          <v-icon start size="16">mdi-information</v-icon>
          AI-generated content is for reference. For company policy details, refer to the official documents linked above.
        </v-alert>
      </v-card-text>
    </v-card>

    <!-- No Results Message -->
    <v-card v-if="hasSearched && !internalResults.length && !topicResults.length && !aiResponse" rounded="lg" class="mb-6 pa-6 text-center">
      <v-icon size="48" color="grey" class="mb-3">mdi-magnify-close</v-icon>
      <h3 class="text-h6 mb-2">No results found</h3>
      <p class="text-body-2 text-grey mb-3">Try different search terms or refine your query</p>
    </v-card>

    <!-- Policies Section -->
    <template v-if="showPolicies">
      <div class="d-flex align-center justify-space-between mb-4">
        <h3 class="text-h6 font-weight-bold">Company Policies & Important Links</h3>
        <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="showPolicies = false">
          Back to Wiki
        </v-btn>
      </div>
      
      <v-row>
        <v-col v-for="category in policyCategories" :key="category.title" cols="12" md="4">
          <v-card variant="outlined" rounded="lg" class="h-100">
            <v-card-title class="d-flex align-center" :class="`text-${category.color}`">
              <v-icon :color="category.color" class="mr-2">{{ category.icon }}</v-icon>
              {{ category.title }}
            </v-card-title>
            <v-divider />
            <v-list density="compact" class="py-0">
              <v-list-item
                v-for="link in category.links"
                :key="link.name"
                :href="link.url"
                target="_blank"
                class="policy-link"
              >
                <template #prepend>
                  <v-icon size="small" color="grey">mdi-file-document-outline</v-icon>
                </template>
                <v-list-item-title class="text-body-2">{{ link.name }}</v-list-item-title>
                <template #append>
                  <v-icon size="small" color="grey">mdi-open-in-new</v-icon>
                </template>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Facility Resources Section -->
    <template v-if="showFacilityResources">
      <div class="d-flex align-center justify-space-between mb-4">
        <h3 class="text-h6 font-weight-bold">
          <v-icon color="brown" class="mr-2">mdi-tools</v-icon>
          Facility Resources
        </h3>
        <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="showFacilityResources = false">
          Back to Wiki
        </v-btn>
      </div>

      <!-- Facility Search & Filter -->
      <v-card variant="outlined" rounded="lg" class="mb-4">
        <v-card-text class="pb-3">
          <v-row dense>
            <v-col cols="12" sm="6" md="6">
              <v-text-field
                v-model="facilitySearch"
                prepend-inner-icon="mdi-magnify"
                label="Search vendors..."
                variant="outlined"
                density="compact"
                clearable
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <v-select
                v-model="facilityTypeFilter"
                :items="facilityTypeOptions"
                label="Service Type"
                variant="outlined"
                density="compact"
                clearable
                hide-details
              />
            </v-col>
            <v-col cols="12" md="2" class="d-flex align-center">
              <v-chip size="small" variant="tonal" color="brown">
                {{ filteredFacilityResources.length }} vendor{{ filteredFacilityResources.length !== 1 ? 's' : '' }}
              </v-chip>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Loading State -->
      <div v-if="facilityResourcesLoading" class="text-center py-6">
        <v-progress-circular indeterminate color="brown" />
        <p class="text-body-2 text-grey mt-2">Loading facility resources...</p>
      </div>

      <!-- Resource Cards -->
      <v-row v-else-if="filteredFacilityResources.length > 0">
        <v-col v-for="resource in filteredFacilityResources" :key="resource.id" cols="12" sm="6" md="4">
          <v-card variant="outlined" rounded="lg" class="h-100 facility-card">
            <v-card-text>
              <div class="d-flex align-center gap-3 mb-3">
                <v-avatar :color="getFacilityTypeColor(resource.resource_type)" size="44">
                  <v-icon size="22" color="white">{{ getFacilityTypeIcon(resource.resource_type) }}</v-icon>
                </v-avatar>
                <div class="flex-grow-1">
                  <h4 class="text-subtitle-2 font-weight-bold">{{ resource.name }}</h4>
                  <v-chip size="x-small" variant="tonal" :color="getFacilityTypeColor(resource.resource_type)">
                    {{ formatFacilityType(resource.resource_type) }}
                  </v-chip>
                </div>
                <div class="d-flex flex-column align-end gap-1">
                  <v-chip v-if="resource.emergency_contact" size="x-small" color="error" variant="flat">
                    <v-icon start size="10">mdi-alert</v-icon>
                    Emergency
                  </v-chip>
                  <v-chip v-if="resource.is_preferred" size="x-small" color="amber" variant="flat">
                    <v-icon start size="10">mdi-star</v-icon>
                    Preferred
                  </v-chip>
                </div>
              </div>
              <div v-if="resource.company_name" class="text-body-2 text-grey mb-1">
                <v-icon size="14" class="mr-1">mdi-domain</v-icon>
                {{ resource.company_name }}
              </div>
              <div v-if="resource.phone" class="text-body-2 mb-1">
                <v-icon size="14" class="mr-1">mdi-phone</v-icon>
                <a :href="'tel:' + resource.phone" class="text-decoration-none">{{ resource.phone }}</a>
              </div>
              <div v-if="resource.email" class="text-body-2 mb-1">
                <v-icon size="14" class="mr-1">mdi-email-outline</v-icon>
                <a :href="'mailto:' + resource.email" class="text-decoration-none">{{ resource.email }}</a>
              </div>
              <div v-if="resource.hours_of_operation" class="text-body-2 text-grey mb-1">
                <v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>
                {{ resource.hours_of_operation }}
              </div>
              <div v-if="resource.notes" class="text-caption text-grey mt-2" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                {{ resource.notes }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- No Results -->
      <v-card v-else variant="outlined" rounded="lg" class="pa-6 text-center">
        <v-icon size="48" color="grey" class="mb-3">mdi-tools</v-icon>
        <h3 class="text-h6 mb-2">No vendors found</h3>
        <p class="text-body-2 text-grey">Try adjusting your search or filter criteria</p>
      </v-card>
    </template>

    <!-- Medical Partners Section -->
    <template v-if="showMedPartners">
      <div class="d-flex align-center justify-space-between mb-4">
        <h3 class="text-h6 font-weight-bold">
          <v-icon color="indigo" class="mr-2">mdi-handshake</v-icon>
          Medical Partners
        </h3>
        <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="showMedPartners = false">
          Back to Wiki
        </v-btn>
      </div>

      <!-- Partner Search & Filter -->
      <v-card variant="outlined" rounded="lg" class="mb-4">
        <v-card-text class="pb-3">
          <v-row dense>
            <v-col cols="12" sm="6" md="6">
              <v-text-field
                v-model="medPartnerSearch"
                prepend-inner-icon="mdi-magnify"
                label="Search partners..."
                variant="outlined"
                density="compact"
                clearable
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <v-select
                v-model="medPartnerCategoryFilter"
                :items="medPartnerCategoryOptions"
                label="Category"
                variant="outlined"
                density="compact"
                clearable
                hide-details
              />
            </v-col>
            <v-col cols="12" md="2" class="d-flex align-center">
              <v-chip size="small" variant="tonal" color="indigo">
                {{ filteredMedPartners.length }} partner{{ filteredMedPartners.length !== 1 ? 's' : '' }}
              </v-chip>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Loading State -->
      <div v-if="medPartnersLoading" class="text-center py-6">
        <v-progress-circular indeterminate color="indigo" />
        <p class="text-body-2 text-grey mt-2">Loading medical partners...</p>
      </div>

      <!-- Partner Cards -->
      <v-row v-else-if="filteredMedPartners.length > 0">
        <v-col v-for="partner in filteredMedPartners" :key="partner.id" cols="12" sm="6" md="4">
          <v-card variant="outlined" rounded="lg" class="h-100 partner-wiki-card">
            <v-card-text>
              <div class="d-flex align-center gap-3 mb-3">
                <v-avatar :color="partner.color || 'indigo'" size="44">
                  <v-icon size="22" color="white">{{ partner.icon || 'mdi-factory' }}</v-icon>
                </v-avatar>
                <div class="flex-grow-1">
                  <h4 class="text-subtitle-2 font-weight-bold">{{ partner.name }}</h4>
                  <v-chip size="x-small" variant="tonal" color="indigo">
                    {{ partner.category || 'Other' }}
                  </v-chip>
                </div>
              </div>
              <p v-if="partner.description" class="text-body-2 text-grey mb-2" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                {{ partner.description }}
              </p>
              <div v-if="partner.contact_name" class="text-body-2 mb-1">
                <v-icon size="14" class="mr-1">mdi-account</v-icon>
                {{ partner.contact_name }}
              </div>
              <div v-if="partner.contact_phone" class="text-body-2 mb-1">
                <v-icon size="14" class="mr-1">mdi-phone</v-icon>
                <a :href="'tel:' + partner.contact_phone" class="text-decoration-none">{{ partner.contact_phone }}</a>
              </div>
              <div v-if="partner.contact_email" class="text-body-2 mb-1">
                <v-icon size="14" class="mr-1">mdi-email-outline</v-icon>
                <a :href="'mailto:' + partner.contact_email" class="text-decoration-none">{{ partner.contact_email }}</a>
              </div>
              <div v-if="partner.website" class="text-body-2 mb-1">
                <v-icon size="14" class="mr-1">mdi-web</v-icon>
                <a :href="partner.website" target="_blank" class="text-decoration-none">{{ partner.website }}</a>
              </div>
              <div v-if="partner.products?.length" class="mt-2 d-flex flex-wrap gap-1">
                <v-chip v-for="product in partner.products.slice(0, 3)" :key="product" size="x-small" variant="outlined">
                  {{ product }}
                </v-chip>
                <v-chip v-if="partner.products.length > 3" size="x-small" variant="outlined">
                  +{{ partner.products.length - 3 }} more
                </v-chip>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- No Results -->
      <v-card v-else variant="outlined" rounded="lg" class="pa-6 text-center">
        <v-icon size="48" color="grey" class="mb-3">mdi-handshake</v-icon>
        <h3 class="text-h6 mb-2">No partners found</h3>
        <p class="text-body-2 text-grey">Try adjusting your search or filter criteria</p>
      </v-card>
    </template>

    <!-- Recent Searches (default view) -->
    <template v-if="!hasSearched && !showPolicies && !showFacilityResources && !showMedPartners">
      <div class="mt-2" v-if="recentSearches.length > 0">
        <h3 class="text-subtitle-1 font-weight-bold mb-3">Recent Searches</h3>
        <v-chip-group>
          <v-chip
            v-for="recentSearch in recentSearches"
            :key="recentSearch"
            variant="outlined"
            @click="searchQuery = recentSearch; performSearch('both')"
          >
            <v-icon start size="small">mdi-history</v-icon>
            {{ recentSearch }}
          </v-chip>
        </v-chip-group>
      </div>
    </template>

    <!-- Article Dialog -->
    <v-dialog v-model="articleDialog" max-width="800" scrollable>
      <v-card v-if="selectedArticle">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>{{ selectedArticle.title }}</span>
          <v-btn icon="mdi-close" variant="text" aria-label="Close" @click="articleDialog = false" />
        </v-card-title>
        
        <v-divider />
        
        <v-card-text class="article-content">
          <div class="d-flex gap-2 mb-4">
            <v-chip size="small" :color="selectedArticle.category_color || 'primary'" variant="tonal">
              {{ selectedArticle.category }}
            </v-chip>
            <v-chip v-if="selectedArticle.read_time" size="small" variant="outlined">
              <v-icon start size="small">mdi-clock-outline</v-icon>
              {{ selectedArticle.read_time }} min read
            </v-chip>
            <v-chip v-if="selectedArticle.last_updated" size="small" variant="outlined">
              <v-icon start size="small">mdi-update</v-icon>
              Updated {{ selectedArticle.last_updated }}
            </v-chip>
          </div>

          <div v-html="sanitize(selectedArticle.content)" class="wiki-content"></div>
        </v-card-text>
        
        <v-divider />
        
        <v-card-actions>
          <v-btn variant="text" prepend-icon="mdi-bookmark-outline" @click="saveArticle">Save</v-btn>
          <v-btn variant="text" prepend-icon="mdi-share-variant" @click="shareArticle">Share</v-btn>
          <v-spacer />
          <v-btn variant="text" prepend-icon="mdi-thumb-up-outline" @click="markHelpful">Helpful</v-btn>
          <v-btn variant="text" prepend-icon="mdi-printer" @click="printArticle">Print</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

useHead({
  title: 'Wiki - Green Dog Dental'
})

const { sanitize } = useSanitizedHtml()

// State
const searchQuery = ref('')
const searching = ref(false)
const aiLoading = ref(false)
const searchResults = ref<any[]>([])
const internalResults = ref<any[]>([])
const topicResults = ref<any[]>([])
const aiResponse = ref('')
const articleDialog = ref(false)
const selectedArticle = ref<any>(null)
const recentSearches = ref<string[]>([])
const showPolicies = ref(false)
const showFacilityResources = ref(false)
const facilityResources = ref<any[]>([])
const facilityResourcesLoading = ref(false)
const facilitySearch = ref('')
const facilityTypeFilter = ref<string | null>(null)
const showMedPartners = ref(false)
const medPartners = ref<any[]>([])
const medPartnersLoading = ref(false)
const medPartnerSearch = ref('')
const medPartnerCategoryFilter = ref<string | null>(null)
const hasSearched = ref(false)

// Load recent searches from localStorage
onMounted(() => {
  try {
    const saved = localStorage.getItem('wiki_recent_searches')
    if (saved) recentSearches.value = JSON.parse(saved)
  } catch { /* ignore */ }
})

// Policy Links
const policyCategories = [
  {
    title: 'Employee Development',
    color: 'primary',
    icon: 'mdi-trending-up',
    links: [
      { name: 'Roles & Responsibilities Lists', url: 'https://docs.google.com/document/d/1OeZxk5pEDc4oHQxW0-QcCm41h2E-t9AWA4G_OQIV5pA/edit' },
      { name: 'Core Attributes', url: 'https://docs.google.com/document/d/12QrK1R-9QXiAx-nhuITHY-G6nmphEbbf1k6XarXYGX8/edit' },
      { name: 'Compensation Overview', url: 'https://docs.google.com/document/d/1p9t2Pzpp7CkeayTM8H9FS5CBE-LoJ7s8c2U8KgrLOlU/edit' },
      { name: 'Employee Wellness', url: 'https://docs.google.com/document/d/1cU2bH6OM0AlWb-w-tb-6-HXih2U9ZpiuDPHAV4LVzT8/edit' }
    ]
  },
  {
    title: 'HR / Protocols / Policies',
    color: 'teal',
    icon: 'mdi-file-document-multiple',
    links: [
      { name: 'GDD Master Protocols Sheet', url: 'https://docs.google.com/document/d/1m_b6JW0ORuDbWrD_3i9jdLKGKpw1Lt02Odyan3fX5tI/edit' },
      { name: 'GDD Continuing Education Policy', url: 'https://docs.google.com/document/d/1RnIB7gLo_BdHgAj-79r8W1DFSF5jMdGEaCxcx8PfYW8/edit' },
      { name: 'GDD Respectful Workplace Policy', url: 'https://docs.google.com/document/d/1q9JjdcQnsA8lHQlWGjQyg0I2z7TqWw5h/edit' },
      { name: 'GDD Employee Pet Policy', url: 'https://docs.google.com/document/d/1QoMgpOhzGwVCjM6NiC4E1MaahDGhyORmHzCYX5Rd-Ps/edit' },
      { name: 'GDD PTO/Sick Time/Unpaid Time Off Policy', url: 'https://docs.google.com/document/d/1J8nq-cy3eWrOuixB8dMRJzxa7xiWrIKXu39Rgc7yuJM/edit' },
      { name: 'Safety Manual', url: 'https://docs.google.com/document/d/10WHDG-7kplVDYcQa4MDfLLZqsJHeyQF1/edit' },
      { name: 'Pregnancy Safety', url: 'https://docs.google.com/document/d/1G-rfxGC2zsEFShFeSen7CsbqjUAAy_Cn/edit' },
      { name: 'GDD Urgent Care Locations and Injury Protocol', url: 'https://docs.google.com/document/d/1_pqe4NlBTIy3ZYS1Y5obP_vAZfu-oWjnIJEnS9v8OKQ/edit' },
      { name: 'Hazard Reporting Form', url: 'https://docs.google.com/document/d/1qbre_4ymIMle3lf7pg1Tr87r3ULZ8ZN9/edit' },
      { name: 'Review Process Policy', url: 'https://docs.google.com/document/d/1brfUtwLOMU14MFx_25-sfrgbGvVOX2X27D9-ZnJuxTE/edit' },
      { name: 'GDD Harassment Policy', url: 'https://docs.google.com/document/d/1LxdmlY1mS4e8xzzO0KOtnieOYqJt4BbAJcZTC34JQ7Y/edit' },
      { name: 'GDD Workplace Relationships Policy', url: 'https://docs.google.com/document/d/1-WESyPVBW8Jt-oZCR7-qpdKtdVl-9oz31uynSC_w8KQ/edit' },
      { name: 'Employee Covid Protocol', url: 'https://docs.google.com/document/d/1oVnI1U_sgFZ9Y54TzQevoLLliuK8TCzGQsAjCPyzgxc/edit' },
      { name: 'GDD Non-Employee Discounts', url: 'https://docs.google.com/document/d/19CZDbS73rDokbLlu2iGc1-VfAm4cYzcK/edit' }
    ]
  },
  {
    title: 'Disciplinary',
    color: 'error',
    icon: 'mdi-alert-circle',
    links: [
      { name: 'Call Outs and Tardiness Policy', url: 'https://docs.google.com/document/d/1OERyRhaB-_e70jWw4pYGsUrbeje1GP1m/edit' },
      { name: 'GDD Disciplinary Policy', url: 'https://docs.google.com/document/d/disciplinary-policy' }
    ]
  }
]

const resourceButtons = [
  { id: 'facility-resources', name: 'Facility Resources', icon: 'mdi-office-building', color: 'brown', action: 'facility-resources' },
  { id: 'policies', name: 'Policies', icon: 'mdi-file-document-outline', color: 'teal', action: 'policies' },
  { id: 'contact-list', name: 'Contact List', icon: 'mdi-contacts', color: 'blue', route: '/contact-list' },
  { id: 'med-partners', name: 'Med Ops Partners', icon: 'mdi-handshake', color: 'indigo', action: 'med-partners' },
  { id: 'list-hygiene', name: 'List Hygiene', icon: 'mdi-broom', color: 'green', route: '/marketing/list-hygiene' },
  { id: 'safety-logs', name: 'Safety Logs', icon: 'mdi-shield-check', color: 'red', route: '/med-ops/safety' },
  { id: 'drug-calculators', name: 'Drug Calculators', icon: 'mdi-calculator', color: 'purple', route: '/med-ops/calculators' },
  { id: 'event-calendar', name: 'Event Calendar', icon: 'mdi-calendar-month', color: 'amber-darken-2', route: '/marketing/calendar' }
]


const popularTopics = [
  {
    id: '1',
    title: 'Canine Parvovirus: Diagnosis and Treatment',
    excerpt: 'Comprehensive guide to CPV including symptoms, diagnostic tests, treatment protocols, and prevention strategies.',
    category: 'Conditions',
    category_color: 'red',
    category_icon: 'mdi-hospital',
    read_time: 12,
    last_updated: 'Dec 2024',
    content: '<h3>Overview</h3><p>Canine parvovirus (CPV) is a highly contagious viral illness...</p>'
  },
  {
    id: '2',
    title: 'Feline Chronic Kidney Disease Management',
    excerpt: 'Evidence-based approaches to managing CKD in cats including staging, monitoring, and treatment options.',
    category: 'Conditions',
    category_color: 'red',
    category_icon: 'mdi-hospital',
    read_time: 15,
    last_updated: 'Nov 2024',
    content: '<h3>Introduction</h3><p>Chronic kidney disease affects approximately 30-40% of cats over age 10...</p>'
  },
  {
    id: '3',
    title: 'Anesthesia Monitoring Best Practices',
    excerpt: 'Guidelines for safe anesthesia monitoring including equipment, protocols, and emergency responses.',
    category: 'Procedures',
    category_color: 'blue',
    category_icon: 'mdi-medical-bag',
    read_time: 10,
    last_updated: 'Dec 2024',
    content: '<h3>Pre-Anesthetic Assessment</h3><p>A thorough pre-anesthetic assessment is crucial...</p>'
  },
  {
    id: '4',
    title: 'NSAID Use in Veterinary Medicine',
    excerpt: 'Safe and effective use of non-steroidal anti-inflammatory drugs in companion animals.',
    category: 'Medications',
    category_color: 'green',
    category_icon: 'mdi-pill',
    read_time: 8,
    last_updated: 'Oct 2024',
    content: '<h3>Mechanism of Action</h3><p>NSAIDs work by inhibiting cyclooxygenase enzymes...</p>'
  },
  {
    id: '5',
    title: 'Interpreting Blood Chemistry Panels',
    excerpt: 'Guide to understanding and interpreting common blood chemistry results in dogs and cats.',
    category: 'Diagnostics',
    category_color: 'purple',
    category_icon: 'mdi-test-tube',
    read_time: 20,
    last_updated: 'Nov 2024',
    content: '<h3>Liver Enzymes</h3><p>ALT, AST, ALP, and GGT are commonly measured liver enzymes...</p>'
  },
  {
    id: '6',
    title: 'Emergency Triage Protocols',
    excerpt: 'Standardized approach to triaging emergency patients and prioritizing care.',
    category: 'Emergency',
    category_color: 'error',
    category_icon: 'mdi-ambulance',
    read_time: 6,
    last_updated: 'Dec 2024',
    content: '<h3>Primary Survey</h3><p>The primary survey follows the ABC approach: Airway, Breathing, Circulation...</p>'
  }
]

// Computed
const formattedAiResponse = computed(() => {
  if (!aiResponse.value) return ''
  // Convert markdown-style formatting to HTML
  let html = aiResponse.value
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*$)/gm, '<h4 class="mt-3 mb-1">$1</h4>')
    .replace(/^## (.*$)/gm, '<h3 class="mt-4 mb-2">$1</h3>')
    .replace(/^# (.*$)/gm, '<h2 class="mt-4 mb-2">$1</h2>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul class="ml-4 mb-2">$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
  return `<p>${html}</p>`
})

// Helper functions for result display
function getSourceColor(source: string): string {
  switch (source) {
    case 'policy_document': return 'teal'
    case 'wiki_article': return 'blue'
    case 'system_data': return 'purple'
    default: return 'grey'
  }
}

function getSourceIcon(source: string): string {
  switch (source) {
    case 'policy_document': return 'mdi-file-document'
    case 'wiki_article': return 'mdi-book-open-variant'
    case 'system_data': return 'mdi-database'
    default: return 'mdi-file'
  }
}

function getSourceLabel(source: string): string {
  switch (source) {
    case 'policy_document': return 'GDD Policy'
    case 'wiki_article': return 'Wiki Article'
    case 'system_data': return 'System'
    default: return 'Document'
  }
}

// Methods
async function performSearch(mode: 'search' | 'ai' | 'both') {
  if (!searchQuery.value.trim()) return
  
  const isAiOnly = mode === 'ai'
  if (isAiOnly) {
    aiLoading.value = true
  } else {
    searching.value = true
  }
  
  hasSearched.value = true
  showPolicies.value = false
  showFacilityResources.value = false
  showMedPartners.value = false
  
  // Clear previous results
  if (!isAiOnly) {
    internalResults.value = []
    topicResults.value = []
  }
  aiResponse.value = ''
  
  try {
    // Call server API for intelligent search
    const { data } = await useFetch('/api/wiki/search', {
      method: 'POST',
      body: {
        query: searchQuery.value,
        mode
      }
    })
    
    if (data.value) {
      // Internal results from API
      if (data.value.internalResults?.length) {
        internalResults.value = data.value.internalResults
      }
      
      // AI response
      if (data.value.aiResponse) {
        aiResponse.value = data.value.aiResponse
      }
    }
    
    // Also filter local popular topics for additional results
    if (mode !== 'ai') {
      topicResults.value = popularTopics.filter(t =>
        t.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        t.excerpt.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.value.toLowerCase())
      )
    }
    
    // Save to recent searches
    addToRecentSearches(searchQuery.value)
  } catch (err) {
    console.error('[Wiki] Search error:', err)
    
    // Fallback: do local search only
    topicResults.value = popularTopics.filter(t =>
      t.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      t.excerpt.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  } finally {
    searching.value = false
    aiLoading.value = false
  }
}

function addToRecentSearches(query: string) {
  const searches = recentSearches.value.filter(s => s !== query)
  searches.unshift(query)
  if (searches.length > 5) searches.pop()
  recentSearches.value = searches
  try {
    localStorage.setItem('wiki_recent_searches', JSON.stringify(searches))
  } catch { /* ignore */ }
}

function clearResults() {
  internalResults.value = []
  topicResults.value = []
  aiResponse.value = ''
  hasSearched.value = false
  showFacilityResources.value = false
  showMedPartners.value = false
}


function openResult(result: any) {
  if (result.source === 'policy_document' && result.url) {
    window.open(result.url, '_blank')
  } else if (result.content) {
    selectedArticle.value = result
    articleDialog.value = true
  }
}

function openArticle(article: any) {
  selectedArticle.value = article
  articleDialog.value = true
}

function saveArticle() {
  const saved = JSON.parse(localStorage.getItem('saved_wiki_articles') || '[]')
  if (!saved.find((a: any) => a.id === selectedArticle.value?.id)) {
    saved.push({
      id: selectedArticle.value?.id,
      title: selectedArticle.value?.title,
      savedAt: new Date().toISOString()
    })
    localStorage.setItem('saved_wiki_articles', JSON.stringify(saved))
    alert('Article saved!')
  } else {
    alert('Article already saved')
  }
}

function shareArticle() {
  const url = window.location.href + '?article=' + selectedArticle.value?.id
  if (navigator.share) {
    navigator.share({
      title: selectedArticle.value?.title,
      text: 'Check out this wiki article',
      url
    })
  } else {
    navigator.clipboard.writeText(url)
    alert('Link copied to clipboard!')
  }
}

function markHelpful() {
  alert('Thanks for your feedback!')
}

function printArticle() {
  window.print()
}

// Resource navigation
const router = useRouter()
function navigateToResource(resource: any) {
  if (resource.route) {
    router.push(resource.route)
    return
  }
  if (resource.action === 'policies') {
    showPolicies.value = true
    showFacilityResources.value = false
    showMedPartners.value = false
    hasSearched.value = false
    searchQuery.value = ''
    aiResponse.value = ''
    internalResults.value = []
    topicResults.value = []
  } else if (resource.action === 'facility-resources') {
    showFacilityResources.value = true
    showPolicies.value = false
    showMedPartners.value = false
    hasSearched.value = false
    searchQuery.value = ''
    aiResponse.value = ''
    internalResults.value = []
    topicResults.value = []
    loadFacilityResources()
  } else if (resource.action === 'med-partners') {
    showMedPartners.value = true
    showPolicies.value = false
    showFacilityResources.value = false
    hasSearched.value = false
    searchQuery.value = ''
    aiResponse.value = ''
    internalResults.value = []
    topicResults.value = []
    loadMedPartners()
  }
}

// Facility Resources
const supabase = useSupabaseClient()

const facilityResourceTypes = [
  { value: 'plumber', title: 'Plumber' },
  { value: 'electrician', title: 'Electrician' },
  { value: 'hvac', title: 'HVAC' },
  { value: 'handyman', title: 'Handyman' },
  { value: 'landlord', title: 'Landlord' },
  { value: 'cleaning', title: 'Cleaning' },
  { value: 'landscaping', title: 'Landscaping' },
  { value: 'pest_control', title: 'Pest Control' },
  { value: 'security', title: 'Security' },
  { value: 'it_support', title: 'IT Support' },
  { value: 'appliance_repair', title: 'Appliance Repair' },
  { value: 'roofing', title: 'Roofing' },
  { value: 'painting', title: 'Painting' },
  { value: 'design', title: 'Design / Signage' },
  { value: 'cabinetry', title: 'Cabinetry' },
  { value: 'countertops', title: 'Stone / Counters' },
  { value: 'general_contractor', title: 'General Contractor' },
  { value: 'other', title: 'Other' }
]

function getFacilityTypeColor(type: string) {
  const colors: Record<string, string> = {
    plumber: 'blue', electrician: 'amber', hvac: 'cyan', handyman: 'brown',
    landlord: 'purple', cleaning: 'teal', landscaping: 'green', pest_control: 'orange',
    security: 'red', it_support: 'indigo', appliance_repair: 'blue-grey',
    roofing: 'deep-orange', painting: 'pink', design: 'lime', cabinetry: 'brown-darken-2',
    countertops: 'grey', general_contractor: 'deep-purple', other: 'grey'
  }
  return colors[type] || 'grey'
}

function getFacilityTypeIcon(type: string) {
  const icons: Record<string, string> = {
    plumber: 'mdi-pipe-wrench', electrician: 'mdi-flash', hvac: 'mdi-air-conditioner',
    handyman: 'mdi-hammer-wrench', landlord: 'mdi-home-city', cleaning: 'mdi-broom',
    landscaping: 'mdi-flower', pest_control: 'mdi-bug', security: 'mdi-shield-lock',
    it_support: 'mdi-desktop-classic', appliance_repair: 'mdi-dishwasher',
    roofing: 'mdi-home-roof', painting: 'mdi-format-paint', design: 'mdi-palette',
    cabinetry: 'mdi-cupboard', countertops: 'mdi-counter',
    general_contractor: 'mdi-hard-hat', other: 'mdi-tools'
  }
  return icons[type] || 'mdi-tools'
}

function formatFacilityType(type: string) {
  return type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Other'
}

async function loadFacilityResources() {
  facilityResourcesLoading.value = true
  try {
    const { data, error } = await supabase
      .from('facility_resources')
      .select('*')
      .eq('is_active', true)
      .order('name')
    if (error) throw error
    facilityResources.value = data || []
  } catch (err) {
    console.error('[Wiki] Failed to load facility resources:', err)
  } finally {
    facilityResourcesLoading.value = false
  }
}

const filteredFacilityResources = computed(() => {
  let filtered = facilityResources.value
  if (facilitySearch.value) {
    const q = facilitySearch.value.toLowerCase()
    filtered = filtered.filter(r =>
      r.name?.toLowerCase().includes(q) ||
      r.company_name?.toLowerCase().includes(q) ||
      r.phone?.includes(facilitySearch.value) ||
      r.email?.toLowerCase().includes(q) ||
      r.resource_type?.toLowerCase().includes(q) ||
      r.notes?.toLowerCase().includes(q)
    )
  }
  if (facilityTypeFilter.value) {
    filtered = filtered.filter(r => r.resource_type === facilityTypeFilter.value)
  }
  return filtered
})

const facilityTypeOptions = computed(() =>
  [...new Set(facilityResources.value.map(r => r.resource_type))]
    .filter(Boolean)
    .map(t => ({ value: t, title: formatFacilityType(t) }))
    .sort((a, b) => a.title.localeCompare(b.title))
)

// Medical Partners
async function loadMedPartners() {
  medPartnersLoading.value = true
  try {
    const { data, error } = await supabase
      .from('med_ops_partners')
      .select('*')
      .eq('is_active', true)
      .order('name')
    if (error) throw error
    medPartners.value = data || []
  } catch (err) {
    console.error('[Wiki] Failed to load medical partners:', err)
  } finally {
    medPartnersLoading.value = false
  }
}

const filteredMedPartners = computed(() => {
  let filtered = medPartners.value
  if (medPartnerSearch.value) {
    const q = medPartnerSearch.value.toLowerCase()
    filtered = filtered.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.contact_name?.toLowerCase().includes(q) ||
      p.contact_email?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.products?.some((pr: string) => pr.toLowerCase().includes(q))
    )
  }
  if (medPartnerCategoryFilter.value) {
    filtered = filtered.filter(p => p.category === medPartnerCategoryFilter.value)
  }
  return filtered
})

const medPartnerCategoryOptions = computed(() =>
  [...new Set(medPartners.value.map(p => p.category))]
    .filter(Boolean)
    .sort()
)
</script>

<style scoped>
.wiki-page {
  max-width: 1200px;
}

.category-card {
  cursor: pointer;
  transition: all 0.2s;
}

.category-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.result-card,
.topic-card {
  cursor: pointer;
  transition: all 0.2s;
}

.result-card:hover,
.topic-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.text-truncate-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ai-response {
  line-height: 1.8;
}

.ai-response :deep(h2),
.ai-response :deep(h3),
.ai-response :deep(h4) {
  font-weight: 600;
}

.ai-response :deep(ul) {
  padding-left: 1.5rem;
}

.ai-response :deep(li) {
  margin-bottom: 0.25rem;
}

.wiki-content h3 {
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.wiki-content p {
  margin-bottom: 1rem;
  line-height: 1.7;
}

.policy-link:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.facility-card {
  cursor: default;
  transition: all 0.2s;
}

.facility-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.partner-wiki-card {
  cursor: default;
  transition: all 0.2s;
}

.partner-wiki-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
