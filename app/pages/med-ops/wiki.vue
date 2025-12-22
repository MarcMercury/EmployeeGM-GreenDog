<template>
  <div class="wiki-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Medical Wiki</h1>
        <p class="text-body-1 text-grey-darken-1">
          AI-powered veterinary medical knowledge base
        </p>
      </div>
    </div>

    <!-- Search Section -->
    <v-card rounded="lg" class="mb-6 pa-6 text-center">
      <v-icon size="64" color="primary" class="mb-4">mdi-book-open-page-variant</v-icon>
      <h2 class="text-h5 font-weight-bold mb-4">What would you like to learn about?</h2>
      <v-text-field
        v-model="searchQuery"
        placeholder="Search medical conditions, procedures, medications..."
        variant="outlined"
        prepend-inner-icon="mdi-magnify"
        append-inner-icon="mdi-microphone"
        density="comfortable"
        class="search-field mx-auto mb-4"
        style="max-width: 600px;"
        @keyup.enter="search"
      />
      <v-btn color="primary" size="large" @click="search" :loading="searching" class="mr-2">
        <v-icon start>mdi-magnify</v-icon>
        Search
      </v-btn>
      <v-btn variant="outlined" size="large" @click="askAI" :loading="aiLoading">
        <v-icon start>mdi-robot</v-icon>
        Ask AI
      </v-btn>
    </v-card>

    <!-- Quick Categories -->
    <div class="mb-6">
      <h3 class="text-subtitle-1 font-weight-bold mb-3">Browse by Category</h3>
      <v-row>
        <v-col v-for="category in categories" :key="category.id" cols="6" sm="4" md="true">
          <v-card
            variant="outlined"
            rounded="lg"
            class="category-card text-center pa-3"
            @click="selectCategory(category)"
          >
            <v-icon :color="category.color" size="28" class="mb-1">{{ category.icon }}</v-icon>
            <div class="text-caption font-weight-medium">{{ category.name }}</div>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Search Results -->
    <template v-if="searchResults.length > 0">
      <h3 class="text-subtitle-1 font-weight-bold mb-3">Search Results</h3>
      <v-row>
        <v-col v-for="result in searchResults" :key="result.id" cols="12" md="6">
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
      </v-card-title>
      <v-card-text>
        <div class="ai-response" v-html="formattedAiResponse"></div>
        <v-alert type="warning" variant="tonal" class="mt-4">
          <v-icon start>mdi-alert</v-icon>
          AI-generated content is for educational purposes only. Always verify with established veterinary resources.
        </v-alert>
      </v-card-text>
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

    <!-- Popular Topics -->
    <template v-if="!searchResults.length && !aiResponse && !showPolicies">
      <h3 class="text-subtitle-1 font-weight-bold mb-3">Popular Topics</h3>
      <v-row>
        <v-col v-for="topic in popularTopics" :key="topic.id" cols="12" md="4">
          <v-card rounded="lg" class="topic-card h-100" @click="openArticle(topic)">
            <v-card-text>
              <div class="d-flex align-center gap-3 mb-3">
                <v-avatar :color="topic.category_color" size="40">
                  <v-icon color="white" size="20">{{ topic.category_icon }}</v-icon>
                </v-avatar>
                <v-chip size="x-small" variant="tonal" :color="topic.category_color">
                  {{ topic.category }}
                </v-chip>
              </div>
              <h4 class="text-subtitle-1 font-weight-bold mb-2">{{ topic.title }}</h4>
              <p class="text-body-2 text-grey mb-0">{{ topic.excerpt }}</p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Recent Searches -->
      <div class="mt-6" v-if="recentSearches.length > 0">
        <h3 class="text-subtitle-1 font-weight-bold mb-3">Recent Searches</h3>
        <v-chip-group>
          <v-chip
            v-for="recentSearch in recentSearches"
            :key="recentSearch"
            variant="outlined"
            @click="searchQuery = recentSearch"
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
          <v-btn icon="mdi-close" variant="text" @click="articleDialog = false" />
        </v-card-title>
        
        <v-divider />
        
        <v-card-text class="article-content">
          <div class="d-flex gap-2 mb-4">
            <v-chip size="small" :color="selectedArticle.category_color" variant="tonal">
              {{ selectedArticle.category }}
            </v-chip>
            <v-chip size="small" variant="outlined">
              <v-icon start size="small">mdi-clock-outline</v-icon>
              {{ selectedArticle.read_time }} min read
            </v-chip>
            <v-chip size="small" variant="outlined">
              <v-icon start size="small">mdi-update</v-icon>
              Updated {{ selectedArticle.last_updated }}
            </v-chip>
          </div>

          <div v-html="selectedArticle.content" class="wiki-content"></div>
        </v-card-text>
        
        <v-divider />
        
        <v-card-actions>
          <v-btn variant="text" prepend-icon="mdi-bookmark-outline">Save</v-btn>
          <v-btn variant="text" prepend-icon="mdi-share-variant">Share</v-btn>
          <v-spacer />
          <v-btn variant="text" prepend-icon="mdi-thumb-up-outline">Helpful</v-btn>
          <v-btn variant="text" prepend-icon="mdi-printer">Print</v-btn>
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
  title: 'Medical Wiki'
})

