<template>
  <div class="candidate-profile-page">
    <!-- Loading State -->
    <div v-if="isLoading" class="d-flex justify-center align-center min-h-70vh">
      <v-progress-circular indeterminate color="primary" size="64" />
    </div>

    <!-- Error State -->
    <v-alert v-else-if="error" type="error" class="ma-4">
      {{ error }}
      <template #append>
        <v-btn variant="text" @click="loadCandidate">Retry</v-btn>
      </template>
    </v-alert>

    <!-- Main Content -->
    <template v-else-if="candidate">
      <!-- Header with Hire Button -->
      <div class="d-flex align-center justify-space-between mb-6 flex-wrap gap-3">
        <div class="d-flex align-center gap-4">
          <v-btn icon="mdi-arrow-left" variant="text" aria-label="Go back" @click="navigateTo('/recruiting')" />
          <v-avatar :color="getStatusColor(candidate.status)" size="64">
            <v-img v-if="candidate.avatar_url" :src="candidate.avatar_url" cover />
            <span v-else class="text-white font-weight-bold text-h5">
              {{ candidate.first_name?.[0] }}{{ candidate.last_name?.[0] }}
            </span>
          </v-avatar>
          <div>
            <h1 class="text-h4 font-weight-bold">
              {{ candidate.first_name }} {{ candidate.last_name }}
            </h1>
            <div class="d-flex align-center gap-2 mt-1">
              <v-chip :color="getStatusColor(candidate.status)" size="small" label>
                {{ formatStatus(candidate.status) }}
              </v-chip>
              <span class="text-body-2 text-grey">
                Applied {{ formatDate(candidate.applied_at) }}
              </span>
            </div>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="d-flex gap-2 flex-wrap">
          <!-- Status Change Menu -->
          <v-menu>
            <template #activator="{ props }">
              <v-btn variant="outlined" v-bind="props">
                <v-icon start>mdi-swap-horizontal</v-icon>
                Change Status
              </v-btn>
            </template>
            <v-list density="compact">
              <v-list-item
                v-for="status in availableStatuses"
                :key="status.value"
                @click="updateCandidateStatus(status.value)"
              >
                <template #prepend>
                  <v-icon :color="getStatusColor(status.value)" size="18">mdi-circle</v-icon>
                </template>
                <v-list-item-title>{{ status.title }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>

          <!-- HIRE BUTTON - The Main CTA -->
          <v-btn
            v-if="candidate.status !== 'hired' && candidate.status !== 'rejected'"
            color="success"
            size="large"
            @click="showHireModal = true"
          >
            <v-icon start>mdi-account-check</v-icon>
            HIRE CANDIDATE
          </v-btn>
        </div>
      </div>

      <!-- Main Content - 3 Column Layout -->
      <v-row>
        <!-- COLUMN 1: Identity Card (Sticky) -->
        <v-col cols="12" md="3">
          <div class="sticky-sidebar">
            <!-- Hero Card -->
            <v-card rounded="lg" class="hero-card mb-4" elevation="4">
              <div class="hero-header text-center pa-4">
                <v-avatar size="100" class="mb-3">
                  <v-img v-if="candidate.avatar_url" :src="candidate.avatar_url" cover />
                  <span v-else class="text-h3 font-weight-bold bg-white text-primary" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
                    {{ candidate.first_name?.[0] }}{{ candidate.last_name?.[0] }}
                  </span>
                </v-avatar>
                
                <h2 class="text-h6 font-weight-bold text-white">
                  {{ candidate.first_name }} {{ candidate.last_name }}
                </h2>
                <p class="text-body-2 text-white opacity-80">
                  {{ candidate.job_positions?.title || 'General Applicant' }}
                </p>
              </div>
            </v-card>

            <!-- Contact Info -->
            <v-card rounded="lg" class="mb-4">
              <v-card-title class="text-subtitle-2 pb-1">
                <v-icon size="18" class="mr-1">mdi-card-account-details</v-icon>
                Contact Info
              </v-card-title>
              <v-list density="compact" class="pt-0">
                <v-list-item>
                  <template #prepend><v-icon size="18" color="grey">mdi-email</v-icon></template>
                  <v-list-item-title class="text-body-2">{{ candidate.email || 'Not set' }}</v-list-item-title>
                </v-list-item>
                <v-list-item>
                  <template #prepend><v-icon size="18" color="grey">mdi-phone</v-icon></template>
                  <v-list-item-title class="text-body-2">{{ candidate.phone_mobile || candidate.phone || 'Not set' }}</v-list-item-title>
                </v-list-item>
                <v-list-item v-if="candidate.address_line1">
                  <template #prepend><v-icon size="18" color="grey">mdi-map-marker</v-icon></template>
                  <v-list-item-title class="text-body-2">
                    {{ candidate.city }}, {{ candidate.state }}
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-card>

            <!-- License Info -->
            <v-card v-if="candidate.license_number" rounded="lg" class="mb-4">
              <v-card-title class="text-subtitle-2 pb-1">
                <v-icon size="18" class="mr-1">mdi-certificate</v-icon>
                Professional License
              </v-card-title>
              <v-card-text class="pt-2">
                <div class="d-flex justify-space-between mb-1">
                  <span class="text-caption text-grey">Type</span>
                  <span class="text-body-2">{{ candidate.license_type || 'RVT' }}</span>
                </div>
                <div class="d-flex justify-space-between mb-1">
                  <span class="text-caption text-grey">Number</span>
                  <span class="text-body-2">{{ candidate.license_number }}</span>
                </div>
                <div class="d-flex justify-space-between">
                  <span class="text-caption text-grey">Expires</span>
                  <span class="text-body-2" :class="isLicenseExpiringSoon ? 'text-warning' : ''">
                    {{ formatDate(candidate.license_expiration) }}
                  </span>
                </div>
              </v-card-text>
            </v-card>

            <!-- Compensation Expectations -->
            <v-card rounded="lg">
              <v-card-title class="text-subtitle-2 pb-1">
                <v-icon size="18" class="mr-1">mdi-cash</v-icon>
                Compensation Expectation
              </v-card-title>
              <v-card-text class="pt-2">
                <div v-if="candidate.expected_hourly_rate || candidate.expected_salary">
                  <div v-if="candidate.expected_hourly_rate" class="d-flex justify-space-between mb-1">
                    <span class="text-caption text-grey">Hourly</span>
                    <span class="text-body-2 font-weight-medium">${{ candidate.expected_hourly_rate }}/hr</span>
                  </div>
                  <div v-if="candidate.expected_salary" class="d-flex justify-space-between">
                    <span class="text-caption text-grey">Salary</span>
                    <span class="text-body-2 font-weight-medium">${{ candidate.expected_salary?.toLocaleString() }}/yr</span>
                  </div>
                </div>
                <p v-else class="text-caption text-grey text-center mb-0">Not specified</p>
              </v-card-text>
            </v-card>
          </div>
        </v-col>

        <!-- COLUMN 2 & 3: Tabbed Content -->
        <v-col cols="12" md="9">
          <v-card rounded="lg">
            <v-tabs v-model="activeTab" color="primary">
              <v-tab value="bio">
                <v-icon start>mdi-account</v-icon>
                Bio / Contact
              </v-tab>
              <v-tab value="interviews">
                <v-icon start>mdi-account-voice</v-icon>
                Interviews
              </v-tab>
              <v-tab value="skills">
                <v-icon start>mdi-star</v-icon>
                Skills Assessment
              </v-tab>
              <v-tab value="documents">
                <v-icon start>mdi-folder</v-icon>
                Documents
              </v-tab>
              <v-tab value="notes">
                <v-icon start>mdi-note-text</v-icon>
                Notes
              </v-tab>
            </v-tabs>

            <v-divider />

            <v-window v-model="activeTab">
              <!-- TAB 1: Bio / Contact Info -->
              <v-window-item value="bio">
                <v-card-text>
                  <v-row>
                    <v-col cols="12"><h3 class="text-subtitle-1 font-weight-bold mb-3">Personal Information</h3></v-col>
                    <v-col cols="12" sm="6">
                      <v-text-field
                        v-model="editForm.first_name"
                        label="First Name *"
                        variant="outlined"
                        density="compact"
                        :rules="[v => !!v || 'Required']"
                      />
                    </v-col>
                    <v-col cols="12" sm="6">
                      <v-text-field
                        v-model="editForm.last_name"
                        label="Last Name *"
                        variant="outlined"
                        density="compact"
                        :rules="[v => !!v || 'Required']"
                      />
                    </v-col>
                    <v-col cols="12" sm="6">
                      <v-text-field
                        v-model="editForm.preferred_name"
                        label="Preferred Name"
                        variant="outlined"
                        density="compact"
                      />
                    </v-col>
                    <v-col cols="12" sm="6">
                      <v-text-field
                        v-model="editForm.date_of_birth"
                        label="Date of Birth"
                        type="date"
                        variant="outlined"
                        density="compact"
                      />
                    </v-col>
                  </v-row>

                  <v-row class="mt-4">
                    <v-col cols="12"><h3 class="text-subtitle-1 font-weight-bold mb-3">Contact Information</h3></v-col>
                    <v-col cols="12" sm="6">
                      <v-text-field
                        v-model="editForm.email"
                        label="Email *"
                        type="email"
                        variant="outlined"
                        density="compact"
                        prepend-inner-icon="mdi-email"
                      />
                    </v-col>
                    <v-col cols="12" sm="6">
                      <v-text-field
                        v-model="editForm.phone_mobile"
                        label="Mobile Phone"
                        variant="outlined"
                        density="compact"
                        prepend-inner-icon="mdi-cellphone"
                      />
                    </v-col>
                    <v-col cols="12">
                      <v-text-field
                        v-model="editForm.address_line1"
                        label="Street Address"
                        variant="outlined"
                        density="compact"
                        prepend-inner-icon="mdi-home"
                      />
                    </v-col>
                    <v-col cols="12" sm="4">
                      <v-text-field v-model="editForm.city" label="City" variant="outlined" density="compact" />
                    </v-col>
                    <v-col cols="12" sm="4">
                      <v-text-field v-model="editForm.state" label="State" variant="outlined" density="compact" />
                    </v-col>
                    <v-col cols="12" sm="4">
                      <v-text-field v-model="editForm.postal_code" label="ZIP Code" variant="outlined" density="compact" />
                    </v-col>
                  </v-row>

                  <v-row class="mt-4">
                    <v-col cols="12"><h3 class="text-subtitle-1 font-weight-bold mb-3">Emergency Contact</h3></v-col>
                    <v-col cols="12" sm="4">
                      <v-text-field
                        v-model="editForm.emergency_contact_name"
                        label="Name"
                        variant="outlined"
                        density="compact"
                      />
                    </v-col>
                    <v-col cols="12" sm="4">
                      <v-text-field
                        v-model="editForm.emergency_contact_phone"
                        label="Phone"
                        variant="outlined"
                        density="compact"
                      />
                    </v-col>
                    <v-col cols="12" sm="4">
                      <v-text-field
                        v-model="editForm.emergency_contact_relationship"
                        label="Relationship"
                        variant="outlined"
                        density="compact"
                      />
                    </v-col>
                  </v-row>

                  <v-row class="mt-4">
                    <v-col cols="12"><h3 class="text-subtitle-1 font-weight-bold mb-3">Professional License</h3></v-col>
                    <v-col cols="12" sm="3">
                      <v-text-field
                        v-model="editForm.license_type"
                        label="License Type"
                        placeholder="e.g., RVT, DVM"
                        variant="outlined"
                        density="compact"
                      />
                    </v-col>
                    <v-col cols="12" sm="3">
                      <v-text-field
                        v-model="editForm.license_number"
                        label="License Number"
                        variant="outlined"
                        density="compact"
                      />
                    </v-col>
                    <v-col cols="12" sm="3">
                      <v-text-field
                        v-model="editForm.license_state"
                        label="State"
                        variant="outlined"
                        density="compact"
                      />
                    </v-col>
                    <v-col cols="12" sm="3">
                      <v-text-field
                        v-model="editForm.license_expiration"
                        label="Expiration Date"
                        type="date"
                        variant="outlined"
                        density="compact"
                      />
                    </v-col>
                  </v-row>

                  <v-row class="mt-4">
                    <v-col cols="12"><h3 class="text-subtitle-1 font-weight-bold mb-3">Compensation Expectations</h3></v-col>
                    <v-col cols="12" sm="4">
                      <v-select
                        v-model="editForm.pay_type_preference"
                        :items="[
                          { title: 'Hourly', value: 'hourly' },
                          { title: 'Salary', value: 'salary' },
                          { title: 'Either', value: 'either' }
                        ]"
                        label="Pay Preference"
                        variant="outlined"
                        density="compact"
                        clearable
                      />
                    </v-col>
                    <v-col cols="12" sm="4">
                      <v-text-field
                        v-model.number="editForm.expected_hourly_rate"
                        label="Expected Hourly Rate ($)"
                        type="number"
                        step="0.50"
                        variant="outlined"
                        density="compact"
                        prefix="$"
                      />
                    </v-col>
                    <v-col cols="12" sm="4">
                      <v-text-field
                        v-model.number="editForm.expected_salary"
                        label="Expected Salary ($)"
                        type="number"
                        variant="outlined"
                        density="compact"
                        prefix="$"
                      />
                    </v-col>
                  </v-row>

                  <v-row class="mt-4">
                    <v-col cols="12"><h3 class="text-subtitle-1 font-weight-bold mb-3">Position Details</h3></v-col>
                    <v-col cols="12" sm="6">
                      <v-select
                        v-model="editForm.target_position_id"
                        :items="positions"
                        item-title="title"
                        item-value="id"
                        label="Target Position"
                        variant="outlined"
                        density="compact"
                        clearable
                      />
                    </v-col>
                    <v-col cols="12" sm="6">
                      <v-select
                        v-model="editForm.department_id"
                        :items="departments"
                        item-title="name"
                        item-value="id"
                        label="Department"
                        variant="outlined"
                        density="compact"
                        clearable
                      />
                    </v-col>
                    <v-col cols="12" sm="6">
                      <v-select
                        v-model="editForm.location_id"
                        :items="locations"
                        item-title="name"
                        item-value="id"
                        label="Location"
                        variant="outlined"
                        density="compact"
                        clearable
                      />
                    </v-col>
                    <v-col cols="12" sm="6">
                      <v-text-field
                        v-model="editForm.source"
                        label="Application Source"
                        placeholder="e.g., Indeed, Referral, Website"
                        variant="outlined"
                        density="compact"
                      />
                    </v-col>
                  </v-row>

                  <div class="d-flex justify-end mt-6">
                    <v-btn 
                      color="primary" 
                      size="large"
                      :loading="saving"
                      @click="saveCandidate"
                    >
                      <v-icon start>mdi-content-save</v-icon>
                      Save Changes
                    </v-btn>
                  </div>
                </v-card-text>
              </v-window-item>

              <!-- TAB 2: Interviews -->
              <v-window-item value="interviews">
                <v-card-text>
                  <div class="d-flex align-center mb-4">
                    <h3 class="text-subtitle-1 font-weight-bold">Interview History</h3>
                    <v-spacer />
                    <v-btn color="primary" @click="showInterviewDialog = true">
                      <v-icon start>mdi-plus</v-icon>
                      Log Interview
                    </v-btn>
                  </div>

                  <!-- Loading State -->
                  <div v-if="loadingInterviews" class="text-center py-8">
                    <v-progress-circular indeterminate color="primary" />
                  </div>

                  <!-- Interviews List -->
                  <template v-else-if="interviews.length > 0">
                    <v-timeline density="compact" side="end">
                      <v-timeline-item
                        v-for="interview in interviews"
                        :key="interview.id"
                        :dot-color="getInterviewStatusColor(interview.status)"
                        size="small"
                      >
                        <template #opposite>
                          <div class="text-caption text-grey">
                            {{ formatDate(interview.scheduled_at || interview.created_at) }}
                          </div>
                        </template>
                        <v-card variant="outlined" class="mb-2">
                          <v-card-text class="py-3 px-4">
                            <div class="d-flex align-center mb-2">
                              <v-chip size="small" :color="getInterviewTypeColor(interview.interview_type)" variant="tonal" class="mr-2">
                                {{ formatInterviewType(interview.interview_type) }}
                              </v-chip>
                              <v-chip size="small" :color="getInterviewStatusColor(interview.status)" variant="flat">
                                {{ interview.status }}
                              </v-chip>
                              <v-spacer />
                              <v-rating
                                v-if="interview.overall_score"
                                :model-value="interview.overall_score"
                                readonly
                                density="compact"
                                size="small"
                                color="amber"
                              />
                            </div>
                            <div v-if="interview.interviewer?.first_name" class="text-body-2 mb-2">
                              <v-icon size="small" class="mr-1">mdi-account-tie</v-icon>
                              Interviewer: {{ interview.interviewer.first_name }} {{ interview.interviewer.last_name }}
                            </div>
                            <div v-if="interview.recommendation" class="mb-2">
                              <v-chip 
                                size="small" 
                                :color="getRecommendationColor(interview.recommendation)"
                                variant="tonal"
                              >
                                {{ formatRecommendation(interview.recommendation) }}
                              </v-chip>
                            </div>
                            <div v-if="interview.notes" class="text-body-2 text-grey mb-3">
                              {{ interview.notes }}
                            </div>
                            <v-row v-if="interview.strengths || interview.concerns" dense class="mt-2">
                              <v-col v-if="interview.strengths" cols="12" md="6">
                                <div class="text-caption font-weight-bold text-success mb-1">
                                  <v-icon size="small">mdi-plus-circle</v-icon> Strengths
                                </div>
                                <div class="text-body-2">{{ interview.strengths }}</div>
                              </v-col>
                              <v-col v-if="interview.concerns" cols="12" md="6">
                                <div class="text-caption font-weight-bold text-error mb-1">
                                  <v-icon size="small">mdi-minus-circle</v-icon> Concerns
                                </div>
                                <div class="text-body-2">{{ interview.concerns }}</div>
                              </v-col>
                            </v-row>
                            <v-row v-if="interview.technical_score || interview.communication_score || interview.cultural_fit_score" dense class="mt-2">
                              <v-col v-if="interview.technical_score" cols="4">
                                <div class="text-caption">Technical</div>
                                <v-rating :model-value="interview.technical_score" readonly size="x-small" color="blue" density="compact" />
                              </v-col>
                              <v-col v-if="interview.communication_score" cols="4">
                                <div class="text-caption">Communication</div>
                                <v-rating :model-value="interview.communication_score" readonly size="x-small" color="green" density="compact" />
                              </v-col>
                              <v-col v-if="interview.cultural_fit_score" cols="4">
                                <div class="text-caption">Cultural Fit</div>
                                <v-rating :model-value="interview.cultural_fit_score" readonly size="x-small" color="purple" density="compact" />
                              </v-col>
                            </v-row>
                          </v-card-text>
                        </v-card>
                      </v-timeline-item>
                    </v-timeline>
                  </template>

                  <!-- Empty State -->
                  <div v-else class="text-center py-12">
                    <v-icon size="64" color="grey-lighten-2">mdi-account-voice</v-icon>
                    <p class="text-body-1 text-grey mt-4">No interviews logged yet</p>
                    <p class="text-caption text-grey mb-4">Click the button above to log the first interview</p>
                    <v-btn color="primary" @click="showInterviewDialog = true">
                      <v-icon start>mdi-plus</v-icon>
                      Log First Interview
                    </v-btn>
                  </div>
                </v-card-text>
              </v-window-item>

              <!-- TAB 3: Skills Assessment -->
              <v-window-item value="skills">
                <v-card-text>
                  <div class="d-flex align-center mb-4">
                    <h3 class="text-subtitle-1 font-weight-bold">Skills Assessment</h3>
                    <v-spacer />
                    <v-chip color="primary" variant="tonal">
                      {{ candidateSkills.length }} skills rated
                    </v-chip>
                  </div>

                  <p class="text-body-2 text-grey mb-4">
                    Rate the candidate's skills during the interview process (0-5 scale). 
                    These ratings will transfer to their employee profile when hired.
                  </p>

                  <!-- Category Filter -->
                  <v-select
                    v-model="selectedSkillCategory"
                    :items="skillCategories"
                    label="Select Category"
                    variant="outlined"
                    density="compact"
                    prepend-inner-icon="mdi-filter"
                    clearable
                    class="mb-4"
                    placeholder="All Categories"
                  />

                  <!-- Skills Grid by Category -->
                  <template v-if="selectedSkillCategory">
                    <v-row>
                      <v-col 
                        v-for="skill in filteredSkillsByCategory" 
                        :key="skill.id" 
                        cols="12" 
                        sm="6" 
                        md="4"
                      >
                        <v-card variant="outlined" class="pa-3">
                          <div class="d-flex align-center justify-space-between mb-2">
                            <span class="text-body-2 font-weight-medium">{{ skill.name }}</span>
                            <v-chip 
                              size="small" 
                              :color="getSkillColor(getSkillRating(skill.id))"
                              variant="flat"
                            >
                              {{ getSkillRating(skill.id) }}/5
                            </v-chip>
                          </div>
                          <v-rating
                            :model-value="getSkillRating(skill.id)"
                            color="amber"
                            hover
                            density="compact"
                            @update:model-value="updateSkillRating(skill.id, Number($event))"
                          />
                          <div class="text-caption text-grey mt-1">{{ skill.description || skill.category }}</div>
                        </v-card>
                      </v-col>
                    </v-row>

                    <v-alert v-if="filteredSkillsByCategory.length === 0" type="info" variant="tonal" class="mt-4">
                      No skills found in this category. Add skills in the Skill Library.
                    </v-alert>
                  </template>

                  <!-- All Categories Overview (when no filter selected) -->
                  <template v-else>
                    <div v-for="category in skillCategories" :key="category" class="mb-6">
                      <div class="d-flex align-center mb-3">
                        <h4 class="text-subtitle-2 font-weight-bold">{{ category }}</h4>
                        <v-chip size="x-small" class="ml-2" variant="tonal">
                          {{ getSkillsByCategory(category).length }} skills
                        </v-chip>
                        <v-spacer />
                        <v-btn 
                          variant="text" 
                          size="small" 
                          color="primary"
                          @click="selectedSkillCategory = category"
                        >
                          Rate Skills
                          <v-icon end>mdi-chevron-right</v-icon>
                        </v-btn>
                      </div>
                      
                      <!-- Show rated skills summary for this category -->
                      <div class="d-flex flex-wrap gap-2">
                        <v-chip 
                          v-for="skill in getRatedSkillsInCategory(category)" 
                          :key="skill.id"
                          size="small"
                          :color="getSkillColor(getSkillRating(skill.id))"
                          variant="tonal"
                        >
                          {{ skill.name }}: {{ getSkillRating(skill.id) }}/5
                        </v-chip>
                        <span v-if="getRatedSkillsInCategory(category).length === 0" class="text-caption text-grey">
                          No skills rated yet
                        </span>
                      </div>
                    </div>
                  </template>

                  <v-alert v-if="availableSkills.length === 0" type="info" variant="tonal" class="mt-4">
                    No skills defined in the skill library. Add skills in the Skill Library to rate candidates.
                  </v-alert>
                </v-card-text>
              </v-window-item>

              <!-- TAB 3: Documents (The Vault) -->
              <v-window-item value="documents">
                <v-card-text>
                  <div class="d-flex align-center mb-4">
                    <h3 class="text-subtitle-1 font-weight-bold">Documents</h3>
                    <v-spacer />
                    <v-btn color="primary" variant="tonal" @click="showUploadDialog = true">
                      <v-icon start>mdi-upload</v-icon>
                      Upload Document
                    </v-btn>
                  </div>

                  <!-- Drop Zone -->
                  <div 
                    class="drop-zone pa-6 text-center mb-4"
                    :class="{ 'drag-over': isDragging }"
                    @drop.prevent="handleFileDrop"
                    @dragover.prevent="isDragging = true"
                    @dragleave="isDragging = false"
                  >
                    <v-icon size="48" color="grey">mdi-cloud-upload</v-icon>
                    <p class="text-body-1 text-grey mt-2 mb-0">Drag & drop files here</p>
                    <p class="text-caption text-grey">Resumes, cover letters, certifications, etc.</p>
                  </div>

                  <!-- Document List -->
                  <v-list v-if="documents.length > 0" lines="two">
                    <v-list-item v-for="doc in documents" :key="doc.id" class="px-0">
                      <template #prepend>
                        <v-avatar :color="getDocCategoryColor(doc.category)" size="40">
                          <v-icon color="white">{{ getDocIcon(doc.file_type) }}</v-icon>
                        </v-avatar>
                      </template>
                      <v-list-item-title>{{ doc.file_name }}</v-list-item-title>
                      <v-list-item-subtitle>
                        <v-chip size="x-small" variant="tonal" class="mr-2">{{ doc.category }}</v-chip>
                        {{ formatDate(doc.created_at) }}
                      </v-list-item-subtitle>
                      <template #append>
                        <v-btn icon="mdi-download" variant="text" size="small" aria-label="Download" :href="doc.file_url" target="_blank" />
                        <v-btn icon="mdi-delete" variant="text" size="small" color="error" aria-label="Delete" @click="deleteDocument(doc)" />
                      </template>
                    </v-list-item>
                  </v-list>

                  <div v-else class="text-center py-12">
                    <v-icon size="64" color="grey-lighten-2">mdi-file-document-outline</v-icon>
                    <p class="text-body-1 text-grey mt-4">No documents uploaded yet</p>
                    <p class="text-caption text-grey">Upload resumes, cover letters, and certifications</p>
                  </div>
                </v-card-text>
              </v-window-item>

              <!-- TAB 4: Notes / Timeline -->
              <v-window-item value="notes">
                <v-card-text>
                  <div class="d-flex align-center mb-4">
                    <h3 class="text-subtitle-1 font-weight-bold">Interview Notes & Timeline</h3>
                    <v-spacer />
                    <v-chip variant="tonal">{{ notes.length }} notes</v-chip>
                  </div>

                  <!-- Add Note Form -->
                  <div class="mb-4">
                    <v-textarea
                      v-model="newNote"
                      placeholder="Add a note about this candidate..."
                      variant="outlined"
                      rows="3"
                      hide-details
                      class="mb-2"
                    />
                    <div class="d-flex gap-2">
                      <v-select
                        v-model="newNoteType"
                        :items="noteTypes"
                        item-title="title"
                        item-value="value"
                        density="compact"
                        variant="outlined"
                        hide-details
                        style="max-width: 180px;"
                      />
                      <v-spacer />
                      <v-btn 
                        color="primary"
                        :loading="postingNote"
                        :disabled="!newNote.trim()"
                        @click="addNote"
                      >
                        <v-icon start>mdi-send</v-icon>
                        Add Note
                      </v-btn>
                    </div>
                  </div>

                  <v-divider class="my-4" />

                  <!-- Notes List -->
                  <div v-if="notes.length > 0" class="notes-timeline">
                    <div 
                      v-for="note in notes" 
                      :key="note.id" 
                      class="note-item mb-4 pa-3 rounded-lg"
                      :class="note.is_pinned ? 'bg-amber-lighten-5' : 'bg-grey-lighten-4'"
                    >
                      <div class="d-flex align-start gap-3">
                        <v-avatar size="32" :color="getNoteTypeColor(note.note_type)">
                          <v-icon size="16" color="white">{{ getNoteTypeIcon(note.note_type) }}</v-icon>
                        </v-avatar>
                        <div class="flex-grow-1">
                          <div class="d-flex align-center mb-1">
                            <span class="text-body-2 font-weight-medium">
                              {{ note.author?.first_name || 'System' }} {{ note.author?.last_name || '' }}
                            </span>
                            <v-chip size="x-small" variant="tonal" :color="getNoteTypeColor(note.note_type)" class="ml-2">
                              {{ note.note_type }}
                            </v-chip>
                            <v-icon v-if="note.is_pinned" size="14" color="amber" class="ml-1">mdi-pin</v-icon>
                            <v-spacer />
                            <span class="text-caption text-grey">{{ formatTimestamp(note.created_at) }}</span>
                          </div>
                          <p class="text-body-2 mb-0">{{ note.note }}</p>
                          <div class="mt-2">
                            <v-btn 
                              icon="mdi-pin" 
                              size="x-small" 
                              variant="text"
                              :color="note.is_pinned ? 'amber' : 'grey'"
                              @click="togglePinNote(note)"
                            />
                            <v-btn 
                              icon="mdi-delete" 
                              size="x-small" 
                              variant="text" 
                              color="error"
                              @click="deleteNote(note)"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-else class="text-center py-12">
                    <v-icon size="64" color="grey-lighten-2">mdi-note-text-outline</v-icon>
                    <p class="text-body-1 text-grey mt-4">No notes yet</p>
                    <p class="text-caption text-grey">Add interview notes and observations</p>
                  </div>
                </v-card-text>
              </v-window-item>
            </v-window>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- HIRE CANDIDATE MODAL -->
    <v-dialog v-model="showHireModal" max-width="600" persistent>
      <v-card rounded="lg">
        <v-card-title class="bg-success text-white d-flex align-center py-4">
          <v-icon start>mdi-account-check</v-icon>
          Hire {{ candidate?.first_name }} {{ candidate?.last_name }}
        </v-card-title>

        <v-card-text class="pt-6">
          <p class="text-body-1 mb-4">
            You are about to convert this candidate into a full employee. 
            All skills, documents, and notes will be transferred to their employee profile.
          </p>

          <v-form ref="hireForm">
            <v-row>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="hireData.employment_type"
                  :items="employmentTypes"
                  label="Employment Type *"
                  variant="outlined"
                  :rules="[v => !!v || 'Required']"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="hireData.job_title_id"
                  :items="positions"
                  item-title="title"
                  item-value="id"
                  label="Job Title *"
                  variant="outlined"
                  :rules="[v => !!v || 'Required']"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="hireData.start_date"
                  label="Start Date *"
                  type="date"
                  variant="outlined"
                  :rules="[v => !!v || 'Required']"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="hireData.pay_type"
                  :items="['hourly', 'salary']"
                  label="Pay Type *"
                  variant="outlined"
                  :rules="[v => !!v || 'Required']"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="hireData.starting_wage"
                  :label="hireData.pay_type === 'hourly' ? 'Hourly Rate ($) *' : 'Annual Salary ($) *'"
                  type="number"
                  step="0.01"
                  variant="outlined"
                  prefix="$"
                  :rules="[v => !!v || 'Required', v => v > 0 || 'Must be greater than 0']"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="hireData.department_id"
                  :items="departments"
                  item-title="name"
                  item-value="id"
                  label="Department"
                  variant="outlined"
                  clearable
                />
              </v-col>
              <v-col cols="12">
                <v-select
                  v-model="hireData.location_id"
                  :items="locations"
                  item-title="name"
                  item-value="id"
                  label="Primary Location"
                  variant="outlined"
                  clearable
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="showHireModal = false" :disabled="hiring">Cancel</v-btn>
          <v-spacer />
          <v-btn 
            color="success" 
            size="large"
            :loading="hiring"
            @click="hireCandidate"
          >
            <v-icon start>mdi-check</v-icon>
            Confirm Hire
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Upload Document Dialog -->
    <v-dialog v-model="showUploadDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title>Upload Document</v-card-title>
        <v-card-text>
          <v-file-input
            v-model="uploadFile"
            label="Select File"
            variant="outlined"
            prepend-icon="mdi-paperclip"
            class="mb-3"
          />
          <v-select
            v-model="uploadCategory"
            :items="documentCategories"
            label="Category"
            variant="outlined"
            class="mb-3"
          />
          <v-text-field
            v-model="uploadDescription"
            label="Description (optional)"
            variant="outlined"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showUploadDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="uploading" :disabled="!uploadFile" @click="uploadDocument">
            Upload
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Interview Dialog -->
    <RecruitingInterviewDialog
      v-model="showInterviewDialog"
      :candidate="candidate"
      :employees="employees"
      @saved="onInterviewSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { format, formatDistanceToNow, differenceInDays } from 'date-fns'
