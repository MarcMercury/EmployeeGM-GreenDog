<template>
  <div class="personnel-record bg-slate-50 min-h-screen">
    <!-- Loading State -->
    <div v-if="isLoading" class="d-flex justify-center align-center" style="min-height: 70vh;">
      <v-progress-circular indeterminate color="primary" size="64" />
    </div>

    <!-- Error State -->
    <v-alert v-else-if="error" type="error" class="ma-4">
      {{ error }}
      <template #append>
        <v-btn variant="text" @click="loadEmployeeData">Retry</v-btn>
      </template>
    </v-alert>

    <!-- Main Content - 2 Pane Layout -->
    <v-row v-else-if="employee" class="h-100 ma-0">
      
      <!-- ============================================ -->
      <!-- ZONE 1: THE IDENTITY RAIL (Left Sidebar)    -->
      <!-- 1/3 Width - Sticky/Fixed                    -->
      <!-- ============================================ -->
      <v-col cols="12" md="4" lg="3" class="identity-rail pa-4">
        <div class="sticky-sidebar">
          
          <!-- Profile Card -->
          <v-card class="bg-white shadow-sm rounded-xl mb-4" elevation="0">
            <div class="profile-header text-center pa-6">
              <!-- Avatar -->
              <v-avatar size="128" class="mb-4 elevation-4">
                <v-img v-if="avatarUrl" :src="avatarUrl" cover />
                <span v-else class="text-h3 font-weight-bold bg-primary text-white d-flex align-center justify-center" style="width: 100%; height: 100%;">
                  {{ getInitials(employee) }}
                </span>
              </v-avatar>
              
              <!-- Name & Title -->
              <h1 class="text-h5 font-weight-bold text-grey-darken-4 mb-1">
                {{ employee.preferred_name || employee.first_name }} {{ employee.last_name }}
              </h1>
              <p class="text-body-1 text-grey-darken-1 mb-3">
                {{ employee.position?.title || 'Team Member' }}
              </p>
              
              <!-- Employment Status Badge -->
              <v-chip 
                :color="getStatusColor(employee.employment_status)" 
                variant="flat"
                size="small"
                class="font-weight-medium"
              >
                {{ formatEmploymentStatus(employee.employment_status, employee.employment_type) }}
              </v-chip>
            </div>

            <v-divider />

            <!-- Reliability Score (Donut Chart) -->
            <div v-if="canViewSensitiveData" class="reliability-section text-center pa-4">
              <div class="text-overline text-grey-darken-1 mb-2">RELIABILITY SCORE</div>
              <v-progress-circular
                :model-value="reliabilityScore"
                :color="getReliabilityColor(reliabilityScore)"
                :size="100"
                :width="10"
                class="mb-2"
              >
                <div>
                  <span class="text-h4 font-weight-bold">{{ reliabilityScore }}</span>
                  <span class="text-body-2 text-grey">%</span>
                </div>
              </v-progress-circular>
              <div class="text-caption text-grey">
                Based on {{ totalShifts }} completed shifts
              </div>
            </div>
          </v-card>

          <!-- Contact Card -->
          <v-card class="bg-white shadow-sm rounded-xl mb-4" elevation="0">
            <v-card-title class="text-subtitle-2 text-grey-darken-2 pb-0">
              <v-icon size="18" class="mr-2">mdi-card-account-details</v-icon>
              Contact Information
            </v-card-title>
            <v-list density="compact" class="bg-transparent">
              <v-list-item v-if="employee.email_work || profileEmail">
                <template #prepend>
                  <v-icon size="18" color="grey-darken-1">mdi-email-outline</v-icon>
                </template>
                <v-list-item-title class="text-body-2">
                  {{ employee.email_work || profileEmail }}
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption">Work Email</v-list-item-subtitle>
              </v-list-item>
              
              <v-list-item v-if="employee.phone_mobile">
                <template #prepend>
                  <v-icon size="18" color="grey-darken-1">mdi-cellphone</v-icon>
                </template>
                <v-list-item-title class="text-body-2">{{ employee.phone_mobile }}</v-list-item-title>
                <v-list-item-subtitle class="text-caption">Mobile</v-list-item-subtitle>
              </v-list-item>

              <v-list-item v-if="employee.phone_work">
                <template #prepend>
                  <v-icon size="18" color="grey-darken-1">mdi-phone-outline</v-icon>
                </template>
                <v-list-item-title class="text-body-2">{{ employee.phone_work }}</v-list-item-title>
                <v-list-item-subtitle class="text-caption">Work Phone</v-list-item-subtitle>
              </v-list-item>

              <!-- Emergency Contact (Admin/Self only) -->
              <template v-if="canViewSensitiveData && emergencyContact.name">
                <v-divider class="my-2" />
                <v-list-item>
                  <template #prepend>
                    <v-icon size="18" color="error">mdi-alert-circle-outline</v-icon>
                  </template>
                  <v-list-item-title class="text-body-2">{{ emergencyContact.name }}</v-list-item-title>
                  <v-list-item-subtitle class="text-caption">
                    {{ emergencyContact.phone }} • {{ emergencyContact.relationship }}
                  </v-list-item-subtitle>
                </v-list-item>
              </template>
            </v-list>
          </v-card>

          <!-- Quick Status Card -->
          <v-card class="bg-white shadow-sm rounded-xl mb-4" elevation="0">
            <v-card-title class="text-subtitle-2 text-grey-darken-2 pb-0">
              <v-icon size="18" class="mr-2">mdi-lightning-bolt</v-icon>
              Quick Status
            </v-card-title>
            <v-list density="compact" class="bg-transparent">
              <!-- Next Shift -->
              <v-list-item>
                <template #prepend>
                  <v-icon size="18" color="primary">mdi-calendar-clock</v-icon>
                </template>
                <v-list-item-title class="text-body-2">Next Shift</v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  {{ nextShift ? formatNextShift(nextShift) : 'No upcoming shifts' }}
                </v-list-item-subtitle>
              </v-list-item>

              <!-- PTO Balance -->
              <v-list-item v-if="canViewSensitiveData">
                <template #prepend>
                  <v-icon size="18" color="success">mdi-beach</v-icon>
                </template>
                <v-list-item-title class="text-body-2">PTO Balance</v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  {{ totalPTOHours }} hours available
                </v-list-item-subtitle>
              </v-list-item>

              <!-- Hire Date / Tenure -->
              <v-list-item>
                <template #prepend>
                  <v-icon size="18" color="info">mdi-briefcase-clock</v-icon>
                </template>
                <v-list-item-title class="text-body-2">Tenure</v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  {{ tenure }} (Hired {{ formatDate(employee.hire_date) }})
                </v-list-item-subtitle>
              </v-list-item>

              <!-- Department & Location -->
              <v-list-item v-if="employee.department?.name">
                <template #prepend>
                  <v-icon size="18" color="purple">mdi-domain</v-icon>
                </template>
                <v-list-item-title class="text-body-2">{{ employee.department.name }}</v-list-item-title>
                <v-list-item-subtitle v-if="employee.location?.name" class="text-caption">
                  {{ employee.location.name }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card>

          <!-- Admin Quick Actions -->
          <v-card v-if="isAdmin && !isOwnProfile" class="bg-white shadow-sm rounded-xl" elevation="0">
            <v-card-title class="text-subtitle-2 text-grey-darken-2 pb-0">
              <v-icon size="18" class="mr-2">mdi-cog</v-icon>
              Admin Actions
            </v-card-title>
            <v-card-text class="pa-2">
              <v-btn block variant="text" class="justify-start text-body-2" @click="activeTab = 'compensation'">
                <v-icon start size="18">mdi-cash</v-icon>
                Edit Compensation
              </v-btn>
              <v-btn block variant="text" class="justify-start text-body-2" color="error" @click="showDeleteDialog = true">
                <v-icon start size="18">mdi-delete</v-icon>
                Archive Employee
              </v-btn>
            </v-card-text>
          </v-card>

        </div>
      </v-col>

      <!-- ============================================ -->
      <!-- ZONE 2: THE CONTEXT DECK (Right Content)    -->
      <!-- 2/3 Width - Tabbed Interface                -->
      <!-- ============================================ -->
      <v-col cols="12" md="8" lg="9" class="context-deck pa-4">
        
        <!-- Tab Navigation -->
        <v-card class="bg-white shadow-sm rounded-xl mb-4" elevation="0">
          <v-tabs v-model="activeTab" color="primary" show-arrows>
            <v-tab value="overview">
              <v-icon start size="18">mdi-account-details</v-icon>
              Overview
            </v-tab>
            <v-tab v-if="canViewSensitiveData" value="compensation">
              <v-icon start size="18">mdi-cash</v-icon>
              Compensation
            </v-tab>
            <v-tab value="skills">
              <v-icon start size="18">mdi-star-circle</v-icon>
              Growth & Skills
            </v-tab>
            <v-tab v-if="canViewSensitiveData" value="history">
              <v-icon start size="18">mdi-history</v-icon>
              History & Notes
            </v-tab>
            <v-tab v-if="canViewSensitiveData" value="documents">
              <v-icon start size="18">mdi-folder-account</v-icon>
              Documents
            </v-tab>
            <v-tab v-if="canViewSensitiveData" value="assets">
              <v-icon start size="18">mdi-toolbox</v-icon>
              Assets
            </v-tab>
          </v-tabs>
        </v-card>

        <!-- Tab Content Window -->
        <v-window v-model="activeTab">
          
          <!-- TAB 1: OVERVIEW -->
          <v-window-item value="overview">
            <v-row>
              <!-- Bio Section -->
              <v-col cols="12">
                <v-card class="bg-white shadow-sm rounded-xl" elevation="0">
                  <v-card-title class="text-subtitle-1 font-weight-bold">
                    <v-icon start size="20" color="primary">mdi-account-details</v-icon>
                    About
                  </v-card-title>
                  <v-card-text>
                    <p v-if="bio" class="text-body-1 text-grey-darken-2" style="white-space: pre-wrap;">{{ bio }}</p>
                    <p v-else class="text-body-2 text-grey font-italic">No bio provided</p>
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- Availability Section -->
              <v-col cols="12" md="6">
                <v-card class="bg-white shadow-sm rounded-xl h-100" elevation="0">
                  <v-card-title class="text-subtitle-1 font-weight-bold">
                    <v-icon start size="20" color="success">mdi-calendar-check</v-icon>
                    Availability
                  </v-card-title>
                  <v-card-text>
                    <!-- Weekly Availability Grid -->
                    <div class="availability-grid">
                      <div v-for="day in weekDays" :key="day.value" class="d-flex align-center mb-2">
                        <div class="text-body-2 font-weight-medium" style="width: 100px;">{{ day.label }}</div>
                        <v-chip 
                          v-if="getAvailabilityForDay(day.value)" 
                          size="small" 
                          color="success" 
                          variant="tonal"
                        >
                          {{ getAvailabilityForDay(day.value) }}
                        </v-chip>
                        <v-chip v-else size="small" color="grey" variant="outlined">
                          Not Set
                        </v-chip>
                      </div>
                    </div>

                    <!-- Employment Details -->
                    <v-divider class="my-4" />
                    <div class="d-flex flex-wrap gap-2">
                      <v-chip size="small" variant="tonal" color="primary">
                        <v-icon start size="14">mdi-briefcase</v-icon>
                        {{ formatEmploymentType(employee?.employment_type) }}
                      </v-chip>
                      <v-chip v-if="employee?.location?.name" size="small" variant="tonal" color="info">
                        <v-icon start size="14">mdi-map-marker</v-icon>
                        {{ employee.location.name }}
                      </v-chip>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- Professional Licenses Section -->
              <v-col cols="12" md="6">
                <v-card class="bg-white shadow-sm rounded-xl h-100" elevation="0">
                  <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
                    <v-icon start size="20" color="warning">mdi-card-account-details</v-icon>
                    Professional Licenses
                    <v-spacer />
                    <v-chip size="x-small" variant="tonal" :color="expiringLicensesCount > 0 ? 'warning' : 'success'">
                      {{ licenses.length }} on file
                    </v-chip>
                  </v-card-title>
                  <v-card-text>
                    <v-list v-if="licenses.length > 0" density="compact" class="bg-transparent">
                      <v-list-item v-for="license in licenses" :key="license.id" class="px-0">
                        <template #prepend>
                          <v-avatar size="32" :color="getLicenseStatusColor(license)" variant="tonal">
                            <v-icon size="16">mdi-certificate</v-icon>
                          </v-avatar>
                        </template>
                        <v-list-item-title class="text-body-2 font-weight-medium">
                          {{ license.license_type }}
                        </v-list-item-title>
                        <v-list-item-subtitle class="text-caption">
                          #{{ license.license_number || 'N/A' }}
                          <span v-if="license.state"> • {{ license.state }}</span>
                        </v-list-item-subtitle>
                        <template #append>
                          <div class="text-right">
                            <v-chip 
                              size="x-small" 
                              :color="getLicenseStatusColor(license)"
                              variant="flat"
                            >
                              {{ formatExpirationStatus(license) }}
                            </v-chip>
                            <div class="text-caption text-grey mt-1">
                              {{ license.expiration_date ? formatDate(license.expiration_date) : 'No expiry' }}
                            </div>
                          </div>
                        </template>
                      </v-list-item>
                    </v-list>
                    <div v-else class="text-center py-4">
                      <v-icon size="40" color="grey-lighten-2">mdi-card-account-details-outline</v-icon>
                      <p class="text-caption text-grey mt-2">No licenses on file</p>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- Certifications Section -->
              <v-col cols="12">
                <v-card class="bg-white shadow-sm rounded-xl" elevation="0">
                  <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
                    <v-icon start size="20" color="info">mdi-school</v-icon>
                    Certifications & Training
                    <v-spacer />
                    <v-chip size="x-small" variant="tonal" color="info">
                      {{ certifications.length }} earned
                    </v-chip>
                  </v-card-title>
                  <v-card-text>
                    <div v-if="certifications.length > 0" class="d-flex flex-wrap gap-2">
                      <v-chip 
                        v-for="cert in certifications" 
                        :key="cert.id"
                        :color="getCertStatusColor(cert)"
                        variant="tonal"
                        size="small"
                      >
                        <v-icon start size="14">mdi-check-decagram</v-icon>
                        {{ cert.certification?.name || cert.certification_id }}
                        <template v-if="cert.expiration_date">
                          <v-divider vertical class="mx-2" />
                          <span class="text-caption">{{ formatDate(cert.expiration_date) }}</span>
                        </template>
                      </v-chip>
                    </div>
                    <div v-else class="text-center py-4">
                      <v-icon size="40" color="grey-lighten-2">mdi-school-outline</v-icon>
                      <p class="text-caption text-grey mt-2">No certifications on file</p>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-window-item>

          <!-- TAB 2: COMPENSATION (Admin/Self Only) -->
          <v-window-item v-if="canViewSensitiveData" value="compensation">
            <v-row>
              <!-- Pay Details Widget -->
              <v-col cols="12" md="6">
                <v-card class="bg-white shadow-sm rounded-xl h-100" elevation="0">
                  <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
                    <v-icon start size="20" color="success">mdi-cash</v-icon>
                    Pay Details
                    <v-spacer />
                    <v-btn 
                      v-if="isAdmin" 
                      icon="mdi-pencil" 
                      size="x-small" 
                      variant="text"
                      @click="showCompensationDialog = true"
                    />
                  </v-card-title>
                  <v-card-text>
                    <div v-if="compensation">
                      <!-- Pay Rate Display -->
                      <div class="pay-rate-display text-center py-4 mb-4 bg-grey-lighten-4 rounded-lg">
                        <div class="text-h3 font-weight-bold text-success">
                          ${{ formatPayRate(compensation.pay_rate) }}
                        </div>
                        <div class="text-body-2 text-grey">
                          {{ compensation.pay_type === 'Hourly' ? 'per hour' : 'per year' }}
                        </div>
                      </div>

                      <!-- Details List -->
                      <v-list density="compact" class="bg-transparent">
                        <v-list-item class="px-0">
                          <template #prepend>
                            <v-icon size="18" color="grey">mdi-briefcase-variant</v-icon>
                          </template>
                          <v-list-item-title class="text-body-2">Pay Type</v-list-item-title>
                          <template #append>
                            <span class="text-body-2 font-weight-medium">{{ compensation.pay_type || 'Not Set' }}</span>
                          </template>
                        </v-list-item>
                        <v-list-item class="px-0">
                          <template #prepend>
                            <v-icon size="18" color="grey">mdi-account-group</v-icon>
                          </template>
                          <v-list-item-title class="text-body-2">Employment Status</v-list-item-title>
                          <template #append>
                            <v-chip size="x-small" variant="tonal" color="primary">
                              {{ compensation.employment_status || 'Not Set' }}
                            </v-chip>
                          </template>
                        </v-list-item>
                        <v-list-item class="px-0">
                          <template #prepend>
                            <v-icon size="18" color="grey">mdi-calendar-check</v-icon>
                          </template>
                          <v-list-item-title class="text-body-2">Effective Date</v-list-item-title>
                          <template #append>
                            <span class="text-body-2">{{ formatDate(compensation.effective_date) }}</span>
                          </template>
                        </v-list-item>
                      </v-list>
                    </div>
                    <div v-else class="text-center py-6">
                      <v-icon size="48" color="grey-lighten-2">mdi-cash-remove</v-icon>
                      <p class="text-body-2 text-grey mt-2">No compensation data</p>
                      <v-btn 
                        v-if="isAdmin" 
                        variant="tonal" 
                        color="primary" 
                        size="small" 
                        class="mt-2"
                        @click="showCompensationDialog = true"
                      >
                        <v-icon start>mdi-plus</v-icon>
                        Add Compensation
                      </v-btn>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- CE Budget Tracker Widget -->
              <v-col cols="12" md="6">
                <v-card class="bg-white shadow-sm rounded-xl h-100" elevation="0">
                  <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
                    <v-icon start size="20" color="info">mdi-school</v-icon>
                    CE Budget ({{ currentYear }})
                  </v-card-title>
                  <v-card-text>
                    <div v-if="compensation && compensation.ce_budget_total > 0">
                      <!-- Progress Display -->
                      <div class="ce-progress mb-4">
                        <div class="d-flex justify-space-between mb-2">
                          <span class="text-body-2">Budget Used</span>
                          <span class="text-body-2 font-weight-bold">
                            ${{ (compensation.ce_budget_used || 0).toFixed(2) }} / ${{ compensation.ce_budget_total.toFixed(2) }}
                          </span>
                        </div>
                        <v-progress-linear
                          :model-value="ceUsagePercent"
                          :color="ceUsagePercent > 80 ? 'warning' : 'success'"
                          height="12"
                          rounded
                        />
                        <div class="d-flex justify-space-between mt-2">
                          <span class="text-caption text-grey">
                            {{ ceUsagePercent.toFixed(0) }}% used
                          </span>
                          <span :class="ceRemaining < 100 ? 'text-warning' : 'text-success'" class="text-caption font-weight-bold">
                            ${{ ceRemaining.toFixed(2) }} remaining
                          </span>
                        </div>
                      </div>

                      <!-- Quick Stats -->
                      <v-divider class="my-3" />
                      <div class="d-flex justify-space-around text-center">
                        <div>
                          <div class="text-h6 font-weight-bold text-success">${{ compensation.ce_budget_total.toFixed(0) }}</div>
                          <div class="text-caption text-grey">Total Budget</div>
                        </div>
                        <div>
                          <div class="text-h6 font-weight-bold text-warning">${{ (compensation.ce_budget_used || 0).toFixed(0) }}</div>
                          <div class="text-caption text-grey">Spent</div>
                        </div>
                        <div>
                          <div class="text-h6 font-weight-bold" :class="ceRemaining < 100 ? 'text-error' : 'text-info'">${{ ceRemaining.toFixed(0) }}</div>
                          <div class="text-caption text-grey">Available</div>
                        </div>
                      </div>
                    </div>
                    <div v-else class="text-center py-6">
                      <v-icon size="48" color="grey-lighten-2">mdi-school-outline</v-icon>
                      <p class="text-body-2 text-grey mt-2">No CE budget set</p>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- Benefits Widget -->
              <v-col cols="12" md="6">
                <v-card class="bg-white shadow-sm rounded-xl" elevation="0">
                  <v-card-title class="text-subtitle-1 font-weight-bold">
                    <v-icon start size="20" color="purple">mdi-heart-pulse</v-icon>
                    Benefits
                  </v-card-title>
                  <v-card-text>
                    <div class="d-flex align-center justify-space-between mb-4">
                      <span class="text-body-1">Enrolled in Benefits</span>
                      <v-chip 
                        :color="compensation?.benefits_enrolled ? 'success' : 'grey'" 
                        variant="flat"
                        size="small"
                      >
                        <v-icon start size="14">{{ compensation?.benefits_enrolled ? 'mdi-check' : 'mdi-close' }}</v-icon>
                        {{ compensation?.benefits_enrolled ? 'Yes' : 'No' }}
                      </v-chip>
                    </div>
                    
                    <v-divider class="my-3" />
                    
                    <div>
                      <div class="text-overline text-grey mb-1">BONUS PLAN</div>
                      <p v-if="compensation?.bonus_plan_details" class="text-body-2">
                        {{ compensation.bonus_plan_details }}
                      </p>
                      <p v-else class="text-body-2 text-grey font-italic">
                        No bonus plan on record
                      </p>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- Admin Actions Card -->
              <v-col v-if="isAdmin" cols="12" md="6">
                <v-card class="bg-white shadow-sm rounded-xl" elevation="0">
                  <v-card-title class="text-subtitle-1 font-weight-bold">
                    <v-icon start size="20" color="warning">mdi-shield-account</v-icon>
                    Admin Actions
                  </v-card-title>
                  <v-card-text>
                    <v-btn 
                      block 
                      variant="tonal" 
                      color="primary" 
                      class="mb-2"
                      @click="showCompensationDialog = true"
                    >
                      <v-icon start>mdi-pencil</v-icon>
                      Edit Compensation
                    </v-btn>
                    <p class="text-caption text-grey text-center mt-2">
                      Last updated: {{ compensation?.updated_at ? formatDate(compensation.updated_at) : 'Never' }}
                    </p>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-window-item>

          <!-- TAB 3: GROWTH & SKILLS (Placeholder for Section 5) -->
          <v-window-item value="skills">
            <v-card class="bg-white shadow-sm rounded-xl pa-6" elevation="0">
              <div class="text-center py-8">
                <v-icon size="64" color="grey-lighten-2">mdi-star-circle</v-icon>
                <h3 class="text-h6 text-grey mt-4">Growth & Skills Tab</h3>
                <p class="text-body-2 text-grey">Section 5: Skill Matrix, Mentorship</p>
              </div>
            </v-card>
          </v-window-item>

          <!-- TAB 4: HISTORY & NOTES (Placeholder for Section 6) -->
          <v-window-item v-if="canViewSensitiveData" value="history">
            <v-card class="bg-white shadow-sm rounded-xl pa-6" elevation="0">
              <div class="text-center py-8">
                <v-icon size="64" color="grey-lighten-2">mdi-history</v-icon>
                <h3 class="text-h6 text-grey mt-4">History & Notes Tab</h3>
                <p class="text-body-2 text-grey">Section 6: Timeline Feed</p>
              </div>
            </v-card>
          </v-window-item>

          <!-- TAB 5: DOCUMENTS (Placeholder for Section 6) -->
          <v-window-item v-if="canViewSensitiveData" value="documents">
            <v-card class="bg-white shadow-sm rounded-xl pa-6" elevation="0">
              <div class="text-center py-8">
                <v-icon size="64" color="grey-lighten-2">mdi-folder-account</v-icon>
                <h3 class="text-h6 text-grey mt-4">Documents Tab</h3>
                <p class="text-body-2 text-grey">Section 6: Document Vault</p>
              </div>
            </v-card>
          </v-window-item>

          <!-- TAB 6: ASSETS (Placeholder for Section 6) -->
          <v-window-item v-if="canViewSensitiveData" value="assets">
            <v-card class="bg-white shadow-sm rounded-xl pa-6" elevation="0">
              <div class="text-center py-8">
                <v-icon size="64" color="grey-lighten-2">mdi-toolbox</v-icon>
                <h3 class="text-h6 text-grey mt-4">Assets Tab</h3>
                <p class="text-body-2 text-grey">Section 6: Inventory Table</p>
              </div>
            </v-card>
          </v-window-item>

        </v-window>

        <!-- Peer View: Limited Access Message -->
        <v-card v-if="!canViewSensitiveData && activeTab !== 'overview' && activeTab !== 'skills'" class="bg-white shadow-sm rounded-xl text-center py-12" elevation="0">
          <v-icon size="64" color="grey-lighten-2">mdi-lock</v-icon>
          <h3 class="text-h6 text-grey mt-4">Limited Access</h3>
          <p class="text-body-2 text-grey">
            You can only view basic information for this team member.
          </p>
        </v-card>
      </v-col>
    </v-row>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="450">
      <v-card>
        <v-card-title class="text-error">
          <v-icon start color="error">mdi-alert</v-icon>
          Archive Employee
        </v-card-title>
        <v-card-text>
          <p>This will archive <strong>{{ employee?.first_name }} {{ employee?.last_name }}</strong> and remove their access.</p>
          <p class="text-caption text-grey mt-2">Type the employee's name to confirm:</p>
          <v-text-field
            v-model="deleteConfirmText"
            variant="outlined"
            density="compact"
            :placeholder="`${employee?.first_name} ${employee?.last_name}`"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn
            color="error"
            variant="flat"
            :disabled="deleteConfirmText !== `${employee?.first_name} ${employee?.last_name}`"
            :loading="deleting"
            @click="archiveEmployee"
          >
            Archive
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Compensation Edit Dialog -->
    <v-dialog v-model="showCompensationDialog" max-width="600">
      <v-card>
        <v-card-title>
          <v-icon start color="success">mdi-cash</v-icon>
          Edit Compensation
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-select
                v-model="compensationForm.pay_type"
                :items="['Hourly', 'Salary']"
                label="Pay Type"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="compensationForm.pay_rate"
                label="Pay Rate"
                type="number"
                :prefix="compensationForm.pay_type === 'Hourly' ? '$/hr' : '$/yr'"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="compensationForm.employment_status"
                :items="['Full Time', 'Part Time', 'Contractor', 'Per Diem']"
                label="Employment Status"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="compensationForm.effective_date"
                label="Effective Date"
                type="date"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12">
              <v-switch
                v-model="compensationForm.benefits_enrolled"
                label="Enrolled in Benefits"
                color="success"
                hide-details
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="compensationForm.bonus_plan_details"
                label="Bonus Plan Details"
                placeholder="e.g., Quarterly Production Bonus"
                variant="outlined"
                density="compact"
                rows="2"
              />
            </v-col>
            <v-col cols="12">
              <v-divider class="mb-4" />
              <div class="text-subtitle-2 mb-3">CE Budget</div>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="compensationForm.ce_budget_total"
                label="Total Budget"
                type="number"
                prefix="$"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="compensationForm.ce_budget_used"
                label="Amount Used"
                type="number"
                prefix="$"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showCompensationDialog = false">Cancel</v-btn>
          <v-btn
            color="success"
            variant="flat"
            :loading="savingCompensation"
            @click="saveCompensation"
          >
            <v-icon start>mdi-content-save</v-icon>
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { format, formatDistanceToNow, differenceInDays, differenceInMonths, differenceInYears } from 'date-fns'

definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const userStore = useUserStore()
const supabase = useSupabaseClient()
const toast = useToast()

// Route params
const employeeId = computed(() => route.params.id as string)
const currentYear = new Date().getFullYear()

// ==========================================
// STATE
// ==========================================
const isLoading = ref(true)
const error = ref('')
const employee = ref<any>(null)
const profileEmail = ref('')
const avatarUrl = ref('')
const bio = ref('')
const reliabilityScore = ref(100)
const totalShifts = ref(0)
const nextShift = ref<any>(null)
const ptoBalances = ref<any[]>([])
const emergencyContact = ref({ name: '', phone: '', relationship: '' })
const licenses = ref<any[]>([])
const certifications = ref<any[]>([])
const compensation = ref<any>(null)

// Week days for availability
const weekDays = [
  { label: 'Monday', value: 'monday' },
  { label: 'Tuesday', value: 'tuesday' },
  { label: 'Wednesday', value: 'wednesday' },
  { label: 'Thursday', value: 'thursday' },
  { label: 'Friday', value: 'friday' },
  { label: 'Saturday', value: 'saturday' },
  { label: 'Sunday', value: 'sunday' }
]

// Tab state
const activeTab = ref('overview')

// Dialog state
const showDeleteDialog = ref(false)
const deleteConfirmText = ref('')
const deleting = ref(false)
const showCompensationDialog = ref(false)
const savingCompensation = ref(false)

// Compensation form
const compensationForm = ref({
  pay_type: 'Hourly',
  pay_rate: 0,
  employment_status: 'Full Time',
  benefits_enrolled: false,
  bonus_plan_details: '',
  ce_budget_total: 0,
  ce_budget_used: 0,
  effective_date: new Date().toISOString().split('T')[0]
})

// ==========================================
// COMPUTED
// ==========================================
const isAdmin = computed(() => authStore.isAdmin)

const isOwnProfile = computed(() => {
  const currentEmployeeId = userStore.employee?.id
  return currentEmployeeId === employeeId.value
})

const canViewSensitiveData = computed(() => {
  // Admins can see everything
  if (isAdmin.value) return true
  // Users can see their own profile
  if (isOwnProfile.value) return true
  // Peers cannot see sensitive data
  return false
})

const totalPTOHours = computed(() => {
  return ptoBalances.value.reduce((sum, b) => sum + (b.balance_hours || 0), 0)
})

const expiringLicensesCount = computed(() => {
  return licenses.value.filter(l => {
    if (!l.expiration_date) return false
    const daysUntil = differenceInDays(new Date(l.expiration_date), new Date())
    return daysUntil <= 60 && daysUntil >= 0
  }).length
})

const ceUsagePercent = computed(() => {
  if (!compensation.value || !compensation.value.ce_budget_total) return 0
  return ((compensation.value.ce_budget_used || 0) / compensation.value.ce_budget_total) * 100
})

const ceRemaining = computed(() => {
  if (!compensation.value) return 0
  return (compensation.value.ce_budget_total || 0) - (compensation.value.ce_budget_used || 0)
})

const tenure = computed(() => {
  if (!employee.value?.hire_date) return 'Unknown'
  const hireDate = new Date(employee.value.hire_date)
  const years = differenceInYears(new Date(), hireDate)
  const months = differenceInMonths(new Date(), hireDate) % 12
  if (years > 0) {
    return `${years}y ${months}m`
  }
  return `${months} months`
})

// ==========================================
// METHODS - Formatting
// ==========================================
function getInitials(emp: any): string {
  return `${emp.first_name?.charAt(0) || ''}${emp.last_name?.charAt(0) || ''}`.toUpperCase()
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A'
  return format(new Date(dateStr), 'MMM d, yyyy')
}

function formatNextShift(shift: any): string {
  if (!shift) return 'No upcoming shifts'
  const startDate = new Date(shift.start_at)
  const now = new Date()
  const diffDays = differenceInDays(startDate, now)
  
  if (diffDays === 0) {
    return `Today at ${format(startDate, 'h:mm a')}`
  } else if (diffDays === 1) {
    return `Tomorrow at ${format(startDate, 'h:mm a')}`
  } else {
    return format(startDate, 'EEE, MMM d') + ` at ${format(startDate, 'h:mm a')}`
  }
}

function formatEmploymentStatus(status: string, type: string): string {
  const statusMap: Record<string, string> = {
    'active': 'Active',
    'inactive': 'Inactive',
    'on-leave': 'On Leave',
    'terminated': 'Terminated'
  }
  const typeMap: Record<string, string> = {
    'full-time': 'Full Time',
    'part-time': 'Part Time',
    'contract': 'Contractor',
    'per-diem': 'Per Diem',
    'intern': 'Intern'
  }
  const statusLabel = statusMap[status] || status
  const typeLabel = typeMap[type] || type
  return `${statusLabel} - ${typeLabel}`
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'active': 'success',
    'inactive': 'grey',
    'on-leave': 'warning',
    'terminated': 'error'
  }
  return colors[status] || 'grey'
}

