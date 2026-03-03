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
        <div class="d-flex align-center gap-2">
          <v-btn-toggle v-model="facilityViewMode" mandatory density="compact" variant="outlined" color="brown">
            <v-btn value="list" size="small">
              <v-icon size="18">mdi-format-list-bulleted</v-icon>
            </v-btn>
            <v-btn value="tile" size="small">
              <v-icon size="18">mdi-view-grid</v-icon>
            </v-btn>
          </v-btn-toggle>
          <v-btn color="brown" variant="flat" size="small" prepend-icon="mdi-plus" @click="showAddResourceDialog = true">
            Add Resource
          </v-btn>
          <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="showFacilityResources = false">
            Back to Wiki
          </v-btn>
        </div>
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

      <!-- Resource Tile View -->
      <v-row v-else-if="filteredFacilityResources.length > 0 && facilityViewMode === 'tile'">
        <v-col v-for="resource in filteredFacilityResources" :key="resource.id" cols="12" sm="6" md="4">
          <v-card variant="outlined" rounded="lg" class="h-100 facility-card clickable-card" @click="openResourceDetail(resource)">
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
              <!-- Assigned Locations -->
              <div v-if="getWikiResourceLocations(resource.id).length > 0" class="d-flex flex-wrap gap-1 mt-2">
                <v-chip 
                  v-for="loc in getWikiResourceLocations(resource.id)" 
                  :key="loc.id" 
                  size="x-small" 
                  variant="outlined"
                  color="primary"
                >
                  <v-icon start size="10">mdi-map-marker</v-icon>
                  {{ loc.name }}
                </v-chip>
              </div>
              <div v-if="resource.notes" class="text-caption text-grey mt-2" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                {{ resource.notes }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Resource List View (default) -->
      <v-card v-else-if="filteredFacilityResources.length > 0 && facilityViewMode === 'list'" variant="outlined" rounded="lg">
        <v-list lines="two" class="py-0">
          <template v-for="(resource, idx) in filteredFacilityResources" :key="resource.id">
            <v-list-item class="py-3 clickable-item" @click="openResourceDetail(resource)">
              <template #prepend>
                <v-avatar :color="getFacilityTypeColor(resource.resource_type)" size="40" class="mr-3">
                  <v-icon size="20" color="white">{{ getFacilityTypeIcon(resource.resource_type) }}</v-icon>
                </v-avatar>
              </template>
              <v-list-item-title class="font-weight-bold text-subtitle-2 mb-1">
                {{ resource.name }}
                <v-chip v-if="resource.emergency_contact" size="x-small" color="error" variant="flat" class="ml-2">
                  <v-icon start size="10">mdi-alert</v-icon>
                  Emergency
                </v-chip>
                <v-chip v-if="resource.is_preferred" size="x-small" color="amber" variant="flat" class="ml-1">
                  <v-icon start size="10">mdi-star</v-icon>
                  Preferred
                </v-chip>
              </v-list-item-title>
              <v-list-item-subtitle>
                <span class="d-inline-flex align-center gap-3 flex-wrap">
                  <v-chip size="x-small" variant="tonal" :color="getFacilityTypeColor(resource.resource_type)">
                    {{ formatFacilityType(resource.resource_type) }}
                  </v-chip>
                  <span v-if="resource.company_name" class="text-body-2 text-grey">
                    <v-icon size="12" class="mr-1">mdi-domain</v-icon>{{ resource.company_name }}
                  </span>
                  <span v-if="resource.phone" class="text-body-2">
                    <v-icon size="12" class="mr-1">mdi-phone</v-icon>
                    <a :href="'tel:' + resource.phone" class="text-decoration-none">{{ resource.phone }}</a>
                  </span>
                  <span v-if="resource.email" class="text-body-2">
                    <v-icon size="12" class="mr-1">mdi-email-outline</v-icon>
                    <a :href="'mailto:' + resource.email" class="text-decoration-none">{{ resource.email }}</a>
                  </span>
                  <span v-if="resource.hours_of_operation" class="text-body-2 text-grey">
                    <v-icon size="12" class="mr-1">mdi-clock-outline</v-icon>{{ resource.hours_of_operation }}
                  </span>
                </span>
              </v-list-item-subtitle>
              <template #append>
                <div v-if="getWikiResourceLocations(resource.id).length > 0" class="d-flex flex-wrap gap-1 align-center">
                  <v-chip 
                    v-for="loc in getWikiResourceLocations(resource.id)" 
                    :key="loc.id" 
                    size="x-small" 
                    variant="outlined"
                    color="primary"
                  >
                    {{ loc.name }}
                  </v-chip>
                </div>
              </template>
            </v-list-item>
            <v-divider v-if="idx < filteredFacilityResources.length - 1" />
          </template>
        </v-list>
      </v-card>

      <!-- No Results -->
      <v-card v-else variant="outlined" rounded="lg" class="pa-6 text-center">
        <v-icon size="48" color="grey" class="mb-3">mdi-tools</v-icon>
        <h3 class="text-h6 mb-2">No vendors found</h3>
        <p class="text-body-2 text-grey">Try adjusting your search or filter criteria</p>
      </v-card>

      <!-- Add Resource Dialog -->
      <v-dialog v-model="showAddResourceDialog" max-width="600" persistent>
        <v-card rounded="lg">
          <v-card-title class="d-flex align-center">
            <v-icon color="brown" class="mr-2">mdi-plus-circle</v-icon>
            Add Facility Resource
          </v-card-title>
          <v-divider />
          <v-card-text>
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="newResource.name"
                  label="Vendor / Contact Name *"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Name is required']"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="newResource.resource_type"
                  :items="facilityResourceTypes"
                  label="Service Type *"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Type is required']"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="newResource.company_name"
                  label="Company Name"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="newResource.phone"
                  label="Phone"
                  variant="outlined"
                  density="compact"
                  prepend-inner-icon="mdi-phone"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="newResource.email"
                  label="Email"
                  variant="outlined"
                  density="compact"
                  prepend-inner-icon="mdi-email-outline"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="newResource.hours_of_operation"
                  label="Hours of Operation"
                  variant="outlined"
                  density="compact"
                  prepend-inner-icon="mdi-clock-outline"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="newResource.notes"
                  label="Notes"
                  variant="outlined"
                  density="compact"
                  rows="2"
                  auto-grow
                />
              </v-col>
              <v-col cols="6">
                <v-checkbox
                  v-model="newResource.emergency_contact"
                  label="Emergency Contact"
                  color="error"
                  density="compact"
                  hide-details
                />
              </v-col>
              <v-col cols="6">
                <v-checkbox
                  v-model="newResource.is_preferred"
                  label="Preferred Vendor"
                  color="amber"
                  density="compact"
                  hide-details
                />
              </v-col>
            </v-row>
          </v-card-text>
          <v-divider />
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="showAddResourceDialog = false; resetNewResource()">Cancel</v-btn>
            <v-btn
              color="brown"
              variant="flat"
              :loading="addResourceSaving"
              :disabled="!newResource.name || !newResource.resource_type"
              @click="saveNewResource"
            >
              Save Resource
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>

    <!-- Medical Partners Section -->
    <template v-if="showMedPartners">
      <div class="d-flex align-center justify-space-between mb-4">
        <h3 class="text-h6 font-weight-bold">
          <v-icon color="indigo" class="mr-2">mdi-handshake</v-icon>
          Med Ops Partners
        </h3>
        <div class="d-flex align-center gap-2">
          <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="showMedPartners = false">
            Back to Wiki
          </v-btn>
        </div>
      </div>

      <!-- === Partners === -->
        <div class="d-flex align-center justify-end gap-2 mb-3">
          <v-btn-toggle v-model="medPartnerViewMode" mandatory density="compact" variant="outlined" color="indigo">
            <v-btn value="list" size="small">
              <v-icon size="18">mdi-format-list-bulleted</v-icon>
            </v-btn>
            <v-btn value="tile" size="small">
              <v-icon size="18">mdi-view-grid</v-icon>
            </v-btn>
          </v-btn-toggle>
          <v-btn color="indigo" variant="flat" size="small" prepend-icon="mdi-plus" @click="showAddPartnerDialog = true">
            Add Partner
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

        <!-- Partner Tile View -->
        <v-row v-else-if="filteredMedPartners.length > 0 && medPartnerViewMode === 'tile'">
          <v-col v-for="partner in filteredMedPartners" :key="partner.id" cols="12" sm="6" md="4">
          <v-card variant="outlined" rounded="lg" class="h-100 partner-wiki-card clickable-card" @click="openPartnerDetail(partner)">
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
              <div v-if="partner.account_number" class="text-body-2 mb-1">
                <v-icon size="14" class="mr-1">mdi-pound</v-icon>
                <span class="text-medium-emphasis">Acct:</span> {{ partner.account_number }}
              </div>
              <div v-if="partner.location_code" class="text-body-2 mb-1">
                <v-icon size="14" class="mr-1">mdi-map-marker</v-icon>
                {{ partner.location_code }}
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

      <!-- Partner List View (default) -->
      <v-card v-else-if="filteredMedPartners.length > 0 && medPartnerViewMode === 'list'" variant="outlined" rounded="lg">
        <v-list lines="two" class="py-0">
          <template v-for="(partner, idx) in filteredMedPartners" :key="partner.id">
            <v-list-item class="py-3 clickable-item" @click="openPartnerDetail(partner)">
              <template #prepend>
                <v-avatar :color="partner.color || 'indigo'" size="40" class="mr-3">
                  <v-icon size="20" color="white">{{ partner.icon || 'mdi-factory' }}</v-icon>
                </v-avatar>
              </template>
              <v-list-item-title class="font-weight-bold text-subtitle-2 mb-1">
                {{ partner.name }}
                <v-chip size="x-small" variant="tonal" color="indigo" class="ml-2">
                  {{ partner.category || 'Other' }}
                </v-chip>
              </v-list-item-title>
              <v-list-item-subtitle>
                <span class="d-inline-flex align-center gap-3 flex-wrap">
                  <span v-if="partner.contact_name" class="text-body-2">
                    <v-icon size="12" class="mr-1">mdi-account</v-icon>{{ partner.contact_name }}
                  </span>
                  <span v-if="partner.contact_phone" class="text-body-2">
                    <v-icon size="12" class="mr-1">mdi-phone</v-icon>
                    <a :href="'tel:' + partner.contact_phone" class="text-decoration-none">{{ partner.contact_phone }}</a>
                  </span>
                  <span v-if="partner.contact_email" class="text-body-2">
                    <v-icon size="12" class="mr-1">mdi-email-outline</v-icon>
                    <a :href="'mailto:' + partner.contact_email" class="text-decoration-none">{{ partner.contact_email }}</a>
                  </span>
                  <span v-if="partner.website" class="text-body-2">
                    <v-icon size="12" class="mr-1">mdi-web</v-icon>
                    <a :href="partner.website" target="_blank" class="text-decoration-none">{{ partner.website }}</a>
                  </span>
                  <span v-if="partner.location_code" class="text-body-2 text-grey">
                    <v-icon size="12" class="mr-1">mdi-map-marker</v-icon>{{ partner.location_code }}
                  </span>
                  <span v-if="partner.account_number" class="text-body-2 text-grey">
                    <v-icon size="12" class="mr-1">mdi-pound</v-icon>{{ partner.account_number }}
                  </span>
                </span>
              </v-list-item-subtitle>
            </v-list-item>
            <v-divider v-if="idx < filteredMedPartners.length - 1" />
          </template>
        </v-list>
      </v-card>

        <!-- No Results -->
        <v-card v-else variant="outlined" rounded="lg" class="pa-6 text-center">
          <v-icon size="48" color="grey" class="mb-3">mdi-handshake</v-icon>
          <h3 class="text-h6 mb-2">No partners found</h3>
          <p class="text-body-2 text-grey">Try adjusting your search or filter criteria</p>
        </v-card>

      <!-- Add Partner Dialog -->
      <v-dialog v-model="showAddPartnerDialog" max-width="600" persistent>
        <v-card rounded="lg">
          <v-card-title class="d-flex align-center">
            <v-icon color="indigo" class="mr-2">mdi-plus-circle</v-icon>
            Add Medical Partner
          </v-card-title>
          <v-divider />
          <v-card-text>
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="newPartner.name"
                  label="Partner Name *"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Name is required']"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="newPartner.category"
                  :items="partnerCategoryChoices"
                  label="Category"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="newPartner.contact_name"
                  label="Contact Name"
                  variant="outlined"
                  density="compact"
                  prepend-inner-icon="mdi-account"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="newPartner.contact_phone"
                  label="Phone"
                  variant="outlined"
                  density="compact"
                  prepend-inner-icon="mdi-phone"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="newPartner.contact_email"
                  label="Email"
                  variant="outlined"
                  density="compact"
                  prepend-inner-icon="mdi-email-outline"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="newPartner.website"
                  label="Website"
                  variant="outlined"
                  density="compact"
                  prepend-inner-icon="mdi-web"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="newPartner.description"
                  label="Description"
                  variant="outlined"
                  density="compact"
                  rows="2"
                  auto-grow
                />
              </v-col>
            </v-row>
          </v-card-text>
          <v-divider />
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="showAddPartnerDialog = false; resetNewPartner()">Cancel</v-btn>
            <v-btn
              color="indigo"
              variant="flat"
              :loading="addPartnerSaving"
              :disabled="!newPartner.name"
              @click="saveNewPartner"
            >
              Save Partner
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Partner Detail Dialog -->
      <v-dialog v-model="showPartnerDetailDialog" max-width="700" scrollable>
        <v-card v-if="selectedPartner" rounded="lg">
          <v-card-title class="d-flex align-center justify-space-between pa-4">
            <div class="d-flex align-center gap-3">
              <v-avatar :color="selectedPartner.color || 'indigo'" size="48">
                <v-icon size="24" color="white">{{ selectedPartner.icon || 'mdi-factory' }}</v-icon>
              </v-avatar>
              <div>
                <h3 class="text-h6 font-weight-bold">{{ selectedPartner.name }}</h3>
                <v-chip size="x-small" variant="tonal" color="indigo">
                  {{ selectedPartner.category || 'Other' }}
                </v-chip>
              </div>
            </div>
            <v-btn icon="mdi-close" variant="text" aria-label="Close" @click="showPartnerDetailDialog = false" />
          </v-card-title>

          <v-divider />

          <v-card-text class="pa-4">
            <!-- Description -->
            <div v-if="selectedPartner.description" class="mb-4">
              <div class="text-subtitle-2 text-medium-emphasis mb-1">Description</div>
              <p class="text-body-1" style="white-space: pre-wrap;">{{ selectedPartner.description }}</p>
            </div>

            <!-- Contact Information -->
            <div class="mb-4">
              <div class="text-subtitle-2 text-medium-emphasis mb-2">
                <v-icon size="16" class="mr-1">mdi-card-account-details</v-icon>
                Contact Information
              </div>
              <v-row dense>
                <v-col cols="12" sm="6">
                  <div class="text-caption text-medium-emphasis">Contact Name</div>
                  <div class="text-body-2">{{ selectedPartner.contact_name || 'N/A' }}</div>
                </v-col>
                <v-col cols="12" sm="6">
                  <div class="text-caption text-medium-emphasis">Phone</div>
                  <div class="text-body-2">
                    <a v-if="selectedPartner.contact_phone" :href="'tel:' + selectedPartner.contact_phone" class="text-decoration-none">
                      <v-icon size="14" class="mr-1">mdi-phone</v-icon>{{ selectedPartner.contact_phone }}
                    </a>
                    <span v-else>N/A</span>
                  </div>
                </v-col>
                <v-col cols="12" sm="6">
                  <div class="text-caption text-medium-emphasis">Email</div>
                  <div class="text-body-2">
                    <a v-if="selectedPartner.contact_email" :href="'mailto:' + selectedPartner.contact_email" class="text-decoration-none">
                      <v-icon size="14" class="mr-1">mdi-email-outline</v-icon>{{ selectedPartner.contact_email }}
                    </a>
                    <span v-else>N/A</span>
                  </div>
                </v-col>
                <v-col cols="12" sm="6">
                  <div class="text-caption text-medium-emphasis">Website</div>
                  <div class="text-body-2">
                    <a v-if="selectedPartner.website" :href="selectedPartner.website" target="_blank" class="text-decoration-none">
                      <v-icon size="14" class="mr-1">mdi-web</v-icon>{{ selectedPartner.website }}
                    </a>
                    <span v-else>N/A</span>
                  </div>
                </v-col>
              </v-row>
            </div>

            <!-- Account & Ordering -->
            <div v-if="selectedPartner.account_number || selectedPartner.order_method || selectedPartner.payment_method" class="mb-4">
              <div class="text-subtitle-2 text-medium-emphasis mb-2">
                <v-icon size="16" class="mr-1">mdi-clipboard-text</v-icon>
                Account &amp; Ordering
              </div>
              <v-row dense>
                <v-col v-if="selectedPartner.account_number" cols="12" sm="6">
                  <div class="text-caption text-medium-emphasis">Account Number</div>
                  <div class="text-body-2 font-weight-medium">{{ selectedPartner.account_number }}</div>
                </v-col>
                <v-col v-if="selectedPartner.order_method" cols="12" sm="6">
                  <div class="text-caption text-medium-emphasis">Order Method</div>
                  <div class="text-body-2">{{ selectedPartner.order_method }}</div>
                </v-col>
                <v-col v-if="selectedPartner.payment_method" cols="12" sm="6">
                  <div class="text-caption text-medium-emphasis">Payment Method</div>
                  <div class="text-body-2">{{ selectedPartner.payment_method }}</div>
                </v-col>
              </v-row>
            </div>

            <!-- Portal Credentials (role-restricted) -->
            <div v-if="selectedPartner.portal_username || selectedPartner.portal_password" class="mb-4">
              <div class="text-subtitle-2 text-medium-emphasis mb-2">
                <v-icon size="16" class="mr-1">mdi-shield-lock</v-icon>
                Login Credentials
                <v-btn
                  v-if="canRevealCredentials"
                  size="x-small"
                  variant="text"
                  :color="isCredentialRevealed(selectedPartner.id) ? 'deep-purple' : 'grey'"
                  class="ml-2"
                  @click="toggleCredential(selectedPartner.id)"
                >
                  <v-icon size="16" class="mr-1">{{ isCredentialRevealed(selectedPartner.id) ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
                  {{ isCredentialRevealed(selectedPartner.id) ? 'Hide' : 'Reveal' }}
                </v-btn>
              </div>
              <v-row v-if="canRevealCredentials" dense>
                <v-col v-if="selectedPartner.portal_username" cols="12" sm="6">
                  <div class="text-caption text-medium-emphasis">User ID</div>
                  <div class="text-body-2">
                    <span v-if="isCredentialRevealed(selectedPartner.id)" class="credential-revealed">{{ selectedPartner.portal_username }}</span>
                    <span v-else class="credential-hidden">••••••••</span>
                  </div>
                </v-col>
                <v-col v-if="selectedPartner.portal_password" cols="12" sm="6">
                  <div class="text-caption text-medium-emphasis">Password</div>
                  <div class="text-body-2">
                    <span v-if="isCredentialRevealed(selectedPartner.id)" class="credential-revealed">{{ selectedPartner.portal_password }}</span>
                    <span v-else class="credential-hidden">••••••••</span>
                  </div>
                </v-col>
              </v-row>
              <v-alert v-else type="warning" variant="tonal" density="compact" class="mt-1">
                <v-icon start size="14">mdi-lock</v-icon>
                Credentials restricted to Admin, Supervisor, and Manager roles.
              </v-alert>
            </div>

            <!-- Location & Department -->
            <div v-if="selectedPartner.location_code || selectedPartner.department" class="mb-4">
              <div class="text-subtitle-2 text-medium-emphasis mb-2">
                <v-icon size="16" class="mr-1">mdi-map-marker</v-icon>
                Location &amp; Department
              </div>
              <v-row dense>
                <v-col v-if="selectedPartner.location_code" cols="12" sm="6">
                  <div class="text-caption text-medium-emphasis">Location</div>
                  <div class="text-body-2">{{ selectedPartner.location_code }}</div>
                </v-col>
                <v-col v-if="selectedPartner.department" cols="12" sm="6">
                  <div class="text-caption text-medium-emphasis">Department</div>
                  <div class="text-body-2">{{ selectedPartner.department }}</div>
                </v-col>
              </v-row>
            </div>

            <!-- Products -->
            <div v-if="selectedPartner.products?.length" class="mb-4">
              <div class="text-subtitle-2 text-medium-emphasis mb-2">
                <v-icon size="16" class="mr-1">mdi-package-variant</v-icon>
                Products
              </div>
              <div class="d-flex flex-wrap gap-2">
                <v-chip v-for="product in selectedPartner.products" :key="product" size="small" variant="tonal" color="indigo">
                  {{ product }}
                </v-chip>
              </div>
            </div>

            <!-- Browser Preference -->
            <div v-if="selectedPartner.browser_preference" class="mb-4">
              <div class="text-subtitle-2 text-medium-emphasis mb-1">
                <v-icon size="16" class="mr-1">mdi-web</v-icon>
                Browser Preference
              </div>
              <div class="text-body-2">{{ selectedPartner.browser_preference }}</div>
            </div>

            <!-- Notes -->
            <div v-if="selectedPartner.notes" class="mb-4">
              <div class="text-subtitle-2 text-medium-emphasis mb-1">
                <v-icon size="16" class="mr-1">mdi-note-text</v-icon>
                Notes
              </div>
              <p class="text-body-2" style="white-space: pre-wrap;">{{ selectedPartner.notes }}</p>
            </div>

            <!-- Vendor Info -->
            <div v-if="selectedPartner.vendor_info" class="mb-4">
              <div class="text-subtitle-2 text-medium-emphasis mb-1">
                <v-icon size="16" class="mr-1">mdi-information</v-icon>
                Additional Info
              </div>
              <p class="text-body-2" style="white-space: pre-wrap;">{{ selectedPartner.vendor_info }}</p>
            </div>
          </v-card-text>

          <v-divider />
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="showPartnerDetailDialog = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>



    <!-- Facility Resource Detail Dialog -->
    <v-dialog v-model="showResourceDetailDialog" max-width="700" scrollable>
      <v-card v-if="selectedResource" rounded="lg">
        <v-card-title class="d-flex align-center justify-space-between pa-4">
          <div class="d-flex align-center gap-3">
            <v-avatar :color="getFacilityTypeColor(selectedResource.resource_type)" size="48">
              <v-icon size="24" color="white">{{ getFacilityTypeIcon(selectedResource.resource_type) }}</v-icon>
            </v-avatar>
            <div>
              <h3 class="text-h6 font-weight-bold">{{ selectedResource.name }}</h3>
              <div class="d-flex align-center gap-2">
                <v-chip size="x-small" variant="tonal" :color="getFacilityTypeColor(selectedResource.resource_type)">
                  {{ formatFacilityType(selectedResource.resource_type) }}
                </v-chip>
                <v-chip v-if="selectedResource.emergency_contact" size="x-small" color="error" variant="flat">
                  <v-icon start size="10">mdi-alert</v-icon>
                  Emergency
                </v-chip>
                <v-chip v-if="selectedResource.is_preferred" size="x-small" color="amber" variant="flat">
                  <v-icon start size="10">mdi-star</v-icon>
                  Preferred
                </v-chip>
              </div>
            </div>
          </div>
          <v-btn icon="mdi-close" variant="text" aria-label="Close" @click="showResourceDetailDialog = false" />
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-4">
          <!-- Company -->
          <div v-if="selectedResource.company_name" class="mb-4">
            <div class="text-subtitle-2 text-medium-emphasis mb-1">
              <v-icon size="16" class="mr-1">mdi-domain</v-icon>
              Company
            </div>
            <div class="text-body-1">{{ selectedResource.company_name }}</div>
          </div>

          <!-- Contact Information -->
          <div class="mb-4">
            <div class="text-subtitle-2 text-medium-emphasis mb-2">
              <v-icon size="16" class="mr-1">mdi-card-account-details</v-icon>
              Contact Information
            </div>
            <v-row dense>
              <v-col cols="12" sm="6">
                <div class="text-caption text-medium-emphasis">Phone</div>
                <div class="text-body-2">
                  <a v-if="selectedResource.phone" :href="'tel:' + selectedResource.phone" class="text-decoration-none">
                    <v-icon size="14" class="mr-1">mdi-phone</v-icon>{{ selectedResource.phone }}
                  </a>
                  <span v-else>N/A</span>
                </div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="text-caption text-medium-emphasis">Email</div>
                <div class="text-body-2">
                  <a v-if="selectedResource.email" :href="'mailto:' + selectedResource.email" class="text-decoration-none">
                    <v-icon size="14" class="mr-1">mdi-email-outline</v-icon>{{ selectedResource.email }}
                  </a>
                  <span v-else>N/A</span>
                </div>
              </v-col>
            </v-row>
          </div>

          <!-- Hours -->
          <div v-if="selectedResource.hours_of_operation" class="mb-4">
            <div class="text-subtitle-2 text-medium-emphasis mb-1">
              <v-icon size="16" class="mr-1">mdi-clock-outline</v-icon>
              Hours of Operation
            </div>
            <div class="text-body-1">{{ selectedResource.hours_of_operation }}</div>
          </div>

          <!-- Address -->
          <div v-if="selectedResource.address" class="mb-4">
            <div class="text-subtitle-2 text-medium-emphasis mb-1">
              <v-icon size="16" class="mr-1">mdi-map-marker</v-icon>
              Address
            </div>
            <div class="text-body-1">{{ selectedResource.address }}</div>
          </div>

          <!-- Assigned Locations -->
          <div v-if="getWikiResourceLocations(selectedResource.id).length > 0" class="mb-4">
            <div class="text-subtitle-2 text-medium-emphasis mb-2">
              <v-icon size="16" class="mr-1">mdi-map-marker</v-icon>
              Assigned Locations
            </div>
            <div class="d-flex flex-wrap gap-2">
              <v-chip 
                v-for="loc in getWikiResourceLocations(selectedResource.id)" 
                :key="loc.id" 
                size="small" 
                variant="tonal"
                color="primary"
              >
                <v-icon start size="14">mdi-map-marker</v-icon>
                {{ loc.name }}
                <v-icon v-if="loc.is_primary" end size="14" color="amber">mdi-star</v-icon>
              </v-chip>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="selectedResource.notes" class="mb-4">
            <div class="text-subtitle-2 text-medium-emphasis mb-1">
              <v-icon size="16" class="mr-1">mdi-note-text</v-icon>
              Notes
            </div>
            <p class="text-body-1" style="white-space: pre-wrap;">{{ selectedResource.notes }}</p>
          </div>
        </v-card-text>

        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showResourceDetailDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
const authStore = useAuthStore()
const canRevealCredentials = computed(() =>
  authStore.isAdmin || authStore.isManager || authStore.isSupervisor || authStore.isSuperAdmin
)

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
const facilityLocations = ref<any[]>([])
const facilityResourceLocations = ref<any[]>([])
const facilitySearch = ref('')
const facilityTypeFilter = ref<string | null>(null)
const facilityViewMode = ref<'list' | 'tile'>('list')
const showAddResourceDialog = ref(false)
const addResourceSaving = ref(false)
const newResource = ref({
  name: '',
  company_name: '',
  resource_type: '',
  phone: '',
  email: '',
  hours_of_operation: '',
  notes: '',
  emergency_contact: false,
  is_preferred: false,
})
const showMedPartners = ref(false)
const medPartners = ref<any[]>([])
const medPartnersLoading = ref(false)
const medPartnerSearch = ref('')
const medPartnerCategoryFilter = ref<string | null>(null)
const medPartnerViewMode = ref<'list' | 'tile'>('list')
const revealedCredentials = ref<Set<string>>(new Set())
const showAddPartnerDialog = ref(false)
const addPartnerSaving = ref(false)
const selectedPartner = ref<any>(null)
const showPartnerDetailDialog = ref(false)
const selectedResource = ref<any>(null)
const showResourceDetailDialog = ref(false)
const newPartner = ref({
  name: '',
  category: 'Other',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  website: '',
  description: '',
})
const partnerCategoryChoices = [
  'Laboratory',
  'Equipment/Imaging',
  'Supplies & Consumables',
  'Software & Digital',
  'Pharmacy & Compounding',
  'Professional Services',
  'Office & Administrative',
  'Other'
]
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
    const [resourcesRes, locationsRes, resourceLocsRes] = await Promise.all([
      supabase.from('facility_resources').select('*').eq('is_active', true).order('name'),
      supabase.from('locations').select('id, name').eq('is_active', true).order('name'),
      supabase.from('facility_resource_locations').select('*')
    ])
    if (resourcesRes.error) throw resourcesRes.error
    if (locationsRes.error) throw locationsRes.error
    if (resourceLocsRes.error) throw resourceLocsRes.error
    facilityResources.value = resourcesRes.data || []
    facilityLocations.value = locationsRes.data || []
    facilityResourceLocations.value = resourceLocsRes.data || []
  } catch (err) {
    console.error('[Wiki] Failed to load facility resources:', err)
  } finally {
    facilityResourcesLoading.value = false
  }
}

function getWikiResourceLocations(resourceId: string) {
  const locs = facilityResourceLocations.value.filter(rl => rl.resource_id === resourceId)
  return locs.map(rl => {
    const loc = facilityLocations.value.find(l => l.id === rl.location_id)
    return loc ? { ...loc, is_primary: rl.is_primary } : null
  }).filter(Boolean)
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

function resetNewResource() {
  newResource.value = {
    name: '',
    company_name: '',
    resource_type: '',
    phone: '',
    email: '',
    hours_of_operation: '',
    notes: '',
    emergency_contact: false,
    is_preferred: false,
  }
}

async function saveNewResource() {
  if (!newResource.value.name || !newResource.value.resource_type) return
  addResourceSaving.value = true
  try {
    const { error } = await supabase
      .from('facility_resources')
      .insert({
        ...newResource.value,
        is_active: true,
      })
    if (error) throw error
    showAddResourceDialog.value = false
    resetNewResource()
    await loadFacilityResources()
  } catch (err) {
    console.error('[Wiki] Failed to save facility resource:', err)
  } finally {
    addResourceSaving.value = false
  }
}

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
      p.contact_phone?.includes(medPartnerSearch.value) ||
      p.category?.toLowerCase().includes(q) ||
      p.account_number?.toLowerCase().includes(q) ||
      p.notes?.toLowerCase().includes(q) ||
      p.location_code?.toLowerCase().includes(q) ||
      p.department?.toLowerCase().includes(q) ||
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

function resetNewPartner() {
  newPartner.value = {
    name: '',
    category: 'Other',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    website: '',
    description: '',
  }
}

function openPartnerDetail(partner: any) {
  selectedPartner.value = partner
  showPartnerDetailDialog.value = true
}

function openResourceDetail(resource: any) {
  selectedResource.value = resource
  showResourceDetailDialog.value = true
}

async function saveNewPartner() {
  if (!newPartner.value.name) return
  addPartnerSaving.value = true
  try {
    const { error } = await supabase
      .from('med_ops_partners')
      .insert({
        ...newPartner.value,
        is_active: true,
      })
    if (error) throw error
    showAddPartnerDialog.value = false
    resetNewPartner()
    await loadMedPartners()
  } catch (err) {
    console.error('[Wiki] Failed to save medical partner:', err)
  } finally {
    addPartnerSaving.value = false
  }
}

function toggleCredential(contactId: string) {
  if (!canRevealCredentials.value) return
  if (revealedCredentials.value.has(contactId)) {
    revealedCredentials.value.delete(contactId)
  } else {
    revealedCredentials.value.add(contactId)
  }
  // Force reactivity
  revealedCredentials.value = new Set(revealedCredentials.value)
}

function isCredentialRevealed(contactId: string) {
  return revealedCredentials.value.has(contactId)
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
  transition: all 0.2s;
}

.facility-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.partner-wiki-card {
  transition: all 0.2s;
}

.partner-wiki-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.clickable-card {
  cursor: pointer;
}

.clickable-item {
  cursor: pointer;
}

.clickable-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.04);
}