import type { Candidate, CandidateSkill, CandidateDocument, CandidateNote } from '~/types/database.types'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'management']
})

const route = useRoute()
const supabase = useSupabaseClient()
const toast = useToast()
const authStore = useAuthStore()

const candidateId = computed(() => route.params.id as string)

// State
const isLoading = ref(true)
const error = ref('')
const candidate = ref<Candidate | null>(null)
const candidateSkills = ref<CandidateSkill[]>([])
const documents = ref<CandidateDocument[]>([])
const notes = ref<CandidateNote[]>([])
const availableSkills = ref<any[]>([])
const positions = ref<any[]>([])
const departments = ref<any[]>([])
const locations = ref<any[]>([])

// UI State
const activeTab = ref('bio')
const saving = ref(false)
const showHireModal = ref(false)
const hiring = ref(false)
const showUploadDialog = ref(false)
const uploading = ref(false)
const isDragging = ref(false)
const postingNote = ref(false)
const selectedSkillCategory = ref<string | null>(null)

// Interview state
const showInterviewDialog = ref(false)
const loadingInterviews = ref(false)
const interviews = ref<any[]>([])
const employees = ref<any[]>([])

// Edit form
const editForm = ref<Partial<Candidate>>({})

// Hire wizard data
const hireData = ref({
  employment_type: 'full-time',
  job_title_id: '',
  start_date: '',
  starting_wage: 0,
  pay_type: 'hourly',
  department_id: '',
  location_id: ''
})