function getReliabilityColor(score: number): string {
  if (score >= 90) return 'success'
  if (score >= 75) return 'warning'
  return 'error'
}

function formatEmploymentType(type: string): string {
  const typeMap: Record<string, string> = {
    'full-time': 'Full Time',
    'part-time': 'Part Time',
    'contract': 'Contractor',
    'per-diem': 'Per Diem',
    'intern': 'Intern'
  }
  return typeMap[type] || type || 'Not Set'
}

function getAvailabilityForDay(day: string): string {
  // For now, return employment type as availability indicator
  // This can be enhanced when an availability table is added
  const emp = employee.value
  if (!emp) return ''
  
  // Default availability based on employment type
  if (emp.employment_type === 'full-time') {
    return day !== 'saturday' && day !== 'sunday' ? 'Available' : ''
  }
  return 'Flexible'
}

function getLicenseStatusColor(license: any): string {
  if (!license.expiration_date) return 'grey'
  const daysUntil = differenceInDays(new Date(license.expiration_date), new Date())
  if (daysUntil < 0) return 'error'
  if (daysUntil <= 30) return 'error'
  if (daysUntil <= 60) return 'warning'
  return 'success'
}

function formatExpirationStatus(license: any): string {
  if (!license.expiration_date) return 'No Expiry'
  const daysUntil = differenceInDays(new Date(license.expiration_date), new Date())
  if (daysUntil < 0) return 'Expired'
  if (daysUntil <= 30) return `${daysUntil}d left`
  if (daysUntil <= 60) return 'Expiring Soon'
  return 'Active'
}