.credential-hidden {
  color: #999;
  letter-spacing: 2px;
  user-select: none;
}

.credential-revealed {
  color: #4a148c;
  background-color: rgba(103, 58, 183, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  word-break: break-all;
}

.med-contacts-table {
  width: 100% !important;
}

.med-contacts-table :deep(table) {
  table-layout: fixed !important;
  width: 100% !important;
}

.med-contacts-table :deep(th) {
  white-space: nowrap !important;
  font-size: 11px !important;
  padding: 6px 8px !important;
  overflow: hidden;
}

.med-contacts-table :deep(td) {
  font-size: 12px !important;
  padding: 4px 8px !important;
  overflow: hidden;
  text-overflow: ellipsis;
}

.med-contacts-table :deep(th:nth-child(1)),
.med-contacts-table :deep(td:nth-child(1)) {
  width: 16% !important;
}

.med-contacts-table :deep(th:nth-child(2)),
.med-contacts-table :deep(td:nth-child(2)) {
  width: 12% !important;
}

.med-contacts-table :deep(th:nth-child(3)),
.med-contacts-table :deep(td:nth-child(3)) {
  width: 13% !important;
}

.med-contacts-table :deep(th:nth-child(4)),
.med-contacts-table :deep(td:nth-child(4)) {
  width: 14% !important;
}

.med-contacts-table :deep(th:nth-child(5)),
.med-contacts-table :deep(td:nth-child(5)) {
  width: 18% !important;
}

.med-contacts-table :deep(th:nth-child(6)),
.med-contacts-table :deep(td:nth-child(6)) {
  width: 12% !important;
}

.med-contacts-table :deep(th:nth-child(7)),
.med-contacts-table :deep(td:nth-child(7)) {
  width: 12% !important;
}

.med-contacts-table :deep(th:nth-child(8)),
.med-contacts-table :deep(td:nth-child(8)) {
  width: 3% !important;
}
</style>