// Notes
const newNote = ref('')
const newNoteType = ref('general')

// Upload
const uploadFile = ref<File | null>(null)
const uploadCategory = ref('general')
const uploadDescription = ref('')

// Constants
const noteTypes = [
  { title: 'General', value: 'general' },
  { title: 'Interview', value: 'interview' },
  { title: 'Screening', value: 'screening' },
  { title: 'Reference Check', value: 'reference_check' },
  { title: 'Background Check', value: 'background_check' },
  { title: 'Offer', value: 'offer' }
]

const documentCategories = [
  { title: 'General', value: 'general' },
  { title: 'Resume', value: 'resume' },
  { title: 'Cover Letter', value: 'cover_letter' },
  { title: 'Certification', value: 'certification' },
  { title: 'License', value: 'license' },
  { title: 'Reference', value: 'reference' },
  { title: 'Background Check', value: 'background_check' },
  { title: 'Other', value: 'other' }
]

const employmentTypes = [
  { title: 'Full Time', value: 'full-time' },
  { title: 'Part Time', value: 'part-time' },
  { title: 'Contract', value: 'contract' },
  { title: 'Per Diem', value: 'per-diem' }
]

const statusOptions = [
  { title: 'New', value: 'new' },
  { title: 'Screening', value: 'screening' },
  { title: 'Interview', value: 'interview' },
  { title: 'Offer', value: 'offer' },
  { title: 'Hired', value: 'hired' },
  { title: 'Rejected', value: 'rejected' }
]