function getCertStatusColor(cert: any): string {
  if (cert.status === 'expired') return 'error'
  if (cert.status === 'pending' || cert.status === 'renewal_pending') return 'warning'
  if (!cert.expiration_date) return 'info'
  const daysUntil = differenceInDays(new Date(cert.expiration_date), new Date())
  if (daysUntil < 0) return 'error'
  if (daysUntil <= 30) return 'warning'
  return 'success'
}

function formatPayRate(rate: number | null): string {
  if (!rate) return '0.00'
  if (rate >= 1000) {
    // Salary - format with commas
    return rate.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }
  // Hourly - format with 2 decimals
  return rate.toFixed(2)
}

// ==========================================
// DATA LOADING
// ==========================================
async function loadEmployeeData() {
  isLoading.value = true
  error.value = ''

  try {
    // Load employee with related data
    const { data: emp, error: empError } = await supabase
      .from('employees')
      .select(`
        *,
        profile:profiles!employees_profile_id_fkey(id, email, avatar_url, bio),
        department:departments(id, name),
        position:job_positions(id, title),
        location:locations(id, name)
      `)
      .eq('id', employeeId.value)
      .single()

    if (empError) throw empError
    if (!emp) throw new Error('Employee not found')

    employee.value = emp
    profileEmail.value = emp.profile?.email || ''
    avatarUrl.value = emp.profile?.avatar_url || ''
    bio.value = emp.profile?.bio || ''

    // Load licenses and certifications for everyone (public info)
    await Promise.all([
      loadLicenses(),
      loadCertifications()
    ])

    // Load additional data only if user can view sensitive info
    if (canViewSensitiveData.value) {
      await Promise.all([
        loadReliabilityScore(),
        loadNextShift(),
        loadPTOBalances(),
        loadCompensation()
      ])
    } else {
      // Still load next shift for basic view
      await loadNextShift()
    }

  } catch (err: any) {
    console.error('Error loading employee:', err)
    error.value = err.message || 'Failed to load employee'
  } finally {
    isLoading.value = false
  }
}

