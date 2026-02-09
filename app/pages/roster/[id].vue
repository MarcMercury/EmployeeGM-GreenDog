<template>
  <div class="personnel-record bg-slate-50 min-h-screen">
    <!-- Loading State -->
    <div v-if="isLoading" class="d-flex justify-center align-center min-h-70vh">
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
              <p v-if="employee.employee_number" class="text-caption text-grey-darken-1 mb-1">
                {{ employee.employee_number }}
              </p>
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

            <!-- Reliability Score (Donut Chart) - Clickable to view attendance tab -->
            <div 
              v-if="canViewSensitiveData" 
              class="reliability-section text-center pa-4 cursor-pointer"
              @click="activeTab = 'attendance'"
              style="transition: background 0.2s;"
              title="Click to view attendance details"
            >
              <div class="text-overline text-grey-darken-1 mb-2">
                RELIABILITY SCORE
                <v-icon size="12" class="ml-1">mdi-chevron-right</v-icon>
              </div>
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
                Click to view attendance details
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

              <!-- Personal Email (Admin/Self only) -->
              <v-list-item v-if="canViewSensitiveData && employee.email_personal">
                <template #prepend>
                  <v-icon size="18" color="grey-darken-1">mdi-email</v-icon>
                </template>
                <v-list-item-title class="text-body-2">{{ employee.email_personal }}</v-list-item-title>
                <v-list-item-subtitle class="text-caption">Personal Email</v-list-item-subtitle>
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

              <!-- Address (Admin/Self only) -->
              <template v-if="canViewSensitiveData && employee.address_street">
                <v-divider class="my-2" />
                <v-list-item>
                  <template #prepend>
                    <v-icon size="18" color="grey-darken-1">mdi-map-marker</v-icon>
                  </template>
                  <v-list-item-title class="text-body-2">{{ employee.address_street }}</v-list-item-title>
                  <v-list-item-subtitle class="text-caption">
                    {{ [employee.address_city, employee.address_state, employee.address_zip].filter(Boolean).join(', ') }}
                  </v-list-item-subtitle>
                </v-list-item>
              </template>

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

              <!-- Termination Info (for terminated employees) -->
              <v-list-item v-if="employee.employment_status === 'terminated' && employee.termination_date">
                <template #prepend>
                  <v-icon size="18" color="error">mdi-account-off</v-icon>
                </template>
                <v-list-item-title class="text-body-2 text-error">Terminated</v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  {{ formatDate(employee.termination_date) }}
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

              <!-- Manager / Reports To -->
              <v-list-item v-if="employee.manager">
                <template #prepend>
                  <v-icon size="18" color="teal">mdi-account-supervisor</v-icon>
                </template>
                <v-list-item-title class="text-body-2">Reports To</v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  <NuxtLink :to="`/roster/${employee.manager.id}`" class="text-primary text-decoration-none">
                    {{ employee.manager.preferred_name || employee.manager.first_name }} {{ employee.manager.last_name }}
                  </NuxtLink>
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
              <v-btn block variant="text" class="justify-start text-body-2" color="primary" @click="showRequestReviewDialog = true">
                <v-icon start size="18">mdi-clipboard-plus</v-icon>
                Request Review
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
            <v-tab v-if="canViewSensitiveData" value="personal">
              <v-icon start size="18">mdi-card-account-details</v-icon>
              Personal Info
            </v-tab>
            <v-tab v-if="canViewSensitiveData" value="compensation">
              <v-icon start size="18">mdi-cash</v-icon>
              Compensation
            </v-tab>
            <v-tab v-if="canViewSensitiveData" value="pto">
              <v-icon start size="18">mdi-beach</v-icon>
              PTO Balances
            </v-tab>
            <v-tab value="skills">
              <v-icon start size="18">mdi-star-circle</v-icon>
              Growth & Skills
            </v-tab>
            <v-tab v-if="canViewSensitiveData" value="attendance">
              <v-icon start size="18">mdi-calendar-clock</v-icon>
              Attendance
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

                    <!-- Personal Info (Admin/Self only) -->
                    <template v-if="canViewSensitiveData && employee?.date_of_birth">
                      <v-divider class="my-4" />
                      <div class="d-flex align-center gap-2">
                        <v-icon size="18" color="grey-darken-1">mdi-cake-variant</v-icon>
                        <span class="text-body-2">Born {{ formatDate(employee.date_of_birth) }}</span>
                      </div>
                    </template>
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
                    <v-chip size="x-small" variant="tonal" :color="expiringLicensesCount > 0 ? 'warning' : 'success'" class="mr-2">
                      {{ licenses.length }} on file
                    </v-chip>
                    <v-btn v-if="isAdmin || isOwnProfile" icon="mdi-plus" size="x-small" variant="text" color="primary" aria-label="Add" @click="openAddLicenseDialog" />
                  </v-card-title>
                  <v-card-text>
                    <v-list v-if="licenses.length > 0" density="compact" class="bg-transparent">
                      <v-list-item 
                        v-for="license in licenses" 
                        :key="license.id" 
                        class="px-0"
                        :class="{ 'cursor-pointer': isAdmin || isOwnProfile }"
                        @click="(isAdmin || isOwnProfile) && openEditLicenseDialog(license)"
                      >
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
                          <div class="text-right d-flex align-center gap-2">
                            <div>
                              <v-chip 
                                size="x-small" 
                                :color="getLicenseStatusColor(license)"
                                variant="flat"
                              >
                                {{ formatExpirationStatus(license) }}
                              </v-chip>
                              <div class="text-caption text-grey mt-1">
                                {{ license.never_expires ? 'Never Expires' : (license.expiration_date ? formatDate(license.expiration_date) : 'No expiry') }}
                              </div>
                            </div>
                            <v-btn v-if="isAdmin || isOwnProfile" icon="mdi-pencil" size="x-small" variant="text" aria-label="Edit" @click.stop="openEditLicenseDialog(license)" />
                          </div>
                        </template>
                      </v-list-item>
                    </v-list>
                    <div v-else class="text-center py-4">
                      <v-icon size="40" color="grey-lighten-2">mdi-card-account-details-outline</v-icon>
                      <p class="text-caption text-grey mt-2">No licenses on file</p>
                      <v-btn v-if="isAdmin || isOwnProfile" size="small" variant="text" color="primary" @click="openAddLicenseDialog">
                        <v-icon start>mdi-plus</v-icon>
                        Add License
                      </v-btn>
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
                    <v-chip size="x-small" variant="tonal" :color="expiringCertsCount > 0 ? 'warning' : 'info'" class="mr-2">
                      {{ certifications.length }} earned
                    </v-chip>
                    <v-btn v-if="isAdmin || isOwnProfile" icon="mdi-plus" size="x-small" variant="text" color="primary" aria-label="Add" @click="openAddCertDialog" />
                  </v-card-title>
                  <v-card-text>
                    <div v-if="certifications.length > 0" class="d-flex flex-wrap gap-2">
                      <v-chip 
                        v-for="cert in certifications" 
                        :key="cert.id"
                        :color="getCertStatusColor(cert)"
                        variant="tonal"
                        size="small"
                        :class="{ 'cursor-pointer': isAdmin || isOwnProfile }"
                        @click="(isAdmin || isOwnProfile) && openEditCertDialog(cert)"
                      >
                        <v-icon start size="14">mdi-check-decagram</v-icon>
                        {{ cert.certification?.name || cert.certification_id }}
                        <template v-if="cert.never_expires">
                          <v-divider vertical class="mx-2" />
                          <span class="text-caption">Never Expires</span>
                        </template>
                        <template v-else-if="cert.expiration_date">
                          <v-divider vertical class="mx-2" />
                          <span class="text-caption">{{ formatDate(cert.expiration_date) }}</span>
                        </template>
                      </v-chip>
                    </div>
                    <div v-else class="text-center py-4">
                      <v-icon size="40" color="grey-lighten-2">mdi-school-outline</v-icon>
                      <p class="text-caption text-grey mt-2">No certifications on file</p>
                      <v-btn v-if="isAdmin || isOwnProfile" size="small" variant="text" color="primary" @click="openAddCertDialog">
                        <v-icon start>mdi-plus</v-icon>
                        Add Certification
                      </v-btn>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-window-item>

          <!-- TAB: PERSONAL INFO (Admin/Self Only) -->
          <v-window-item v-if="canViewSensitiveData" value="personal">
            <RosterPersonalTab
              :employee="employee"
              :profile-email="profileEmail"
              :emergency-contact="emergencyContact"
              :is-admin="isAdmin"
              @open-personal-info-dialog="openPersonalInfoDialog"
            />
          </v-window-item>

          <!-- TAB 2: COMPENSATION (Admin/Self Only) -->
          <v-window-item v-if="canViewSensitiveData" value="compensation">
            <RosterCompensationTab
              :compensation="compensation"
              :is-admin="isAdmin"
              :current-year="currentYear"
              @open-compensation-dialog="showCompensationDialog = true"
            />
          </v-window-item>

          <!-- TAB: PTO BALANCES (Admin/Self Only) -->
          <v-window-item v-if="canViewSensitiveData" value="pto">
            <v-row>
              <!-- PTO Summary Card -->
              <v-col cols="12">
                <v-card class="bg-white shadow-sm rounded-xl mb-4" elevation="0">
                  <v-card-text class="d-flex justify-space-around text-center py-4">
                    <div>
                      <div class="text-h4 font-weight-bold text-success">{{ totalPTOHours.toFixed(1) }}</div>
                      <div class="text-caption text-grey">Total Available (hrs)</div>
                    </div>
                    <v-divider vertical />
                    <div>
                      <div class="text-h4 font-weight-bold text-info">{{ ptoBalances.length }}</div>
                      <div class="text-caption text-grey">PTO Types</div>
                    </div>
                    <v-divider vertical />
                    <div>
                      <div class="text-h4 font-weight-bold text-primary">{{ currentYear }}</div>
                      <div class="text-caption text-grey">Period Year</div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- PTO Type Cards with Inline Editing - Simplified: Assigned, Used, Balance -->
              <v-col v-for="(balance, index) in ptoBalances" :key="balance.id" cols="12" md="4">
                <v-card class="bg-white shadow-sm rounded-xl h-100" elevation="0">
                  <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold pb-0">
                    <v-icon start size="20" :color="getPTOTypeColor(balance.time_off_type?.name)">
                      {{ getPTOTypeIcon(balance.time_off_type?.name) }}
                    </v-icon>
                    {{ balance.time_off_type?.name || 'Unknown Type' }}
                  </v-card-title>
                  <v-card-text class="pt-4">
                    <!-- Admin: Editable Assigned & Used, Calculated Balance -->
                    <template v-if="isAdmin">
                      <v-row dense class="mb-2">
                        <v-col cols="6">
                          <v-text-field
                            v-model.number="ptoEditableBalances[index].assigned_hours"
                            label="Assigned"
                            type="number"
                            step="0.5"
                            suffix="hrs"
                            variant="outlined"
                            density="compact"
                            hide-details
                            @update:model-value="markPTOChanged(index)"
                          />
                        </v-col>
                        <v-col cols="6">
                          <v-text-field
                            v-model.number="ptoEditableBalances[index].used_hours"
                            label="Used"
                            type="number"
                            step="0.5"
                            suffix="hrs"
                            variant="outlined"
                            density="compact"
                            hide-details
                            @update:model-value="markPTOChanged(index)"
                          />
                        </v-col>
                      </v-row>
                      <div class="text-center mt-2">
                        <div class="text-h5 font-weight-bold" :class="getEditablePTOBalance(index) <= 0 ? 'text-error' : getEditablePTOBalance(index) < 8 ? 'text-warning' : 'text-success'">
                          {{ getEditablePTOBalance(index).toFixed(1) }}
                        </div>
                        <div class="text-caption text-grey">Balance (Assigned - Used)</div>
                      </div>
                    </template>
                    <!-- Non-Admin: Read-Only Display -->
                    <template v-else>
                      <div class="d-flex justify-space-between">
                        <div class="text-center">
                          <div class="text-h5 font-weight-bold text-info">{{ (balance.assigned_hours || 0).toFixed(1) }}</div>
                          <div class="text-caption text-grey">Assigned</div>
                        </div>
                        <div class="text-center">
                          <div class="text-h5 font-weight-bold text-warning">{{ (balance.used_hours || 0).toFixed(1) }}</div>
                          <div class="text-caption text-grey">Used</div>
                        </div>
                        <div class="text-center">
                          <div class="text-h5 font-weight-bold" :class="getPTOAvailable(balance) <= 0 ? 'text-error' : getPTOAvailable(balance) < 8 ? 'text-warning' : 'text-success'">
                            {{ getPTOAvailable(balance).toFixed(1) }}
                          </div>
                          <div class="text-caption text-grey">Balance</div>
                        </div>
                      </div>
                    </template>
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- No PTO Types State -->
              <v-col v-if="ptoBalances.length === 0" cols="12">
                <v-card class="bg-white shadow-sm rounded-xl" elevation="0">
                  <v-card-text class="text-center py-8">
                    <v-icon size="64" color="grey-lighten-2">mdi-beach</v-icon>
                    <p class="text-body-2 text-grey mt-4">No PTO balances configured for this employee</p>
                    <v-btn v-if="isAdmin" variant="tonal" color="primary" class="mt-4" @click="showAddPTOTypeDialog = true">
                      <v-icon start>mdi-plus</v-icon>
                      Add PTO Balance
                    </v-btn>
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- Admin Actions Card with Save Button -->
              <v-col v-if="isAdmin && ptoBalances.length > 0" cols="12">
                <v-card class="bg-amber-lighten-5 shadow-sm rounded-xl" elevation="0">
                  <v-card-text class="d-flex align-center justify-space-between flex-wrap gap-2">
                    <div class="d-flex align-center">
                      <v-icon color="amber-darken-2" class="mr-2">mdi-information</v-icon>
                      <span class="text-body-2">PTO balance changes are logged in the Change History tab.</span>
                    </div>
                    <div class="d-flex gap-2">
                      <v-btn variant="tonal" color="grey" size="small" @click="showAddPTOTypeDialog = true">
                        <v-icon start size="18">mdi-plus</v-icon>
                        Add PTO Type
                      </v-btn>
                      <v-btn 
                        variant="flat" 
                        color="success" 
                        size="small" 
                        :loading="savingPTO"
                        :disabled="!hasPTOChanges"
                        @click="saveAllPTOBalances"
                      >
                        <v-icon start size="18">mdi-content-save</v-icon>
                        Save PTO Changes
                      </v-btn>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-window-item>

          <!-- TAB 3: GROWTH & SKILLS -->
          <v-window-item value="skills">
            <RosterSkillsTab
              :skills="skills"
              :mentorships="mentorships"
              :employee-id="employeeId"
            />
          </v-window-item>

          <!-- TAB: ATTENDANCE -->
          <v-window-item v-if="canViewSensitiveData" value="attendance">
            <v-row>
              <!-- Attendance Breakdown Widget -->
              <v-col cols="12" md="4">
                <v-card class="bg-white shadow-sm rounded-xl" elevation="0">
                  <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
                    <v-icon start size="20" color="primary">mdi-chart-donut</v-icon>
                    Reliability Overview
                  </v-card-title>
                  <v-card-text>
                    <EmployeeAttendanceBreakdown
                      ref="attendanceBreakdownRef"
                      :employee-id="employeeId"
                      :lookback-days="90"
                      @score-updated="(score) => reliabilityScore = score"
                    />
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- Attendance History -->
              <v-col cols="12" md="8">
                <v-card class="bg-white shadow-sm rounded-xl" elevation="0">
                  <v-card-text>
                    <EmployeeAttendanceHistory
                      ref="attendanceHistoryRef"
                      :employee-id="employeeId"
                      :lookback-days="90"
                      @attendance-updated="onAttendanceUpdated"
                    />
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-window-item>

          <!-- TAB 4: HISTORY & NOTES -->
          <v-window-item v-if="canViewSensitiveData" value="history">
            <RosterHistoryTab
              :employee="employee"
              :notes="notes"
              :audit-logs="auditLogs"
              :is-admin="isAdmin"
              @open-note-dialog="showNoteDialog = true"
            />
          </v-window-item>

          <!-- TAB 5: DOCUMENTS -->
          <v-window-item v-if="canViewSensitiveData" value="documents">
            <RosterDocumentsTab
              :documents="documents"
              :is-admin="isAdmin"
              @open-document-dialog="showDocumentDialog = true"
            />
          </v-window-item>

          <!-- TAB 6: ASSETS -->
          <v-window-item v-if="canViewSensitiveData" value="assets">
            <RosterAssetsTab
              :assets="assets"
              :is-admin="isAdmin"
              @open-asset-dialog="showAssetDialog = true"
              @return-asset="returnAsset"
            />
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

    <!-- Admin Request Review Dialog -->
    <v-dialog v-model="showRequestReviewDialog" max-width="600" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start color="primary">mdi-clipboard-plus</v-icon>
          Request Review for {{ employee?.first_name }}
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" aria-label="Close" @click="showRequestReviewDialog = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <v-alert type="info" variant="tonal" class="mb-6">
            This will notify <strong>{{ employee?.first_name }} {{ employee?.last_name }}</strong> 
            to complete a self-assessment for performance review.
          </v-alert>

          <!-- Topics for Review -->
          <div class="mb-6">
            <div class="text-subtitle-2 font-weight-bold mb-2">Topics to Address</div>
            <v-combobox
              v-model="reviewRequest.topics"
              :items="reviewTopicSuggestions"
              label="Select or type topics"
              multiple
              chips
              closable-chips
              variant="outlined"
              density="comfortable"
            />
          </div>

          <!-- Skill Categories to Review -->
          <div class="mb-6">
            <div class="text-subtitle-2 font-weight-bold mb-2">Skill Categories to Assess</div>
            <v-select
              v-model="reviewRequest.skillCategories"
              :items="skillCategoryOptionsForReview"
              label="Select skill categories"
              multiple
              chips
              closable-chips
              variant="outlined"
              density="comfortable"
            />
          </div>

          <!-- Specific Skills Write-In -->
          <div class="mb-6">
            <div class="text-subtitle-2 font-weight-bold mb-2">Specific Skills (Optional)</div>
            <v-text-field
              v-model="reviewRequest.specificSkills"
              label="Enter specific skills to assess"
              variant="outlined"
              density="comfortable"
              hint="List any specific skills not covered by categories above"
              persistent-hint
            />
          </div>

          <!-- Admin Notes -->
          <div class="mb-4">
            <div class="text-subtitle-2 font-weight-bold mb-2">Notes for Employee</div>
            <v-textarea
              v-model="reviewRequest.notes"
              label="Context or instructions for the employee..."
              variant="outlined"
              rows="3"
            />
          </div>

          <!-- Due Date -->
          <div>
            <div class="text-subtitle-2 font-weight-bold mb-2">Due Date</div>
            <v-text-field
              v-model="reviewRequest.dueDate"
              type="date"
              variant="outlined"
              density="comfortable"
              :min="minReviewDate"
            />
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="showRequestReviewDialog = false">Cancel</v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            variant="flat"
            :loading="submittingReviewRequest"
            :disabled="reviewRequest.topics.length === 0"
            @click="submitAdminReviewRequest"
          >
            <v-icon start>mdi-send</v-icon>
            Send Request
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

    <!-- Add Note Dialog -->
    <v-dialog v-model="showNoteDialog" max-width="500">
      <v-card>
        <v-card-title>
          <v-icon start color="primary">mdi-note-plus</v-icon>
          Add HR Note
        </v-card-title>
        <v-card-text>
          <v-textarea
            v-model="noteForm.note"
            label="Note"
            variant="outlined"
            rows="4"
            placeholder="Enter note content..."
            counter
          />
          <v-select
            v-model="noteForm.visibility"
            :items="[
              { title: 'Private (Admins Only)', value: 'private' },
              { title: 'Visible to Employee', value: 'employee' }
            ]"
            item-title="title"
            item-value="value"
            label="Visibility"
            variant="outlined"
            density="compact"
            class="mt-3"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showNoteDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="savingNote"
            :disabled="!noteForm.note.trim()"
            @click="saveNote"
          >
            <v-icon start>mdi-content-save</v-icon>
            Save Note
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Assign Asset Dialog -->
    <v-dialog v-model="showAssetDialog" max-width="500">
      <v-card>
        <v-card-title>
          <v-icon start color="warning">mdi-package-variant-plus</v-icon>
          Assign Asset
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="assetForm.asset_name"
            label="Asset Name"
            variant="outlined"
            density="compact"
            placeholder="e.g., Office Key #3, MacBook Pro"
          />
          <v-select
            v-model="assetForm.asset_type"
            :items="['Key', 'Badge', 'Device', 'Equipment', 'Uniform', 'Other']"
            label="Asset Type"
            variant="outlined"
            density="compact"
            class="mt-3"
          />
          <v-text-field
            v-model="assetForm.serial_number"
            label="Serial Number (Optional)"
            variant="outlined"
            density="compact"
            class="mt-3"
          />
          <v-text-field
            v-model="assetForm.expected_return_date"
            label="Expected Return Date (Optional)"
            type="date"
            variant="outlined"
            density="compact"
            class="mt-3"
          />
          <v-textarea
            v-model="assetForm.notes"
            label="Notes (Optional)"
            variant="outlined"
            rows="2"
            class="mt-3"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showAssetDialog = false">Cancel</v-btn>
          <v-btn
            color="warning"
            variant="flat"
            :loading="savingAsset"
            :disabled="!assetForm.asset_name.trim()"
            @click="saveAsset"
          >
            <v-icon start>mdi-check</v-icon>
            Assign
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Document Upload Dialog -->
    <v-dialog v-model="showDocumentDialog" max-width="500">
      <v-card>
        <v-card-title class="bg-teal text-white py-4">
          <v-icon start>mdi-file-upload</v-icon>
          Add Document
        </v-card-title>
        <v-card-text class="pt-6">
          <v-select
            v-model="documentForm.category"
            :items="documentCategories"
            item-title="title"
            item-value="value"
            label="Document Category *"
            variant="outlined"
            density="compact"
            class="mb-3"
          />
          <v-text-field
            v-model="documentForm.description"
            label="Description (optional)"
            variant="outlined"
            density="compact"
            class="mb-3"
          />
          <v-file-input
            v-model="documentForm.file"
            label="Select File *"
            variant="outlined"
            density="compact"
            prepend-icon=""
            prepend-inner-icon="mdi-paperclip"
            show-size
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xls,.xlsx"
          />
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="showDocumentDialog = false">Cancel</v-btn>
          <v-btn 
            color="primary" 
            :loading="savingDocument" 
            :disabled="!documentForm.file || !documentForm.category"
            @click="uploadDocument"
          >
            Upload
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Personal Info Edit Dialog -->
    <v-dialog v-model="showPersonalInfoDialog" max-width="800" scrollable>
      <v-card>
        <v-card-title class="bg-primary text-white d-flex align-center py-4">
          <v-icon start>mdi-account-edit</v-icon>
          Edit Personal Information
        </v-card-title>
        <v-card-text class="pa-6" style="max-height: 70vh;">
          <v-tabs v-model="personalInfoTab" color="primary" class="mb-6">
            <v-tab value="profile">Profile</v-tab>
            <v-tab value="basic">Basic Info</v-tab>
            <v-tab value="contact">Contact</v-tab>
            <v-tab value="address">Address</v-tab>
            <v-tab value="emergency">Emergency</v-tab>
            <v-tab value="employment">Employment</v-tab>
            <v-tab value="admin">Admin</v-tab>
          </v-tabs>

          <v-window v-model="personalInfoTab">
            <!-- Profile Tab (Avatar & Bio) -->
            <v-window-item value="profile">
              <v-row dense>
                <v-col cols="12" class="d-flex flex-column align-center mb-4">
                  <v-avatar size="120" class="mb-3 elevation-3">
                    <v-img v-if="avatarPreviewUrl" :src="avatarPreviewUrl" cover />
                    <v-img v-else-if="avatarUrl" :src="avatarUrl" cover />
                    <span v-else class="text-h3 font-weight-bold bg-primary text-white d-flex align-center justify-center" style="width: 100%; height: 100%;">
                      {{ getInitials(employee) }}
                    </span>
                  </v-avatar>
                  <v-btn variant="outlined" size="small" color="primary" prepend-icon="mdi-camera" @click="($refs.avatarInput as HTMLInputElement)?.click()">
                    Change Photo
                  </v-btn>
                  <input ref="avatarInput" type="file" accept="image/png,image/jpeg,image/webp" style="display: none;" @change="onAvatarFileSelected" />
                  <p v-if="avatarFileInput" class="text-caption text-success mt-1">{{ avatarFileInput.name }} selected</p>
                  <p class="text-caption text-grey mt-1">PNG, JPG, or WebP. Max 2MB.</p>
                </v-col>
                <v-col cols="12">
                  <v-textarea v-model="personalInfoForm.bio" label="Bio / About" variant="outlined" density="compact" rows="5" placeholder="Write a short bio..." />
                </v-col>
              </v-row>
            </v-window-item>

            <!-- Basic Info Tab -->
            <v-window-item value="basic">
              <v-row dense>
                <v-col cols="12" md="4">
                  <v-text-field v-model="personalInfoForm.first_name" label="First Name *" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field v-model="personalInfoForm.last_name" label="Last Name *" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field v-model="personalInfoForm.preferred_name" label="Preferred Name" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field v-model="personalInfoForm.employee_number" label="Employee Number" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field v-model="personalInfoForm.date_of_birth" label="Date of Birth" type="date" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field v-model="personalInfoForm.hire_date" label="Hire Date" type="date" variant="outlined" density="compact" />
                </v-col>
              </v-row>
            </v-window-item>

            <!-- Contact Tab -->
            <v-window-item value="contact">
              <v-row dense>
                <v-col cols="12" md="6">
                  <v-text-field v-model="personalInfoForm.email_work" label="Work Email" type="email" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="personalInfoForm.email_personal" label="Personal Email" type="email" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="personalInfoForm.phone_mobile" label="Mobile Phone" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="personalInfoForm.phone_work" label="Work Phone" variant="outlined" density="compact" />
                </v-col>
              </v-row>
            </v-window-item>

            <!-- Address Tab -->
            <v-window-item value="address">
              <v-row dense>
                <v-col cols="12">
                  <v-text-field v-model="personalInfoForm.address_street" label="Street Address" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="5">
                  <v-text-field v-model="personalInfoForm.address_city" label="City" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="3">
                  <v-text-field v-model="personalInfoForm.address_state" label="State" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field v-model="personalInfoForm.address_zip" label="ZIP Code" variant="outlined" density="compact" />
                </v-col>
              </v-row>
            </v-window-item>

            <!-- Emergency Contact Tab -->
            <v-window-item value="emergency">
              <v-row dense>
                <v-col cols="12" md="4">
                  <v-text-field v-model="personalInfoForm.emergency_contact_name" label="Contact Name" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field v-model="personalInfoForm.emergency_contact_phone" label="Contact Phone" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field v-model="personalInfoForm.emergency_contact_relationship" label="Relationship" variant="outlined" density="compact" />
                </v-col>
              </v-row>
            </v-window-item>

            <!-- Employment Tab -->
            <v-window-item value="employment">
              <v-row dense>
                <v-col cols="12" md="4">
                  <v-select v-model="personalInfoForm.department_id" :items="departments" item-title="name" item-value="id" label="Department" variant="outlined" density="compact" clearable />
                </v-col>
                <v-col cols="12" md="4">
                  <v-select v-model="personalInfoForm.position_id" :items="positions" item-title="title" item-value="id" label="Position" variant="outlined" density="compact" clearable />
                </v-col>
                <v-col cols="12" md="4">
                  <v-select v-model="personalInfoForm.location_id" :items="locations" item-title="name" item-value="id" label="Location" variant="outlined" density="compact" clearable />
                </v-col>
                <v-col cols="12" md="4">
                  <v-select v-model="personalInfoForm.employment_type" :items="['full-time', 'part-time', 'contract', 'per-diem', 'intern']" label="Employment Type" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="4">
                  <v-select v-model="personalInfoForm.employment_status" :items="['active', 'inactive', 'on-leave', 'terminated']" label="Status" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="4">
                  <v-select v-model="personalInfoForm.manager_employee_id" :items="managerOptions" item-title="label" item-value="value" label="Reports To" variant="outlined" density="compact" clearable />
                </v-col>
                <v-col v-if="personalInfoForm.employment_status === 'terminated'" cols="12" md="4">
                  <v-text-field v-model="personalInfoForm.termination_date" label="Termination Date" type="date" variant="outlined" density="compact" />
                </v-col>
              </v-row>
            </v-window-item>

            <!-- Admin Tab -->
            <v-window-item value="admin">
              <v-alert type="warning" variant="tonal" class="mb-4">
                <v-icon start>mdi-shield-alert</v-icon>
                Changes to these settings affect system access.
              </v-alert>
              <v-row dense>
                <v-col cols="12" md="6">
                  <v-select v-model="personalInfoForm.profile_role" :items="['admin', 'user']" label="Profile Role" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-switch v-model="personalInfoForm.profile_is_active" label="Profile Active" color="success" hide-details />
                </v-col>
                <v-col cols="12">
                  <v-textarea v-model="personalInfoForm.notes_internal" label="Internal Notes (Admin Only)" variant="outlined" density="compact" rows="4" />
                </v-col>
              </v-row>
            </v-window-item>
          </v-window>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="showPersonalInfoDialog = false">Cancel</v-btn>
          <v-spacer />
          <v-btn color="primary" variant="flat" :loading="savingPersonalInfo" @click="savePersonalInfo">
            <v-icon start>mdi-content-save</v-icon>
            Save Changes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add PTO Type Dialog -->
    <v-dialog v-model="showAddPTOTypeDialog" max-width="500">
      <v-card>
        <v-card-title class="bg-primary text-white py-4">
          <v-icon start>mdi-plus-circle</v-icon>
          Add PTO Balance Type
        </v-card-title>
        <v-card-text class="pa-6">
          <v-select
            v-model="addPTOForm.time_off_type_id"
            :items="availableTimeOffTypes"
            item-title="name"
            item-value="id"
            label="Time Off Type *"
            variant="outlined"
            density="compact"
            class="mb-4"
          />
          <v-text-field
            v-model.number="addPTOForm.assigned_hours"
            label="Assigned Hours"
            type="number"
            step="0.5"
            variant="outlined"
            density="compact"
            hint="Total hours allocated for this year"
            persistent-hint
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="showAddPTOTypeDialog = false">Cancel</v-btn>
          <v-spacer />
          <v-btn color="primary" variant="flat" :loading="addingPTOType" :disabled="!addPTOForm.time_off_type_id" @click="addPTOType">
            <v-icon start>mdi-plus</v-icon>
            Add
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- License Add/Edit Dialog -->
    <v-dialog v-model="showLicenseDialog" max-width="550" persistent>
      <v-card>
        <v-card-title class="d-flex align-center bg-warning-lighten-5 py-4">
          <v-icon start color="warning">mdi-card-account-details</v-icon>
          {{ licenseForm.id ? 'Edit License' : 'Add License' }}
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" aria-label="Close" @click="closeLicenseDialog" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <v-row dense>
            <v-col cols="12">
              <v-text-field
                v-model="licenseForm.license_type"
                label="License Type *"
                placeholder="e.g., RVT, DVM, CVT"
                variant="outlined"
                density="compact"
                :rules="[v => !!v || 'License type is required']"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="licenseForm.license_number"
                label="License Number"
                placeholder="e.g., 12345"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="licenseForm.state_code"
                :items="usStates"
                label="State"
                variant="outlined"
                density="compact"
                clearable
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="licenseForm.issue_date"
                label="Issued Date"
                type="date"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="licenseForm.expiration_date"
                label="Expiration Date"
                type="date"
                variant="outlined"
                density="compact"
                :disabled="licenseForm.never_expires"
                :hint="licenseForm.never_expires ? 'Disabled - license never expires' : ''"
                persistent-hint
              />
            </v-col>
            <v-col cols="12">
              <v-checkbox
                v-model="licenseForm.never_expires"
                label="This license never expires"
                color="primary"
                density="compact"
                hide-details
                class="mt-0"
              />
            </v-col>

          </v-row>
          
          <v-alert v-if="licenseForm.id" type="warning" variant="tonal" density="compact" class="mt-4">
            <template #prepend>
              <v-icon>mdi-information</v-icon>
            </template>
            Changing the expiration date will reset notification reminders.
          </v-alert>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-btn v-if="licenseForm.id" color="error" variant="text" @click="confirmDeleteLicense">
            <v-icon start>mdi-delete</v-icon>
            Delete
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="closeLicenseDialog">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :loading="savingLicense" :disabled="!licenseForm.license_type" @click="saveLicense">
            <v-icon start>{{ licenseForm.id ? 'mdi-content-save' : 'mdi-plus' }}</v-icon>
            {{ licenseForm.id ? 'Save' : 'Add' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Certification Add/Edit Dialog -->
    <v-dialog v-model="showCertDialog" max-width="550" persistent>
      <v-card>
        <v-card-title class="d-flex align-center bg-info-lighten-5 py-4">
          <v-icon start color="info">mdi-school</v-icon>
          {{ certForm.id ? 'Edit Certification' : 'Add Certification' }}
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" aria-label="Close" @click="closeCertDialog" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <v-row dense>
            <v-col cols="12">
              <v-autocomplete
                v-model="certForm.certification_id"
                :items="availableCertifications"
                item-title="name"
                item-value="id"
                label="Certification *"
                placeholder="Select or search certification"
                variant="outlined"
                density="compact"
                :rules="[v => !!v || 'Certification is required']"
              >
                <template #item="{ item, props }">
                  <v-list-item v-bind="props">
                    <v-list-item-subtitle>{{ item.raw.issuing_authority }}</v-list-item-subtitle>
                  </v-list-item>
                </template>
              </v-autocomplete>
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="certForm.certification_number"
                label="Certification Number"
                placeholder="e.g., CERT-12345"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="certForm.issued_date"
                label="Issued Date"
                type="date"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="certForm.expiration_date"
                label="Expiration Date"
                type="date"
                variant="outlined"
                density="compact"
                :disabled="certForm.never_expires"
                :hint="certForm.never_expires ? 'Disabled - certification never expires' : ''"
                persistent-hint
              />
            </v-col>
            <v-col cols="12">
              <v-checkbox
                v-model="certForm.never_expires"
                label="This certification never expires"
                color="primary"
                density="compact"
                hide-details
                class="mt-0"
              />
            </v-col>
            <v-col cols="12">
              <v-select
                v-model="certForm.status"
                :items="certStatusOptions"
                label="Status"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="certForm.notes"
                label="Notes"
                placeholder="Optional notes about this certification"
                variant="outlined"
                density="compact"
                rows="2"
              />
            </v-col>
          </v-row>
          
          <v-alert v-if="certForm.id" type="info" variant="tonal" density="compact" class="mt-4">
            <template #prepend>
              <v-icon>mdi-information</v-icon>
            </template>
            Changing the expiration date will reset notification reminders.
          </v-alert>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-btn v-if="certForm.id" color="error" variant="text" @click="confirmDeleteCert">
            <v-icon start>mdi-delete</v-icon>
            Delete
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="closeCertDialog">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :loading="savingCert" :disabled="!certForm.certification_id" @click="saveCert">
            <v-icon start>{{ certForm.id ? 'mdi-content-save' : 'mdi-plus' }}</v-icon>
            {{ certForm.id ? 'Save' : 'Add' }}
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
const { invalidateCache: invalidateAppDataCache } = useAppData()
const { canViewProfile } = usePermissions()

// Route params
const employeeId = computed(() => route.params.id as string)
const currentYear = new Date().getFullYear()

// Access control - check if user can view this profile
// Note: employeeId is the employee table ID, NOT the profile ID
const isOwnProfile = computed(() => employeeId.value === userStore.employee?.id)
const hasProfileAccess = computed(() => {
  // Always allow viewing own profile
  if (isOwnProfile.value) return true
  
  // Check if user has full roster access
  return canViewProfile(employeeId.value)
})

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
const skills = ref<any[]>([])
const mentorships = ref<any[]>([])
const skillCategories = ref<string[]>([])
const notes = ref<any[]>([])
const documents = ref<any[]>([])
const assets = ref<any[]>([])
const auditLogs = ref<any[]>([])

// Attendance component refs
const attendanceBreakdownRef = ref<any>(null)
const attendanceHistoryRef = ref<any>(null)

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
const showNoteDialog = ref(false)
const savingNote = ref(false)
const showAssetDialog = ref(false)
const savingAsset = ref(false)

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

// Note form
const noteForm = ref({
  note: '',
  visibility: 'private'
})

// Asset form
const assetForm = ref({
  asset_name: '',
  asset_type: 'Badge',
  serial_number: '',
  expected_return_date: null as string | null,
  notes: ''
})

// Document upload state
const showDocumentDialog = ref(false)
const savingDocument = ref(false)
const documentForm = ref({
  category: 'general',
  description: '',
  file: null as File | null
})
const documentCategories = [
  { title: 'Offer Letter', value: 'offer_letter' },
  { title: 'Contract', value: 'contract' },
  { title: 'Performance Review', value: 'performance_review' },
  { title: 'Certification', value: 'certification' },
  { title: 'License', value: 'license' },
  { title: 'Training', value: 'training' },
  { title: 'General', value: 'general' }
]

// Admin Review Request state
const showRequestReviewDialog = ref(false)
const submittingReviewRequest = ref(false)
const reviewRequest = reactive({
  topics: [] as string[],
  skillCategories: [] as string[],
  specificSkills: '',
  notes: '',
  dueDate: ''
})
const reviewTopicSuggestions = [
  'Job Performance',
  'Teamwork & Collaboration',
  'Communication Skills',
  'Technical Skills',
  'Time Management',
  'Customer Service',
  'Leadership',
  'Problem Solving',
  'Attendance & Punctuality',
  'Professional Development'
]
const minReviewDate = computed(() => new Date().toISOString().split('T')[0])
// Skill category options for review - matches veterinary taxonomy from migration 126
const skillCategoryOptionsForReview = [
  'Clinical',
  'Surgical',
  'Anesthesia',
  'Dentistry',
  'Pharmacy',
  'Emergency',
  'Imaging',
  'Animal Care',
  'Nutrition',
  'Client Services',
  'Administrative',
  'Safety & Compliance',
  'Specialized',
  'Species Expertise'
]

// Personal Info Edit state
const showPersonalInfoDialog = ref(false)
const savingPersonalInfo = ref(false)
const personalInfoTab = ref('basic')
const avatarFileInput = ref<File | null>(null)
const avatarPreviewUrl = ref('')
const personalInfoForm = ref({
  first_name: '',
  last_name: '',
  preferred_name: '',
  employee_number: '',
  date_of_birth: '',
  hire_date: '',
  email_work: '',
  email_personal: '',
  phone_mobile: '',
  phone_work: '',
  address_street: '',
  address_city: '',
  address_state: '',
  address_zip: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relationship: '',
  department_id: null as string | null,
  position_id: null as string | null,
  location_id: null as string | null,
  employment_type: '',
  employment_status: '',
  manager_employee_id: null as string | null,
  termination_date: '',
  profile_role: 'user',
  profile_is_active: true,
  notes_internal: '',
  bio: ''
})

// Lookup data for personal info form
const departments = ref<any[]>([])
const positions = ref<any[]>([])
const locations = ref<any[]>([])
const allEmployees = ref<any[]>([])
const timeOffTypes = ref<any[]>([])

// Manager options computed
const managerOptions = computed(() => {
  return allEmployees.value
    .filter(e => e.id !== employeeId.value)
    .map(e => ({
      label: `${e.preferred_name || e.first_name} ${e.last_name}`,
      value: e.id
    }))
})

// PTO Edit state - simplified to Assigned/Used/Balance
const showPTODialog = ref(false)
const savingPTO = ref(false)
const ptoEditForm = ref({
  id: '',
  type_name: '',
  assigned_hours: 0,
  used_hours: 0
})

// PTO Inline Editing state - simplified to Assigned/Used only, Balance is computed
const ptoEditableBalances = ref<Array<{ id: string; assigned_hours: number; used_hours: number }>>([])
const ptoChangedIndexes = ref<Set<number>>(new Set())

// Computed: check if any PTO values have changed
const hasPTOChanges = computed(() => ptoChangedIndexes.value.size > 0)

// Add PTO Type state
const showAddPTOTypeDialog = ref(false)
const addingPTOType = ref(false)
const addPTOForm = ref({
  time_off_type_id: null as string | null,
  assigned_hours: 0
})

// Available time off types (not already assigned)
const availableTimeOffTypes = computed(() => {
  const assignedIds = new Set(ptoBalances.value.map(b => b.time_off_type_id))
  return timeOffTypes.value.filter(t => !assignedIds.has(t.id))
})

// ==========================================
// LICENSE MANAGEMENT
// ==========================================
const showLicenseDialog = ref(false)
const savingLicense = ref(false)
const licenseForm = ref({
  id: null as string | null,
  license_type: '',
  license_number: '',
  state_code: '',
  issue_date: '',
  expiration_date: '',
  never_expires: false
})
const usStates = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC']

// ==========================================
// CERTIFICATION MANAGEMENT
// ==========================================
const showCertDialog = ref(false)
const savingCert = ref(false)
const allCertifications = ref<any[]>([]) // Master list of certifications
const certForm = ref({
  id: null as string | null,
  certification_id: null as string | null,
  certification_number: '',
  issued_date: '',
  expiration_date: '',
  never_expires: false,
  status: 'active',
  notes: ''
})

const certStatusOptions = ['pending', 'active', 'expired', 'revoked', 'renewal_pending']

// Available certifications for dropdown (excludes already assigned unless editing)
const availableCertifications = computed(() => {
  const assignedIds = new Set(certifications.value.map(c => c.certification_id))
  // If editing, include the current certification
  if (certForm.value.id) {
    const editingCertId = certifications.value.find(c => c.id === certForm.value.id)?.certification_id
    return allCertifications.value.filter(c => !assignedIds.has(c.id) || c.id === editingCertId)
  }
  return allCertifications.value.filter(c => !assignedIds.has(c.id))
})

// Expiring certifications count
const expiringCertsCount = computed(() => {
  return certifications.value.filter(c => {
    if (c.never_expires) return false
    if (!c.expiration_date) return false
    const daysUntil = differenceInDays(new Date(c.expiration_date), new Date())
    return daysUntil <= 60 && daysUntil >= 0
  }).length
})

// ==========================================
// COMPUTED
// ==========================================
const isAdmin = computed(() => authStore.isAdmin)

const canViewSensitiveData = computed(() => {
  // Admins can see everything
  if (isAdmin.value) return true
  // Users can see their own profile
  if (isOwnProfile.value) return true
  // Peers cannot see sensitive data
  return false
})

const totalPTOHours = computed(() => {
  // Calculate available PTO: assigned - used
  return ptoBalances.value.reduce((sum, b) => {
    const available = (b.assigned_hours || 0) - (b.used_hours || 0)
    return sum + Math.max(0, available)
  }, 0)
})

const expiringLicensesCount = computed(() => {
  return licenses.value.filter(l => {
    if (l.never_expires) return false
    if (!l.expiration_date) return false
    const daysUntil = differenceInDays(new Date(l.expiration_date), new Date())
    return daysUntil <= 60 && daysUntil >= 0
  }).length
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
  if (license.never_expires) return 'success'
  if (!license.expiration_date) return 'grey'
  const daysUntil = differenceInDays(new Date(license.expiration_date), new Date())
  if (daysUntil < 0) return 'error'
  if (daysUntil <= 30) return 'error'
  if (daysUntil <= 60) return 'warning'
  return 'success'
}

function formatExpirationStatus(license: any): string {
  if (license.never_expires) return 'Permanent'
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
  if (cert.never_expires) return 'success'
  if (!cert.expiration_date) return 'info'
  const daysUntil = differenceInDays(new Date(cert.expiration_date), new Date())
  if (daysUntil < 0) return 'error'
  if (daysUntil <= 30) return 'warning'
  return 'success'
}


// ==========================================
// DATA LOADING
// ==========================================
async function loadEmployeeData() {
  isLoading.value = true
  error.value = ''

  // Check access first - redirect if user doesn't have permission
  if (!hasProfileAccess.value) {
    error.value = 'You do not have permission to view this profile.'
    isLoading.value = false
    // Redirect to own profile or roster after a delay
    setTimeout(() => {
      router.push('/roster')
    }, 2000)
    return
  }

  try {
    // Load employee with related data
    // Note: Manager is fetched separately to avoid PostgREST self-join issues
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
    
    // Fetch manager separately if manager_employee_id exists (avoids self-join issues)
    if (emp.manager_employee_id) {
      const { data: managerData } = await supabase
        .from('employees')
        .select('id, first_name, last_name, preferred_name')
        .eq('id', emp.manager_employee_id)
        .single()
      
      if (managerData) {
        ;(emp as any).manager = managerData
      }
    }

    employee.value = emp
    profileEmail.value = emp.profile?.email || ''
    avatarUrl.value = emp.profile?.avatar_url || ''
    bio.value = emp.profile?.bio || ''
    
    // Populate emergency contact from employee data
    emergencyContact.value = {
      name: emp.emergency_contact_name || '',
      phone: emp.emergency_contact_phone || '',
      relationship: emp.emergency_contact_relationship || ''
    }

    // Load licenses and certifications for everyone (public info)
    await Promise.all([
      loadLicenses(),
      loadCertifications(),
      loadSkills(),
      loadMentorships()
    ])

    // Load additional data only if user can view sensitive info
    if (canViewSensitiveData.value) {
      await Promise.all([
        loadReliabilityScore(),
        loadNextShift(),
        loadPTOBalances(),
        loadCompensation(),
        loadNotes(),
        loadDocuments(),
        loadAssets(),
        loadAuditLogs()
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
    // Try to use the new attendance system first
    const { getReliabilityScore, getAttendanceBreakdown } = useAttendance()
    
    // Get the breakdown which includes reliability score and total count
    const breakdown = await getAttendanceBreakdown(employeeId.value, 90)
    reliabilityScore.value = breakdown.reliabilityScore
    totalShifts.value = breakdown.total
    
  } catch (err) {
    console.log('[Profile] Attendance system not available, using fallback:', err)
    
    // Fallback to legacy calculation
    try {
      const { data: shifts } = await supabase
        .from('shifts')
        .select('id, start_at')
        .eq('employee_id', employeeId.value)
        .eq('status', 'completed')
        .lte('start_at', new Date().toISOString())

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
        if (entry && entry.clock_in_at) {
          const shiftStart = new Date(shift.start_at)
          const clockIn = new Date(entry.clock_in_at)
          const diffMinutes = (clockIn.getTime() - shiftStart.getTime()) / 60000
          if (diffMinutes <= 5) onTimeCount++
        }
      })

      reliabilityScore.value = Math.round((onTimeCount / totalShifts.value) * 100)
    } catch (fallbackErr) {
      console.log('[Profile] Fallback reliability calculation failed:', fallbackErr)
      reliabilityScore.value = 100
    }
  }
}

/**
 * Handler for when attendance records are updated (e.g., excused)
 * Refreshes the attendance breakdown to recalculate the reliability score
 */
async function onAttendanceUpdated() {
  // Refresh the breakdown component which will recalculate the score
  if (attendanceBreakdownRef.value) {
    await attendanceBreakdownRef.value.refresh()
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
      .maybeSingle()

    nextShift.value = data
  } catch (err) {
    console.log('[Profile] Next shift not available:', err)
  }
}

async function loadPTOBalances() {
  try {
    // Load PTO balances - try with embedded type name first, fall back to separate lookup
    let balancesData: any[] = []
    
    try {
      // First try with embedded foreign key join
      const { data, error } = await supabase
        .from('employee_time_off_balances')
        .select(`
          *,
          time_off_type:time_off_types(name)
        `)
        .eq('employee_id', employeeId.value)
        .eq('period_year', currentYear)
      
      if (error) throw error
      balancesData = data || []
    } catch (joinErr) {
      // Fallback: load balances without join, then manually add type names
      console.log('[Profile] FK join failed, using fallback:', joinErr)
      const { data } = await supabase
        .from('employee_time_off_balances')
        .select('*')
        .eq('employee_id', employeeId.value)
        .eq('period_year', currentYear)
      
      balancesData = data || []
      
      // Manually enrich with type names from already-loaded timeOffTypes
      if (balancesData.length > 0 && timeOffTypes.value.length > 0) {
        balancesData = balancesData.map(b => ({
          ...b,
          time_off_type: timeOffTypes.value.find(t => t.id === b.time_off_type_id) || { name: 'Unknown' }
        }))
      }
    }

    ptoBalances.value = balancesData.filter(b => {
      // Only show balances for active time_off_types (ones that exist in timeOffTypes)
      const typeExists = timeOffTypes.value.some(t => t.id === b.time_off_type_id)
      return typeExists && b.time_off_type?.name && b.time_off_type.name !== 'Unknown'
    })
    
    // Initialize editable balances for inline editing - simplified to Assigned/Used
    ptoEditableBalances.value = ptoBalances.value.map(b => ({
      id: b.id,
      assigned_hours: b.assigned_hours || 0,
      used_hours: b.used_hours || 0
    }))
    ptoChangedIndexes.value.clear()
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
    // Load employee's certifications
    const { data } = await supabase
      .from('employee_certifications')
      .select(`
        *,
        certification:certifications(id, name, code, issuing_authority)
      `)
      .eq('employee_id', employeeId.value)
      .order('expiration_date', { ascending: true })

    certifications.value = data || []
    
    // Also load master certification list for the dropdown
    const { data: certList } = await supabase
      .from('certifications')
      .select('id, name, code, issuing_authority, validity_months')
      .order('name')
    
    allCertifications.value = certList || []
  } catch (err) {
    console.log('[Profile] Certifications not available:', err)
  }
}

// ==========================================
// LICENSE CRUD FUNCTIONS
// ==========================================
function openAddLicenseDialog() {
  licenseForm.value = {
    id: null,
    license_type: '',
    license_number: '',
    state_code: '',
    issue_date: '',
    expiration_date: '',
    never_expires: false
  }
  showLicenseDialog.value = true
}

function openEditLicenseDialog(license: any) {
  licenseForm.value = {
    id: license.id,
    license_type: license.license_type || '',
    license_number: license.license_number || '',
    state_code: license.state_code || '',
    issue_date: license.issue_date || '',
    expiration_date: license.expiration_date || '',
    never_expires: license.never_expires || false
  }
  showLicenseDialog.value = true
}

function closeLicenseDialog() {
  showLicenseDialog.value = false
  licenseForm.value = {
    id: null,
    license_type: '',
    license_number: '',
    state_code: '',
    issue_date: '',
    expiration_date: '',
    never_expires: false
  }
}

async function saveLicense() {
  if (!licenseForm.value.license_type) {
    toast.error('License type is required')
    return
  }

  savingLicense.value = true
  try {
    const payload = {
      employee_id: employeeId.value,
      license_type: licenseForm.value.license_type,
      license_number: licenseForm.value.license_number || 'N/A',
      state_code: licenseForm.value.state_code || null,
      issue_date: licenseForm.value.issue_date || null,
      expiration_date: licenseForm.value.never_expires ? null : (licenseForm.value.expiration_date || null),
      never_expires: licenseForm.value.never_expires
    }

    if (licenseForm.value.id) {
      // Update existing
      const { error } = await supabase
        .from('employee_licenses')
        .update(payload)
        .eq('id', licenseForm.value.id)

      if (error) throw error
      toast.success('License updated')
    } else {
      // Create new
      const { error } = await supabase
        .from('employee_licenses')
        .insert(payload)

      if (error) throw error
      toast.success('License added')
    }

    closeLicenseDialog()
    await loadLicenses()
  } catch (err: any) {
    console.error('Error saving license:', err)
    toast.error(err.message || 'Failed to save license')
  } finally {
    savingLicense.value = false
  }
}

async function confirmDeleteLicense() {
  if (!licenseForm.value.id) return
  
  if (!confirm('Are you sure you want to delete this license? This action cannot be undone.')) {
    return
  }

  savingLicense.value = true
  try {
    const { error } = await supabase
      .from('employee_licenses')
      .delete()
      .eq('id', licenseForm.value.id)

    if (error) throw error
    toast.success('License deleted')
    closeLicenseDialog()
    await loadLicenses()
  } catch (err: any) {
    console.error('Error deleting license:', err)
    toast.error(err.message || 'Failed to delete license')
  } finally {
    savingLicense.value = false
  }
}

// ==========================================
// CERTIFICATION CRUD FUNCTIONS
// ==========================================
function openAddCertDialog() {
  certForm.value = {
    id: null,
    certification_id: null,
    certification_number: '',
    issued_date: '',
    expiration_date: '',
    never_expires: false,
    status: 'active',
    notes: ''
  }
  showCertDialog.value = true
}

function openEditCertDialog(cert: any) {
  certForm.value = {
    id: cert.id,
    certification_id: cert.certification_id,
    certification_number: cert.certification_number || '',
    issued_date: cert.issued_date || '',
    expiration_date: cert.expiration_date || '',
    never_expires: cert.never_expires || false,
    status: cert.status || 'active',
    notes: cert.notes || ''
  }
  showCertDialog.value = true
}

function closeCertDialog() {
  showCertDialog.value = false
  certForm.value = {
    id: null,
    certification_id: null,
    certification_number: '',
    issued_date: '',
    expiration_date: '',
    never_expires: false,
    status: 'active',
    notes: ''
  }
}

async function saveCert() {
  if (!certForm.value.certification_id) {
    toast.error('Please select a certification')
    return
  }

  savingCert.value = true
  try {
    const payload = {
      employee_id: employeeId.value,
      certification_id: certForm.value.certification_id,
      certification_number: certForm.value.certification_number || null,
      issued_date: certForm.value.issued_date || null,
      expiration_date: certForm.value.never_expires ? null : (certForm.value.expiration_date || null),
      never_expires: certForm.value.never_expires,
      status: certForm.value.status,
      notes: certForm.value.notes || null
    }

    if (certForm.value.id) {
      // Update existing
      const { error } = await supabase
        .from('employee_certifications')
        .update(payload)
        .eq('id', certForm.value.id)

      if (error) throw error
      toast.success('Certification updated')
    } else {
      // Create new
      const { error } = await supabase
        .from('employee_certifications')
        .insert(payload)

      if (error) throw error
      toast.success('Certification added')
    }

    closeCertDialog()
    await loadCertifications()
  } catch (err: any) {
    console.error('Error saving certification:', err)
    toast.error(err.message || 'Failed to save certification')
  } finally {
    savingCert.value = false
  }
}

async function confirmDeleteCert() {
  if (!certForm.value.id) return
  
  if (!confirm('Are you sure you want to delete this certification? This action cannot be undone.')) {
    return
  }

  savingCert.value = true
  try {
    const { error } = await supabase
      .from('employee_certifications')
      .delete()
      .eq('id', certForm.value.id)

    if (error) throw error
    toast.success('Certification deleted')
    closeCertDialog()
    await loadCertifications()
  } catch (err: any) {
    console.error('Error deleting certification:', err)
    toast.error(err.message || 'Failed to delete certification')
  } finally {
    savingCert.value = false
  }
}

async function loadCompensation() {
  try {
    const { data } = await supabase
      .from('employee_compensation')
      .select('*')
      .eq('employee_id', employeeId.value)
      .maybeSingle()

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

async function loadSkills() {
  try {
    const { data } = await supabase
      .from('employee_skills')
      .select(`
        id,
        level,
        is_goal,
        certified_at,
        notes,
        skill:skill_library(id, name, category, description)
      `)
      .eq('employee_id', employeeId.value)
      .order('level', { ascending: false })

    skills.value = data || []
    
    // Extract unique categories
    const cats = new Set<string>()
    skills.value.forEach(s => {
      if (s.skill?.category) cats.add(s.skill.category)
    })
    skillCategories.value = Array.from(cats).sort()
  } catch (err) {
    console.log('[Profile] Skills not available:', err)
  }
}

async function loadMentorships() {
  try {
    // Load mentorships where this employee is either mentor or mentee
    const { data } = await supabase
      .from('mentorships')
      .select(`
        id,
        status,
        started_at,
        completed_at,
        mentor_notes,
        skill:skill_library(id, name, category),
        mentor:employees!mentorships_mentor_employee_id_fkey(id, first_name, last_name, preferred_name),
        mentee:employees!mentorships_mentee_employee_id_fkey(id, first_name, last_name, preferred_name)
      `)
      .or(`mentor_employee_id.eq.${employeeId.value},mentee_employee_id.eq.${employeeId.value}`)
      .order('started_at', { ascending: false })

    mentorships.value = data || []
  } catch (err) {
    console.log('[Profile] Mentorships not available:', err)
  }
}

async function loadNotes() {
  try {
    const { data } = await supabase
      .from('employee_notes')
      .select(`
        id,
        note,
        visibility,
        created_at,
        author:employees!employee_notes_author_employee_id_fkey(id, first_name, last_name, preferred_name)
      `)
      .eq('employee_id', employeeId.value)
      .order('created_at', { ascending: false })

    notes.value = data || []
  } catch (err) {
    console.log('[Profile] Notes not available:', err)
  }
}

async function loadDocuments() {
  try {
    const { data } = await supabase
      .from('employee_documents')
      .select('*')
      .eq('employee_id', employeeId.value)
      .order('created_at', { ascending: false })

    documents.value = data || []
  } catch (err) {
    console.log('[Profile] Documents not available:', err)
  }
}

async function loadAssets() {
  try {
    const { data } = await supabase
      .from('employee_assets')
      .select('*')
      .eq('employee_id', employeeId.value)
      .order('checked_out_at', { ascending: false })

    assets.value = data || []
  } catch (err) {
    console.log('[Profile] Assets not available:', err)
  }
}

async function loadAuditLogs() {
  try {
    // Load audit logs related to this employee
    const { data } = await supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        entity_type,
        metadata,
        occurred_at,
        actor:profiles!audit_logs_actor_profile_id_fkey(id, email)
      `)
      .eq('entity_id', employeeId.value)
      .order('occurred_at', { ascending: false })
      .limit(50)

    auditLogs.value = data || []
  } catch (err) {
    console.log('[Profile] Audit logs not available:', err)
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
    
    // Invalidate shared cache for cross-page sync
    invalidateAppDataCache('employees')
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

async function saveNote() {
  if (!noteForm.value.note.trim()) return
  
  savingNote.value = true
  try {
    // Get current employee id as author
    const authorId = userStore.employee?.id
    
    const { error: err } = await supabase
      .from('employee_notes')
      .insert({
        employee_id: employeeId.value,
        author_employee_id: authorId,
        note: noteForm.value.note.trim(),
        visibility: noteForm.value.visibility
      })
    
    if (err) throw err
    
    await loadNotes()
    showNoteDialog.value = false
    noteForm.value = { note: '', visibility: 'private' }
    toast.success('Note added successfully')
  } catch (err: any) {
    console.error('Failed to save note:', err)
    toast.error('Failed to save note')
  } finally {
    savingNote.value = false
  }
}

async function saveAsset() {
  if (!assetForm.value.asset_name.trim()) return
  
  savingAsset.value = true
  try {
    const insertData = {
      employee_id: employeeId.value,
      asset_name: assetForm.value.asset_name.trim(),
      asset_type: assetForm.value.asset_type,
      serial_number: assetForm.value.serial_number || null,
      expected_return_date: assetForm.value.expected_return_date || null,
      notes: assetForm.value.notes || null
    }
    
    console.log('Inserting asset:', insertData)
    
    const { data, error: err } = await supabase
      .from('employee_assets')
      .insert(insertData)
      .select()
    
    if (err) {
      console.error('Asset insert error:', err)
      throw err
    }
    
    console.log('Asset inserted successfully:', data)
    
    await loadAssets()
    showAssetDialog.value = false
    assetForm.value = { asset_name: '', asset_type: 'Badge', serial_number: '', expected_return_date: null, notes: '' }
    toast.success('Asset assigned successfully')
  } catch (err: any) {
    console.error('Failed to save asset:', err)
    toast.error(err?.message || 'Failed to assign asset')
  } finally {
    savingAsset.value = false
  }
}

async function returnAsset(assetId: string) {
  try {
    const { error: err } = await supabase
      .from('employee_assets')
      .update({ returned_at: new Date().toISOString() })
      .eq('id', assetId)
    
    if (err) throw err
    
    await loadAssets()
    toast.success('Asset marked as returned')
  } catch (err: any) {
    console.error('Failed to return asset:', err)
    toast.error('Failed to return asset')
  }
}

async function uploadDocument() {
  // Handle v-file-input which returns an array in Vuetify 3
  const fileInput = documentForm.value.file
  const file = Array.isArray(fileInput) ? fileInput[0] : fileInput
  
  if (!file) {
    toast.error('Please select a file')
    return
  }
  
  savingDocument.value = true
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${employeeId.value}/${Date.now()}_${documentForm.value.category}.${fileExt}`
    
    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from('employee-docs')
      .upload(fileName, file)
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      throw uploadError
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('employee-docs')
      .getPublicUrl(fileName)
    
    // Get auth user ID for uploader_id (column references auth.users, not employees)
    const { data: { user } } = await supabase.auth.getUser()
    
    // Insert document record
    const { error: insertError } = await supabase
      .from('employee_documents')
      .insert({
        employee_id: employeeId.value,
        category: documentForm.value.category,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        file_size: file.size,
        description: documentForm.value.description || null,
        uploader_id: user?.id || null
      })
    
    if (insertError) {
      console.error('Database insert error:', insertError)
      throw insertError
    }
    
    await loadDocuments()
    showDocumentDialog.value = false
    documentForm.value = { category: 'general', description: '', file: null }
    toast.success('Document uploaded successfully')
  } catch (err: any) {
    console.error('Failed to upload document:', err)
    toast.error(err.message || 'Failed to upload document')
  } finally {
    savingDocument.value = false
  }
}

// Admin Request Review
async function submitAdminReviewRequest() {
  if (reviewRequest.topics.length === 0) {
    toast.error('Please select at least one topic')
    return
  }
  
  submittingReviewRequest.value = true
  try {
    const { error: insertError } = await supabase
      .from('review_requests')
      .insert({
        employee_id: employeeId.value,
        requested_by_employee_id: userStore.employee?.id,
        request_type: 'admin_initiated',
        topics: reviewRequest.topics,
        skill_categories: reviewRequest.skillCategories.length > 0 ? reviewRequest.skillCategories : null,
        notes: [reviewRequest.notes, reviewRequest.specificSkills ? `Specific skills: ${reviewRequest.specificSkills}` : ''].filter(Boolean).join('\n') || null,
        due_date: reviewRequest.dueDate || null,
        status: 'pending'
      })
    
    if (insertError) throw insertError
    
    // Reset form
    reviewRequest.topics = []
    reviewRequest.skillCategories = []
    reviewRequest.specificSkills = ''
    reviewRequest.notes = ''
    reviewRequest.dueDate = ''
    showRequestReviewDialog.value = false
    
    toast.success(`Review request sent to ${employee.value?.first_name}`)
  } catch (err: any) {
    console.error('Failed to submit review request:', err)
    toast.error('Failed to send review request')
  } finally {
    submittingReviewRequest.value = false
  }
}

// ==========================================
// PERSONAL INFO FUNCTIONS
// ==========================================
async function loadLookupData() {
  try {
    // Load departments, positions, locations, employees, and time off types in parallel
    const [deptResult, posResult, locResult, empResult, totResult] = await Promise.all([
      supabase.from('departments').select('id, name').order('name'),
      supabase.from('job_positions').select('id, title').order('title'),
      supabase.from('locations').select('id, name').order('name'),
      supabase.from('employees').select('id, first_name, last_name, preferred_name').eq('employment_status', 'active').order('first_name'),
      // Only load active PTO types (PTO, Unpaid Time Off, Other)
      supabase.from('time_off_types').select('id, name, code').eq('is_active', true).order('name')
    ])
    
    departments.value = deptResult.data || []
    positions.value = posResult.data || []
    locations.value = locResult.data || []
    allEmployees.value = empResult.data || []
    timeOffTypes.value = totResult.data || []
  } catch (err) {
    console.log('[Profile] Failed to load lookup data:', err)
  }
}

function openPersonalInfoDialog() {
  // Pre-populate form with current employee data
  const emp = employee.value
  if (!emp) return
  
  personalInfoForm.value = {
    first_name: emp.first_name || '',
    last_name: emp.last_name || '',
    preferred_name: emp.preferred_name || '',
    employee_number: emp.employee_number || '',
    date_of_birth: emp.date_of_birth || '',
    hire_date: emp.hire_date || '',
    email_work: emp.email_work || '',
    email_personal: emp.email_personal || '',
    phone_mobile: emp.phone_mobile || '',
    phone_work: emp.phone_work || '',
    address_street: emp.address_street || '',
    address_city: emp.address_city || '',
    address_state: emp.address_state || '',
    address_zip: emp.address_zip || '',
    emergency_contact_name: emp.emergency_contact_name || '',
    emergency_contact_phone: emp.emergency_contact_phone || '',
    emergency_contact_relationship: emp.emergency_contact_relationship || '',
    department_id: emp.department_id || null,
    position_id: emp.position_id || null,
    location_id: emp.location_id || null,
    employment_type: emp.employment_type || '',
    employment_status: emp.employment_status || '',
    manager_employee_id: emp.manager_employee_id || null,
    termination_date: emp.termination_date || '',
    profile_role: emp.profile?.role || 'user',
    profile_is_active: emp.profile?.is_active ?? true,
    notes_internal: emp.notes_internal || '',
    bio: emp.profile?.bio || ''
  }
  
  avatarFileInput.value = null
  avatarPreviewUrl.value = ''
  personalInfoTab.value = 'profile'
  showPersonalInfoDialog.value = true
}

function onAvatarFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // Validate type
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    toast.error('Please upload a PNG, JPG, or WebP image')
    input.value = ''
    return
  }

  // Validate size (2MB max)
  if (file.size > 2 * 1024 * 1024) {
    toast.error('Image must be less than 2MB')
    input.value = ''
    return
  }

  avatarFileInput.value = file
  avatarPreviewUrl.value = URL.createObjectURL(file)
}

async function savePersonalInfo() {
  savingPersonalInfo.value = true
  try {
    const form = personalInfoForm.value
    
    // Update employee record
    const employeeUpdate: Record<string, any> = {
      first_name: form.first_name,
      last_name: form.last_name,
      preferred_name: form.preferred_name || null,
      employee_number: form.employee_number || null,
      date_of_birth: form.date_of_birth || null,
      hire_date: form.hire_date || null,
      email_work: form.email_work || null,
      email_personal: form.email_personal || null,
      phone_mobile: form.phone_mobile || null,
      phone_work: form.phone_work || null,
      address_street: form.address_street || null,
      address_city: form.address_city || null,
      address_state: form.address_state || null,
      address_zip: form.address_zip || null,
      emergency_contact_name: form.emergency_contact_name || null,
      emergency_contact_phone: form.emergency_contact_phone || null,
      emergency_contact_relationship: form.emergency_contact_relationship || null,
      department_id: form.department_id || null,
      position_id: form.position_id || null,
      location_id: form.location_id || null,
      employment_type: form.employment_type || null,
      employment_status: form.employment_status || null,
      manager_employee_id: form.manager_employee_id || null,
      termination_date: form.termination_date || null,
      notes_internal: form.notes_internal || null
    }
    
    const { error: empErr } = await supabase
      .from('employees')
      .update(employeeUpdate)
      .eq('id', employeeId.value)
    
    if (empErr) throw empErr
    
    // Update profile if it exists
    if (employee.value?.profile?.id) {
      // Upload avatar if a new file was selected
      let newAvatarUrl = ''
      if (avatarFileInput.value) {
        const file = avatarFileInput.value
        const fileExt = file.name.split('.').pop()
        const filePath = `avatars/${employee.value.profile.id}-${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('company-assets')
          .upload(filePath, file, { upsert: true })

        if (uploadError) {
          console.error('Avatar upload error:', uploadError)
          toast.error('Failed to upload avatar, but other changes will be saved')
        } else {
          const { data: urlData } = supabase.storage
            .from('company-assets')
            .getPublicUrl(filePath)
          newAvatarUrl = urlData.publicUrl
        }
      }

      const profileUpdate: Record<string, any> = {
        role: form.profile_role,
        is_active: form.profile_is_active,
        bio: form.bio || null
      }

      if (newAvatarUrl) {
        profileUpdate.avatar_url = newAvatarUrl
      }
      
      const { error: profErr } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', employee.value.profile.id)
      
      if (profErr) throw profErr
    }
    
    // Reload employee data
    await loadEmployeeData()
    showPersonalInfoDialog.value = false
    toast.success('Personal information updated')
  } catch (err: any) {
    console.error('Failed to save personal info:', err)
    toast.error('Failed to save personal information')
  } finally {
    savingPersonalInfo.value = false
  }
}

// ==========================================
// PTO FUNCTIONS - Simplified to 3 types: PTO, Unpaid Time Off, Other
// ==========================================
function getPTOTypeIcon(typeName: string): string {
  const icons: Record<string, string> = {
    'PTO': 'mdi-beach',
    'Paid Time Off': 'mdi-beach',
    'Unpaid Time Off': 'mdi-cash-off',
    'UNPAID': 'mdi-cash-off',
    'Unpaid Leave': 'mdi-cash-off',
    'Other': 'mdi-calendar-question'
  }
  return icons[typeName] || 'mdi-calendar-clock'
}

function getPTOTypeColor(typeName: string): string {
  const colors: Record<string, string> = {
    'PTO': 'primary',
    'Paid Time Off': 'primary',
    'Unpaid Time Off': 'grey-darken-1',
    'UNPAID': 'grey-darken-1',
    'Unpaid Leave': 'grey-darken-1',
    'Other': 'secondary'
  }
  return colors[typeName] || 'primary'
}

function getPTOAvailable(balance: any): number {
  // Balance = Assigned - Used (auto-calculated)
  return (balance.assigned_hours || 0) - (balance.used_hours || 0)
}

function getEditablePTOBalance(index: number): number {
  // Balance from editable values for admin inline editing
  const editable = ptoEditableBalances.value[index]
  if (!editable) return 0
  return (editable.assigned_hours || 0) - (editable.used_hours || 0)
}

function getPTOAvailableClass(balance: any): string {
  const available = getPTOAvailable(balance)
  if (available <= 0) return 'text-error'
  if (available < 8) return 'text-warning'
  return 'text-success'
}

// Inline PTO Editing functions
function markPTOChanged(index: number) {
  ptoChangedIndexes.value.add(index)
}

async function saveAllPTOBalances() {
  if (!hasPTOChanges.value) return
  
  savingPTO.value = true
  try {
    // Update all changed PTO balances - both assigned_hours and used_hours (manual override)
    const updates = Array.from(ptoChangedIndexes.value).map(index => {
      const editable = ptoEditableBalances.value[index]
      return supabase
        .from('employee_time_off_balances')
        .update({
          assigned_hours: editable.assigned_hours,
          used_hours: editable.used_hours
        })
        .eq('id', editable.id)
    })
    
    const results = await Promise.all(updates)
    const errors = results.filter(r => r.error)
    
    if (errors.length > 0) {
      throw new Error(`${errors.length} update(s) failed`)
    }
    
    // Reload to get fresh data and reset change tracking
    await loadPTOBalances()
    toast.success('PTO balances updated')
  } catch (err: any) {
    console.error('Failed to save PTO balances:', err)
    toast.error('Failed to update PTO balances')
  } finally {
    savingPTO.value = false
  }
}

function openPTODialog(balance: any) {
  ptoEditForm.value = {
    id: balance.id,
    type_name: balance.time_off_type?.name || 'Unknown Type',
    accrued_hours: balance.accrued_hours || 0,
    carryover_hours: balance.carryover_hours || 0,
    used_hours: balance.used_hours || 0,
    pending_hours: balance.pending_hours || 0
  }
  showPTODialog.value = true
}

async function savePTOBalance() {
  savingPTO.value = true
  try {
    const { error: err } = await supabase
      .from('employee_time_off_balances')
      .update({
        accrued_hours: ptoEditForm.value.accrued_hours,
        carryover_hours: ptoEditForm.value.carryover_hours,
        used_hours: ptoEditForm.value.used_hours,
        pending_hours: ptoEditForm.value.pending_hours
      })
      .eq('id', ptoEditForm.value.id)
    
    if (err) throw err
    
    await loadPTOBalances()
    showPTODialog.value = false
    toast.success('PTO balance updated')
  } catch (err: any) {
    console.error('Failed to save PTO balance:', err)
    toast.error('Failed to update PTO balance')
  } finally {
    savingPTO.value = false
  }
}

async function addPTOType() {
  if (!addPTOForm.value.time_off_type_id) return
  
  addingPTOType.value = true
  try {
    const { error: err } = await supabase
      .from('employee_time_off_balances')
      .insert({
        employee_id: employeeId.value,
        time_off_type_id: addPTOForm.value.time_off_type_id,
        period_year: currentYear,
        assigned_hours: addPTOForm.value.assigned_hours,
        used_hours: 0
      })
    
    if (err) throw err
    
    await loadPTOBalances()
    showAddPTOTypeDialog.value = false
    addPTOForm.value = { time_off_type_id: null, assigned_hours: 0 }
    toast.success('PTO type added')
  } catch (err: any) {
    console.error('Failed to add PTO type:', err)
    toast.error('Failed to add PTO type')
  } finally {
    addingPTOType.value = false
  }
}

// ==========================================
// LIFECYCLE
// ==========================================
onMounted(() => {
  loadEmployeeData()
  loadLookupData()
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

/* Skill accordion styling */
.skill-accordion .v-expansion-panel {
  margin-bottom: 4px;
}

.skill-accordion .v-expansion-panel-title {
  min-height: 48px;
  padding: 8px 16px;
}

.skill-accordion .v-expansion-panel-text__wrapper {
  padding: 8px 16px 16px;
}
</style>