const availableStatuses = computed(() => 
  statusOptions.filter(s => s.value !== candidate.value?.status)
)

const isLicenseExpiringSoon = computed(() => {
  if (!candidate.value?.license_expiration) return false
  return differenceInDays(new Date(candidate.value.license_expiration), new Date()) < 90
})

// Skill categories computed
const skillCategories = computed(() => {
  const categories = new Set<string>()
  availableSkills.value.forEach(skill => {
    if (skill.category) categories.add(skill.category)
  })
  return Array.from(categories).sort()
})

const filteredSkillsByCategory = computed(() => {
  if (!selectedSkillCategory.value) return availableSkills.value
  return availableSkills.value.filter(skill => skill.category === selectedSkillCategory.value)
})

function getSkillsByCategory(category: string) {
  return availableSkills.value.filter(skill => skill.category === category)
}

function getRatedSkillsInCategory(category: string) {
  const categorySkills = getSkillsByCategory(category)
  return categorySkills.filter(skill => getSkillRating(skill.id) > 0)
}

// Load data
async function loadCandidate() {
  isLoading.value = true
  error.value = ''

  try {
    // Load candidate
    const { data: candidateData, error: candidateError } = await supabase
      .from('candidates')
      .select(`
        *,
        job_positions(id, title),
        department:departments(id, name),
        location:locations(id, name)
      `)
      .eq('id', candidateId.value)
      .single()

    if (candidateError) throw candidateError
    
    const cData = candidateData as any
    candidate.value = cData
    editForm.value = { ...cData }

    // Pre-fill hire data
    if (cData.target_position_id) {
      hireData.value.job_title_id = cData.target_position_id
    }
    if (cData.department_id) {
      hireData.value.department_id = cData.department_id
    }
    if (cData.location_id) {
      hireData.value.location_id = cData.location_id
    }
    if (cData.expected_hourly_rate) {
      hireData.value.starting_wage = cData.expected_hourly_rate
      hireData.value.pay_type = 'hourly'
    } else if (cData.expected_salary) {
      hireData.value.starting_wage = cData.expected_salary
      hireData.value.pay_type = 'salary'
    }

    // Load skills
    const { data: skillsData } = await supabase
      .from('candidate_skills')
      .select('*, skill:skill_library(*)')
      .eq('candidate_id', candidateId.value)

    candidateSkills.value = skillsData || []

    // Load documents
    const { data: docsData } = await supabase
      .from('candidate_documents')
      .select('*')
      .eq('candidate_id', candidateId.value)
      .order('created_at', { ascending: false })

    documents.value = docsData || []

    // Load notes
    const { data: notesData } = await supabase
      .from('candidate_notes')
      .select('*, author:profiles(first_name, last_name)')
      .eq('candidate_id', candidateId.value)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    notes.value = notesData || []

    // Load reference data
    const [skillsRes, positionsRes, deptsRes, locsRes] = await Promise.all([
      supabase.from('skill_library').select('*').eq('is_active', true).order('category'),
      supabase.from('job_positions').select('*').order('title'),
      supabase.from('departments').select('*').order('name'),
      supabase.from('locations').select('*').eq('is_active', true).order('name')
    ])

    availableSkills.value = skillsRes.data || []
    positions.value = positionsRes.data || []
    departments.value = deptsRes.data || []
    locations.value = locsRes.data || []

    // Load employees for interview dialog
    const { data: employeesData } = await supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('is_active', true)
      .order('first_name')
    
    employees.value = (employeesData || []).map(e => ({
      id: e.id,
      full_name: `${e.first_name} ${e.last_name}`
    }))

    // Load interviews
    await loadInterviews()

  } catch (err: any) {
    error.value = err.message || 'Failed to load candidate'
    console.error('Load error:', err)
  } finally {
    isLoading.value = false
  }
}