async function loadReliabilityScore() {
  try {
    // Get completed shifts
    const { data: shifts } = await supabase
      .from('shifts')
      .select('id, start_at')
      .eq('employee_id', employeeId.value)
      .eq('status', 'completed')
      .lte('start_at', new Date().toISOString())

    // Get time entries (clock-ins)
    const { data: entries } = await supabase
      .from('time_entries')
      .select('id, clock_in_at, shift_id')
      .eq('employee_id', employeeId.value)
      .not('clock_in_at', 'is', null)

    totalShifts.value = shifts?.length || 0
    
    if (totalShifts.value === 0) {
      reliabilityScore.value = 100
      return
    }

    // Count on-time arrivals (clocked in within 5 min of shift start)
    let onTimeCount = 0
    shifts?.forEach(shift => {
      const entry = entries?.find(e => e.shift_id === shift.id)
      if (entry) {
        const shiftStart = new Date(shift.start_at)
        const clockIn = new Date(entry.clock_in_at)
        const diffMinutes = (clockIn.getTime() - shiftStart.getTime()) / 60000
        if (diffMinutes <= 5) onTimeCount++
      }
    })

    reliabilityScore.value = Math.round((onTimeCount / totalShifts.value) * 100)
  } catch (err) {
    console.log('[Profile] Reliability score not available:', err)
    reliabilityScore.value = 100
  }
}