// State
const searchQuery = ref('')
const searching = ref(false)
const aiLoading = ref(false)
const searchResults = ref<any[]>([])
const aiResponse = ref('')
const articleDialog = ref(false)
const selectedArticle = ref<any>(null)
const recentSearches = ref(['Canine parvovirus', 'Feline kidney disease', 'Anesthesia protocols'])
const showPolicies = ref(false)

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

const categories = [
  { id: 'conditions', name: 'Conditions', icon: 'mdi-hospital', color: 'red' },
  { id: 'procedures', name: 'Procedures', icon: 'mdi-medical-bag', color: 'blue' },
  { id: 'medications', name: 'Medications', icon: 'mdi-pill', color: 'green' },
  { id: 'diagnostics', name: 'Diagnostics', icon: 'mdi-test-tube', color: 'purple' },
  { id: 'nutrition', name: 'Nutrition', icon: 'mdi-food-apple', color: 'orange' },
  { id: 'emergency', name: 'Emergency', icon: 'mdi-ambulance', color: 'error' },
  { id: 'policies', name: 'Policies', icon: 'mdi-file-document-outline', color: 'teal' }
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
  return aiResponse.value.replace(/\n/g, '<br>')
})

// Methods
async function search() {
  if (!searchQuery.value.trim()) return
  
  searching.value = true
  aiResponse.value = ''
  
  try {
    // Simulate search
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Filter topics based on search
    searchResults.value = popularTopics.filter(t =>
      t.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      t.excerpt.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
    
    // Add to recent searches
    if (!recentSearches.value.includes(searchQuery.value)) {
      recentSearches.value.unshift(searchQuery.value)
      if (recentSearches.value.length > 5) {
        recentSearches.value.pop()
      }
    }
  } finally {
    searching.value = false
  }
}

async function askAI() {
  if (!searchQuery.value.trim()) return
  
  aiLoading.value = true
  searchResults.value = []
  
  try {
    // Simulate AI response
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    aiResponse.value = `Based on your query about "${searchQuery.value}", here's what I found:

**Summary**
This topic is commonly encountered in veterinary practice. Here are the key points:

1. **Definition**: A detailed explanation of the condition/procedure/medication.

2. **Clinical Signs**: Common presentations include various symptoms that may vary by species.

3. **Diagnosis**: Recommended diagnostic approaches include physical examination, laboratory tests, and imaging.

4. **Treatment**: Evidence-based treatment protocols should be followed, adjusted for individual patient needs.

5. **Prognosis**: Outcomes depend on early detection and appropriate intervention.

**Important Considerations**
- Always perform a thorough patient assessment
- Consider species-specific variations
- Monitor for adverse reactions
- Follow up appropriately

For more detailed information, consult the relevant articles in our database or veterinary medical references.`
  } finally {
    aiLoading.value = false
  }
}

function selectCategory(category: any) {
  // Handle Policies category specially
  if (category.id === 'policies') {
    showPolicies.value = true
    searchQuery.value = ''
    aiResponse.value = ''
    searchResults.value = []
    return
  }
  
  // Filter by category instead of putting category name in search
  showPolicies.value = false
  searchQuery.value = ''
  aiResponse.value = ''
  searchResults.value = popularTopics.filter(t =>
    t.category.toLowerCase() === category.name.toLowerCase()
  )
}

function openArticle(article: any) {
  selectedArticle.value = article
  articleDialog.value = true
}
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
  white-space: pre-wrap;
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
</style>