// Load interviews
async function loadInterviews() {
  loadingInterviews.value = true
  try {
    const { data, error: err } = await supabase
      .from('candidate_interviews')
      .select(`
        *,
        interviewer:employees!candidate_interviews_interviewer_employee_id_fkey(first_name, last_name)
      `)
      .eq('candidate_id', candidateId.value)
      .order('scheduled_at', { ascending: false })
    
    if (err) throw err
    interviews.value = data || []
  } catch (err: any) {
    console.error('Error loading interviews:', err)
  } finally {
    loadingInterviews.value = false
  }
}

// Interview helper functions
function getInterviewStatusColor(status: string): string {
  const colors: Record<string, string> = {
    scheduled: 'blue',
    completed: 'success',
    cancelled: 'grey',
    no_show: 'error',
    rescheduled: 'warning'
  }
  return colors[status] || 'grey'
}

function getInterviewTypeColor(type: string): string {
  const colors: Record<string, string> = {
    phone_screen: 'blue-lighten-2',
    video: 'purple',
    in_person: 'green',
    technical: 'orange',
    panel: 'teal',
    final: 'deep-purple'
  }
  return colors[type] || 'grey'
}

function formatInterviewType(type: string): string {
  const labels: Record<string, string> = {
    phone_screen: 'Phone Screen',
    video: 'Video Interview',
    in_person: 'In Person',
    technical: 'Technical',
    panel: 'Panel Interview',
    final: 'Final Interview'
  }
  return labels[type] || type
}