async function loadNextShift() {
  try {
    const { data } = await supabase
      .from('shifts')
      .select('id, start_at, end_at, location:locations(name)')
      .eq('employee_id', employeeId.value)
      .gte('start_at', new Date().toISOString())
      .in('status', ['published', 'draft'])
      .order('start_at', { ascending: true })
      .limit(1)
      .single()

    nextShift.value = data
  } catch (err) {
    console.log('[Profile] Next shift not available:', err)
  }
}

async function loadPTOBalances() {
  try {
    const { data } = await supabase
      .from('employee_time_off_balances')
      .select(`
        *,
        time_off_type:time_off_types(name)
      `)
      .eq('employee_id', employeeId.value)
      .eq('year', currentYear)

    ptoBalances.value = data || []
  } catch (err) {
    console.log('[Profile] PTO balances not available:', err)
  }
}

async function loadLicenses() {
  try {
    const { data } = await supabase
      .from('employee_licenses')
      .select('*')
      .eq('employee_id', employeeId.value)
      .order('expiration_date', { ascending: true })

    licenses.value = data || []
  } catch (err) {
    console.log('[Profile] Licenses not available:', err)
  }
}

async function loadCertifications() {
  try {
    const { data } = await supabase
      .from('employee_certifications')
      .select(`
        *,
        certification:certifications(id, name, code, issuing_authority)
      `)
      .eq('employee_id', employeeId.value)
      .order('expiration_date', { ascending: true })

    certifications.value = data || []
  } catch (err) {
    console.log('[Profile] Certifications not available:', err)
  }
}