function getRecommendationColor(rec: string): string {
  const colors: Record<string, string> = {
    strong_hire: 'success',
    hire: 'light-green',
    no_decision: 'grey',
    no_hire: 'orange',
    strong_no_hire: 'error'
  }
  return colors[rec] || 'grey'
}

function formatRecommendation(rec: string): string {
  const labels: Record<string, string> = {
    strong_hire: 'Strong Hire',
    hire: 'Hire',
    no_decision: 'No Decision',
    no_hire: 'No Hire',
    strong_no_hire: 'Strong No Hire'
  }
  return labels[rec] || rec
}

// Handle interview saved
function onInterviewSaved() {
  showInterviewDialog.value = false
  loadInterviews()
  toast.success('Interview logged successfully')
}

// Save candidate changes
async function saveCandidate() {
  saving.value = true
  try {
    const { error: updateError } = await supabase
      .from('candidates')
      .update(editForm.value as any)
      .eq('id', candidateId.value)

    if (updateError) throw updateError
    
    // Refresh candidate data
    await loadCandidate()
    toast.success('Candidate updated successfully')
  } catch (err: any) {
    toast.error(err.message || 'Failed to save changes')
  } finally {
    saving.value = false
  }
}

// Update status
async function updateCandidateStatus(newStatus: string) {
  try {
    const { error: updateError } = await supabase
      .from('candidates')
      .update({ status: newStatus } as any)
      .eq('id', candidateId.value)

    if (updateError) throw updateError
    
    if (candidate.value) {
      candidate.value.status = newStatus as any
    }
    toast.success(`Status changed to ${formatStatus(newStatus)}`)
  } catch (err: any) {
    toast.error(err.message || 'Failed to update status')
  }
}

// Skills
function getSkillRating(skillId: string): number {
  const skill = candidateSkills.value.find(s => s.skill_id === skillId)
  return skill?.rating || 0
}

async function updateSkillRating(skillId: string, rating: number) {
  try {
    const existing = candidateSkills.value.find(s => s.skill_id === skillId)
    
    if (existing) {
      const { error } = await supabase
        .from('candidate_skills')
        .update({ rating, rated_at: new Date().toISOString() } as any)
        .eq('id', existing.id)
      if (error) throw error
      existing.rating = rating
    } else {
      const { data, error } = await supabase
        .from('candidate_skills')
        .insert({
          candidate_id: candidateId.value,
          skill_id: skillId,
          rating,
          rated_by: authStore.profile?.id
        } as any)
        .select()
        .single()
      if (error) throw error
      candidateSkills.value.push(data as any)
    }
  } catch (err: any) {
    toast.error('Failed to update skill rating')
  }
}

// Notes
async function addNote() {
  if (!newNote.value.trim()) return
  postingNote.value = true
  
  try {
    const { data, error } = await supabase
      .from('candidate_notes')
      .insert({
        candidate_id: candidateId.value,
        author_id: authStore.profile?.id,
        note: newNote.value,
        note_type: newNoteType.value
      } as any)
      .select('*, author:profiles(first_name, last_name)')
      .single()

    if (error) throw error
    notes.value.unshift(data as any)
    newNote.value = ''
    toast.success('Note added')
  } catch (err: any) {
    toast.error('Failed to add note')
  } finally {
    postingNote.value = false
  }
}