async function loadCompensation() {
  try {
    const { data } = await supabase
      .from('employee_compensation')
      .select('*')
      .eq('employee_id', employeeId.value)
      .single()

    compensation.value = data
    
    // Populate form if data exists
    if (data) {
      compensationForm.value = {
        pay_type: data.pay_type || 'Hourly',
        pay_rate: data.pay_rate || 0,
        employment_status: data.employment_status || 'Full Time',
        benefits_enrolled: data.benefits_enrolled || false,
        bonus_plan_details: data.bonus_plan_details || '',
        ce_budget_total: data.ce_budget_total || 0,
        ce_budget_used: data.ce_budget_used || 0,
        effective_date: data.effective_date || new Date().toISOString().split('T')[0]
      }
    }
  } catch (err) {
    console.log('[Profile] Compensation not available:', err)
  }
}

// ==========================================
// ACTIONS
// ==========================================
async function archiveEmployee() {
  if (deleteConfirmText.value !== `${employee.value.first_name} ${employee.value.last_name}`) return
  
  deleting.value = true
  try {
    // Update status to terminated
    const { error: err } = await supabase
      .from('employees')
      .update({
        employment_status: 'terminated',
        termination_date: new Date().toISOString().split('T')[0]
      })
      .eq('id', employeeId.value)

    if (err) throw err
    
    toast.success('Employee archived successfully')
    await router.push('/roster')
  } catch (err) {
    toast.error('Failed to archive employee')
  } finally {
    deleting.value = false
  }
}

async function saveCompensation() {
  savingCompensation.value = true
  try {
    const compData = {
      employee_id: employeeId.value,
      pay_type: compensationForm.value.pay_type,
      pay_rate: compensationForm.value.pay_rate,
      employment_status: compensationForm.value.employment_status,
      benefits_enrolled: compensationForm.value.benefits_enrolled,
      bonus_plan_details: compensationForm.value.bonus_plan_details || null,
      ce_budget_total: compensationForm.value.ce_budget_total,
      ce_budget_used: compensationForm.value.ce_budget_used,
      effective_date: compensationForm.value.effective_date
    }

    if (compensation.value) {
      // Update existing
      const { error: err } = await supabase
        .from('employee_compensation')
        .update(compData)
        .eq('id', compensation.value.id)
      if (err) throw err
    } else {
      // Insert new
      const { error: err } = await supabase
        .from('employee_compensation')
        .insert(compData)
      if (err) throw err
    }

    await loadCompensation()
    showCompensationDialog.value = false
    toast.success('Compensation updated successfully')
  } catch (err: any) {
    console.error('Failed to save compensation:', err)
    toast.error('Failed to save compensation')
  } finally {
    savingCompensation.value = false
  }
}

// ==========================================
// LIFECYCLE
// ==========================================
onMounted(() => {
  loadEmployeeData()
})

// Watch for route changes
watch(() => route.params.id, () => {
  loadEmployeeData()
})
</script>

<style scoped>
.personnel-record {
  min-height: 100vh;
}

.identity-rail {
  background-color: rgb(248 250 252); /* bg-slate-50 */
}

.sticky-sidebar {
  position: sticky;
  top: 80px;
}

.context-deck {
  background-color: rgb(248 250 252); /* bg-slate-50 */
}

.shadow-sm {
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05) !important;
}

.rounded-xl {
  border-radius: 0.75rem !important;
}

/* Override Vuetify card defaults for cleaner look */
.v-card {
  border: 1px solid rgb(226 232 240); /* slate-200 */
}

.profile-header {
  background: linear-gradient(135deg, rgb(248 250 252) 0%, rgb(241 245 249) 100%);
}
</style>