async function togglePinNote(note: CandidateNote) {
  try {
    const { error } = await supabase
      .from('candidate_notes')
      .update({ is_pinned: !note.is_pinned } as any)
      .eq('id', note.id)
    if (error) throw error
    note.is_pinned = !note.is_pinned
  } catch (err: any) {
    toast.error('Failed to update note')
  }
}

async function deleteNote(note: CandidateNote) {
  try {
    const { error } = await supabase
      .from('candidate_notes')
      .delete()
      .eq('id', note.id)
    if (error) throw error
    notes.value = notes.value.filter(n => n.id !== note.id)
    toast.success('Note deleted')
  } catch (err: any) {
    toast.error('Failed to delete note')
  }
}

// Documents
async function uploadDocument() {
  // Handle v-file-input which returns an array in Vuetify 3
  const fileInput = uploadFile.value
  const file = Array.isArray(fileInput) ? fileInput[0] : fileInput
  
  if (!file) return
  uploading.value = true
  
  try {
    // Upload to storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${candidateId.value}/${Date.now()}.${fileExt}`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('candidate-documents')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('candidate-documents')
      .getPublicUrl(fileName)

    // Create document record
    const { data: docData, error: docError } = await supabase
      .from('candidate_documents')
      .insert({
        candidate_id: candidateId.value,
        file_name: file.name,
        file_url: publicUrl,
        file_type: file.type,
        file_size: file.size,
        category: uploadCategory.value,
        description: uploadDescription.value || null
      } as any)
      .select()
      .single()

    if (docError) throw docError
    
    documents.value.unshift(docData as any)
    showUploadDialog.value = false
    uploadFile.value = null
    uploadDescription.value = ''
    toast.success('Document uploaded')
  } catch (err: any) {
    toast.error(err.message || 'Failed to upload document')
  } finally {
    uploading.value = false
  }
}

async function handleFileDrop(event: DragEvent) {
  isDragging.value = false
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    uploadFile.value = files[0] || null
    showUploadDialog.value = true
  }
}

async function deleteDocument(doc: CandidateDocument) {
  try {
    const { error } = await supabase
      .from('candidate_documents')
      .delete()
      .eq('id', doc.id)
    if (error) throw error
    documents.value = documents.value.filter(d => d.id !== doc.id)
    toast.success('Document deleted')
  } catch (err: any) {
    toast.error('Failed to delete document')
  }
}

// HIRE CANDIDATE - The main action
async function hireCandidate() {
  hiring.value = true
  
  try {
    // Call the RPC function
    const { data: newEmployeeId, error: hireError } = await (supabase as any)
      .rpc('promote_candidate_to_employee', {
        p_candidate_id: candidateId.value,
        p_employment_type: hireData.value.employment_type,
        p_job_title_id: hireData.value.job_title_id,
        p_start_date: hireData.value.start_date,
        p_starting_wage: hireData.value.starting_wage,
        p_pay_type: hireData.value.pay_type,
        p_department_id: hireData.value.department_id || null,
        p_location_id: hireData.value.location_id || null
      })

    if (hireError) throw hireError

    toast.success(`${candidate.value?.first_name} has been hired!`)
    
    // Redirect to the roster page
    await navigateTo(`/roster`)
    
  } catch (err: any) {
    console.error('Hire error:', err)
    toast.error(err.message || 'Failed to hire candidate')
  } finally {
    hiring.value = false
  }
}

// Helpers
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    new: 'blue',
    screening: 'purple',
    interview: 'orange',
    offer: 'teal',
    hired: 'success',
    rejected: 'error'
  }
  return colors[status] || 'grey'
}

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A'
  return format(new Date(dateStr), 'MMM d, yyyy')
}

function formatTimestamp(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
}

function getSkillColor(level: number): string {
  if (level <= 1) return 'grey'
  if (level <= 2) return 'orange'
  if (level <= 3) return 'blue'
  if (level <= 4) return 'teal'
  return 'success'
}

function getNoteTypeColor(type: string): string {
  const colors: Record<string, string> = {
    general: 'grey',
    interview: 'purple',
    screening: 'blue',
    reference_check: 'teal',
    background_check: 'orange',
    offer: 'success',
    rejection: 'error',
    system: 'grey-darken-1'
  }
  return colors[type] || 'grey'
}

function getNoteTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    general: 'mdi-note-text',
    interview: 'mdi-account-voice',
    screening: 'mdi-file-search',
    reference_check: 'mdi-phone-check',
    background_check: 'mdi-shield-search',
    offer: 'mdi-handshake',
    rejection: 'mdi-close-circle',
    system: 'mdi-cog'
  }
  return icons[type] || 'mdi-note'
}

function getDocCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    resume: 'blue',
    cover_letter: 'purple',
    certification: 'success',
    license: 'teal',
    reference: 'orange',
    background_check: 'amber',
    general: 'grey',
    other: 'grey'
  }
  return colors[category] || 'grey'
}

function getDocIcon(fileType: string | null): string {
  if (!fileType) return 'mdi-file'
  if (fileType.includes('pdf')) return 'mdi-file-pdf-box'
  if (fileType.includes('word') || fileType.includes('document')) return 'mdi-file-word'
  if (fileType.includes('image')) return 'mdi-file-image'
  return 'mdi-file'
}

// Init
onMounted(() => {
  loadCandidate()
})
</script>

<style scoped>
.sticky-sidebar {
  position: sticky;
  top: 24px;
}

.hero-card {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  color: white;
}

.hero-header {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  padding: 24px;
  border-radius: 12px 12px 0 0;
}

.drop-zone {
  border: 2px dashed #ccc;
  border-radius: 12px;
  transition: all 0.2s;
}

.drop-zone:hover,
.drop-zone.drag-over {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.05);
}

.note-item {
  transition: all 0.2s;
}

.note-item:hover {
  background: #f5f5f5 !important;
}
</style>
