<template>
  <div class="profile-command-center">
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

    <!-- Main Content - 3 Column Layout -->
    <v-row v-else-if="employee" class="h-100">
      <!-- COLUMN 1: Identity & Quick Actions (Sticky Sidebar) -->
      <v-col cols="12" md="3" class="identity-column">
        <div class="sticky-sidebar">
          <!-- Hero Card -->
          <v-card rounded="lg" class="hero-card mb-4" elevation="4">
            <div class="hero-header">
              <v-avatar size="100" class="avatar-hero mb-3">
                <v-img v-if="employee.avatar_url" :src="employee.avatar_url" cover />
                <span v-else class="text-h3 font-weight-bold bg-white text-primary" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
                  {{ getInitials(employee) }}
                </span>
              </v-avatar>
              
              <h1 class="text-h5 font-weight-bold text-white mb-1">
                {{ employee.first_name }} {{ employee.last_name }}
              </h1>
              <p class="text-body-2 text-white opacity-80">
                {{ employee.position?.title || 'Team Member' }}
              </p>
              
              <!-- Badges -->
              <div class="d-flex flex-wrap justify-center gap-1 mt-3">
                <v-chip v-if="employee.department?.name" size="small" variant="flat" color="white" class="text-primary">
                  <v-icon start size="14">mdi-hospital-building</v-icon>
                  {{ employee.department.name }}
                </v-chip>
                <v-chip v-if="employee.location?.name" size="small" variant="flat" color="white" class="text-primary">
                  <v-icon start size="14">mdi-map-marker</v-icon>
                  {{ employee.location.name }}
                </v-chip>
              </div>
            </div>

            <!-- Reliability Gauge -->
            <div v-if="canViewSensitiveData" class="reliability-gauge text-center py-4 px-4">
              <div class="text-overline text-grey mb-2">RELIABILITY SCORE</div>
              <v-progress-circular
                :model-value="reliabilityScore"
                :color="getReliabilityColor(reliabilityScore)"
                :size="80"
                :width="8"
              >
                <span class="text-h5 font-weight-bold">{{ reliabilityScore }}%</span>
              </v-progress-circular>
              <div class="text-caption text-grey mt-1">
                Based on {{ totalShifts }} shifts
              </div>
            </div>

            <!-- Skill Level Badge -->
            <div v-if="canViewSensitiveData" class="skill-level-badge text-center pb-4 px-4">
              <v-chip color="amber" variant="flat" size="large" class="px-4">
                <v-icon start>mdi-star</v-icon>
                Level {{ aggregateSkillLevel }} {{ employee.position?.title || 'Technician' }}
              </v-chip>
            </div>
          </v-card>

          <!-- Quick Links -->
          <v-card rounded="lg" class="mb-4">
            <v-card-text class="pa-2">
              <v-btn block variant="text" class="justify-start" :to="`/schedule?employee=${employee.id}`">
                <v-icon start>mdi-calendar</v-icon>
                My Schedule
              </v-btn>
              <v-btn block variant="text" class="justify-start" :to="`/people/my-skills?employee=${employee.id}`">
                <v-icon start>mdi-lightbulb</v-icon>
                My Skills
              </v-btn>
              <v-btn v-if="canViewSensitiveData" block variant="text" class="justify-start" disabled>
                <v-icon start>mdi-cash</v-icon>
                My Paystubs
                <v-chip size="x-small" variant="text" class="ml-auto">Coming Soon</v-chip>
              </v-btn>
              
              <!-- Admin: Delete Employee -->
              <v-divider v-if="isAdmin && !isOwnProfile" class="my-2" />
              <v-btn 
                v-if="isAdmin && !isOwnProfile" 
                block 
                variant="text" 
                color="error" 
                class="justify-start" 
                @click="showDeleteDialog = true"
              >
                <v-icon start>mdi-delete-forever</v-icon>
                Delete Employee
              </v-btn>
            </v-card-text>
          </v-card>

          <!-- Vitals: Contact Info -->
          <v-card rounded="lg" class="mb-4">
            <v-card-title class="text-subtitle-2 pb-1">
              <v-icon size="18" class="mr-1">mdi-card-account-details</v-icon>
              Contact Info
            </v-card-title>
            <v-list density="compact" class="pt-0">
              <v-list-item>
                <template #prepend>
                  <v-icon size="18" color="grey">mdi-email</v-icon>
                </template>
                <v-list-item-title class="text-body-2">{{ employee.email || 'Not set' }}</v-list-item-title>
              </v-list-item>
              <v-list-item>
                <template #prepend>
                  <v-icon size="18" color="grey">mdi-phone</v-icon>
                </template>
                <v-list-item-title class="text-body-2">{{ employee.phone_mobile || 'Not set' }}</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="canViewSensitiveData && employee.emergency_contact_name">
                <template #prepend>
                  <v-icon size="18" color="error">mdi-alert-circle</v-icon>
                </template>
                <v-list-item-title class="text-body-2">
                  {{ employee.emergency_contact_name }}
                  <div class="text-caption text-grey">{{ employee.emergency_contact_phone }}</div>
                </v-list-item-title>
              </v-list-item>
              <v-list-item>
                <template #prepend>
                  <v-icon size="18" color="grey">mdi-calendar</v-icon>
                </template>
                <v-list-item-title class="text-body-2">
                  Hired {{ formatDate(employee.hire_date) }}
                  <div class="text-caption text-grey">{{ tenure }}</div>
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card>

          <!-- Pay Info (Admin/Self Only) -->
          <v-card v-if="canViewSensitiveData" rounded="lg" class="mb-4">
            <v-card-title class="d-flex align-center text-subtitle-2 pb-1">
              <v-icon size="18" class="mr-1">mdi-cash</v-icon>
              Compensation
              <v-spacer />
              <v-btn v-if="isAdmin" icon="mdi-pencil" size="x-small" variant="text" @click="showPayDialog = true" />
            </v-card-title>
            <v-card-text class="pt-2">
              <div v-if="paySettings">
                <div class="d-flex justify-space-between mb-2">
                  <span class="text-caption text-grey">Type</span>
                  <span class="text-body-2 font-weight-medium">{{ paySettings.pay_type === 'hourly' ? 'Hourly' : 'Salary' }}</span>
                </div>
                <div class="d-flex justify-space-between mb-2">
                  <span class="text-caption text-grey">Rate</span>
                  <span class="text-body-2 font-weight-medium">
                    {{ paySettings.pay_type === 'hourly' 
                      ? `$${paySettings.hourly_rate?.toFixed(2)}/hr` 
                      : `$${paySettings.annual_salary?.toLocaleString()}/yr` 
                    }}
                  </span>
                </div>
              </div>
              <div v-else class="text-caption text-grey text-center py-2">
                No compensation data
              </div>
            </v-card-text>
          </v-card>

          <!-- PTO Balances (Admin/Self Only) -->
          <v-card v-if="canViewSensitiveData" rounded="lg">
            <v-card-title class="text-subtitle-2 pb-1">
              <v-icon size="18" class="mr-1">mdi-beach</v-icon>
              PTO Balances
            </v-card-title>
            <v-card-text class="pt-2">
              <div v-if="ptoBalances.length > 0">
                <div v-for="balance in ptoBalances" :key="balance.id" class="mb-3">
                  <div class="d-flex justify-space-between align-center mb-1">
                    <span class="text-body-2">{{ balance.type_name }}</span>
                    <span class="text-body-2 font-weight-bold">{{ balance.available_hours }}h</span>
                  </div>
                  <v-progress-linear
                    :model-value="(balance.used_hours / (balance.accrued_hours + balance.carryover_hours)) * 100"
                    :color="balance.available_hours < 8 ? 'warning' : 'success'"
                    height="6"
                    rounded
                  />
                  <div class="d-flex justify-space-between text-caption text-grey">
                    <span>Used: {{ balance.used_hours }}h</span>
                    <span>Accrued: {{ balance.accrued_hours }}h</span>
                  </div>
                </div>
              </div>
              <div v-else class="text-caption text-grey text-center py-2">
                No PTO data available
              </div>
            </v-card-text>
          </v-card>
        </div>
      </v-col>

      <!-- COLUMN 2: Timeline / Notes Feed (The "Pulse") -->
      <v-col v-if="canViewSensitiveData" cols="12" md="5" class="timeline-column">
        <v-card rounded="lg" class="h-100 d-flex flex-column">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2" color="primary">mdi-timeline-clock</v-icon>
            Timeline
            <v-spacer />
            <v-chip size="small" variant="tonal">{{ notes.length }} entries</v-chip>
          </v-card-title>

          <!-- Add Note Form (Admin Only) -->
          <div v-if="isAdmin" class="px-4 pb-3">
            <v-textarea
              v-model="newNote"
              placeholder="Add a note about this employee..."
              variant="outlined"
              rows="2"
              hide-details
              density="compact"
              class="mb-2"
            />
            <div class="d-flex gap-2">
              <v-select
                v-model="newNoteType"
                :items="noteTypes"
                density="compact"
                variant="outlined"
                hide-details
                style="max-width: 180px;"
              />
              <v-spacer />
              <v-btn 
                color="primary" 
                variant="flat" 
                size="small"
                :loading="postingNote"
                :disabled="!newNote.trim()"
                @click="postNote"
              >
                <v-icon start>mdi-send</v-icon>
                Post
              </v-btn>
            </div>
          </div>

          <v-divider />

          <!-- Notes Feed -->
          <div class="notes-feed flex-grow-1 overflow-y-auto pa-4">
            <div v-if="notes.length === 0" class="text-center py-8">
              <v-icon size="48" color="grey-lighten-2">mdi-text-box-outline</v-icon>
              <p class="text-body-2 text-grey mt-3">No notes yet</p>
              <p class="text-caption text-grey">Start documenting interactions</p>
            </div>

            <div v-else class="timeline-items">
              <div 
                v-for="note in notes" 
                :key="note.id" 
                class="timeline-item mb-4"
                :class="{ 'pinned': note.is_pinned }"
              >
                <div class="d-flex align-start gap-3">
                  <v-avatar size="32" :color="getNoteTypeColor(note.note_type)">
                    <v-icon size="16" color="white">{{ getNoteTypeIcon(note.note_type) }}</v-icon>
                  </v-avatar>
                  <div class="flex-grow-1">
                    <div class="d-flex align-center mb-1">
                      <span class="text-body-2 font-weight-medium">
                        {{ note.author_name || 'System' }}
                      </span>
                      <v-chip 
                        size="x-small" 
                        variant="tonal" 
                        :color="getNoteTypeColor(note.note_type)"
                        class="ml-2"
                      >
                        {{ note.note_type }}
                      </v-chip>
                      <v-icon v-if="note.is_pinned" size="14" color="warning" class="ml-1">mdi-pin</v-icon>
                      <v-spacer />
                      <span class="text-caption text-grey">
                        {{ formatTimestamp(note.created_at) }}
                      </span>
                    </div>
                    <p class="text-body-2 mb-0 note-content">{{ note.note }}</p>
                    
                    <!-- Admin actions on notes -->
                    <div v-if="isAdmin" class="note-actions mt-1">
                      <v-btn 
                        icon="mdi-pin" 
                        size="x-small" 
                        variant="text"
                        :color="note.is_pinned ? 'warning' : 'grey'"
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
          </div>
        </v-card>
      </v-col>

      <!-- COLUMN 3: The Vault (Compliance & Docs) -->
      <v-col v-if="canViewSensitiveData" cols="12" md="4" class="vault-column">
        <!-- Documents Section -->
        <v-card rounded="lg" class="mb-4">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2" color="primary">mdi-folder-account</v-icon>
            Documents
            <v-spacer />
            <v-btn 
              v-if="canUploadDocs"
              size="small" 
              variant="tonal" 
              color="primary"
              @click="showUploadDialog = true"
            >
              <v-icon start>mdi-upload</v-icon>
              Upload
            </v-btn>
          </v-card-title>

          <!-- Drop Zone -->
          <div 
            v-if="canUploadDocs"
            class="drop-zone mx-4 mb-3 pa-4 text-center"
            :class="{ 'drag-over': isDraggingFile }"
            @drop.prevent="handleFileDrop"
            @dragover.prevent="isDraggingFile = true"
            @dragleave="isDraggingFile = false"
          >
            <v-icon size="32" color="grey">mdi-cloud-upload</v-icon>
            <p class="text-caption text-grey mb-0">Drag & drop files here</p>
          </div>

          <v-divider />

          <!-- Document List -->
          <v-list v-if="documents.length > 0" density="compact" class="pt-0">
            <v-list-item v-for="doc in documents" :key="doc.id">
              <template #prepend>
                <v-icon :color="getDocTypeColor(doc.category)">{{ getDocTypeIcon(doc.file_type) }}</v-icon>
              </template>
              <v-list-item-title class="text-body-2">{{ doc.file_name }}</v-list-item-title>
              <v-list-item-subtitle class="text-caption">
                <v-chip size="x-small" variant="tonal">{{ doc.category }}</v-chip>
                • {{ formatDate(doc.created_at) }}
              </v-list-item-subtitle>
              <template #append>
                <v-btn icon="mdi-download" size="x-small" variant="text" :href="doc.file_url" target="_blank" />
                <v-btn v-if="isAdmin" icon="mdi-delete" size="x-small" variant="text" color="error" @click="deleteDocument(doc)" />
              </template>
            </v-list-item>
          </v-list>
          <v-card-text v-else class="text-center py-6">
            <v-icon size="40" color="grey-lighten-2">mdi-file-document-outline</v-icon>
            <p class="text-caption text-grey mt-2">No documents uploaded</p>
          </v-card-text>
        </v-card>

        <!-- Licenses Section -->
        <v-card rounded="lg" class="mb-4">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2" color="primary">mdi-certificate</v-icon>
            Professional Licenses
            <v-spacer />
            <v-btn v-if="isAdmin" icon="mdi-plus" size="small" variant="text" @click="showLicenseDialog = true" />
          </v-card-title>

          <v-list v-if="licenses.length > 0" density="compact">
            <v-list-item v-for="license in licenses" :key="license.id">
              <template #prepend>
                <v-icon :color="getLicenseStatusColor(license)">mdi-card-account-details</v-icon>
              </template>
              <v-list-item-title class="text-body-2">
                {{ license.license_type }} #{{ license.license_number }}
              </v-list-item-title>
              <v-list-item-subtitle class="text-caption">
                {{ license.issuing_authority }}
                <span :class="getLicenseExpiryClass(license)">
                  • Expires {{ formatDate(license.expiration_date) }}
                </span>
              </v-list-item-subtitle>
              <template #append>
                <v-chip 
                  v-if="daysUntilExpiry(license) <= 30" 
                  size="x-small" 
                  color="error" 
                  variant="flat"
                >
                  {{ daysUntilExpiry(license) }} days
                </v-chip>
                <v-icon v-else-if="license.is_verified" size="18" color="success">mdi-check-circle</v-icon>
              </template>
            </v-list-item>
          </v-list>
          <v-card-text v-else class="text-center py-4">
            <p class="text-caption text-grey mb-0">No licenses on file</p>
          </v-card-text>
        </v-card>

        <!-- CE Credits Section -->
        <v-card rounded="lg">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2" color="primary">mdi-school</v-icon>
            CE Credits ({{ currentYear }})
            <v-spacer />
            <v-btn v-if="isAdmin" icon="mdi-plus" size="small" variant="text" @click="showCEDialog = true" />
          </v-card-title>

          <v-card-text v-if="ceCredits">
            <!-- Budget Overview -->
            <div class="ce-budget mb-4">
              <div class="d-flex justify-space-between mb-1">
                <span class="text-body-2">Budget Used</span>
                <span class="text-body-2 font-weight-bold">
                  ${{ ceSpent.toFixed(2) }} / ${{ ceCredits.budget_amount.toFixed(2) }}
                </span>
              </div>
              <v-progress-linear
                :model-value="(ceSpent / ceCredits.budget_amount) * 100"
                :color="ceRemaining < 100 ? 'warning' : 'success'"
                height="10"
                rounded
              />
              <div class="d-flex justify-space-between text-caption text-grey mt-1">
                <span>Spent: ${{ ceSpent.toFixed(2) }}</span>
                <span :class="ceRemaining < 100 ? 'text-warning' : 'text-success'">
                  Remaining: ${{ ceRemaining.toFixed(2) }}
                </span>
              </div>
            </div>

            <!-- CE Transactions -->
            <div v-if="ceTransactions.length > 0" class="ce-transactions">
              <div class="text-overline text-grey mb-2">SPEND HISTORY</div>
              <div v-for="tx in ceTransactions" :key="tx.id" class="ce-tx mb-2 pa-2 bg-grey-lighten-4 rounded">
                <div class="d-flex justify-space-between">
                  <span class="text-body-2">{{ tx.description }}</span>
                  <span class="text-body-2 font-weight-medium text-error">-${{ tx.amount.toFixed(2) }}</span>
                </div>
                <div class="text-caption text-grey">
                  {{ tx.category }} • {{ formatDate(tx.transaction_date) }}
                </div>
              </div>
            </div>
            <div v-else class="text-center py-2">
              <p class="text-caption text-grey mb-0">No CE spending recorded</p>
            </div>
          </v-card-text>
          <v-card-text v-else class="text-center py-4">
            <p class="text-caption text-grey mb-0">No CE budget set for {{ currentYear }}</p>
            <v-btn v-if="isAdmin" variant="text" size="small" color="primary" @click="showCEDialog = true">
              Set Budget
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Peer View: Limited Column -->
      <v-col v-if="!canViewSensitiveData" cols="12" md="9">
        <v-card rounded="lg" class="text-center py-12">
          <v-icon size="64" color="grey-lighten-2">mdi-lock</v-icon>
          <h3 class="text-h6 text-grey mt-4">Limited Access</h3>
          <p class="text-body-2 text-grey">
            You can only view basic contact information for this team member.
          </p>
        </v-card>
      </v-col>
    </v-row>

    <!-- Edit Pay Dialog -->
    <v-dialog v-model="showPayDialog" max-width="400">
      <v-card>
        <v-card-title>Edit Compensation</v-card-title>
        <v-card-text>
          <v-select
            v-model="payForm.pay_type"
            :items="['hourly', 'salary']"
            label="Pay Type"
            variant="outlined"
            class="mb-3"
          />
          <v-text-field
            v-if="payForm.pay_type === 'hourly'"
            v-model.number="payForm.hourly_rate"
            label="Hourly Rate ($)"
            type="number"
            step="0.01"
            variant="outlined"
          />
          <v-text-field
            v-else
            v-model.number="payForm.annual_salary"
            label="Annual Salary ($)"
            type="number"
            variant="outlined"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showPayDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="savingPay" @click="savePaySettings">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Upload Document Dialog -->
    <v-dialog v-model="showUploadDialog" max-width="500">
      <v-card>
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

    <!-- Add License Dialog -->
    <v-dialog v-model="showLicenseDialog" max-width="500">
      <v-card>
        <v-card-title>Add License</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="licenseForm.license_type"
            label="License Type (e.g., RVT, DVM)"
            variant="outlined"
            class="mb-3"
          />
          <v-text-field
            v-model="licenseForm.license_number"
            label="License Number"
            variant="outlined"
            class="mb-3"
          />
          <v-text-field
            v-model="licenseForm.issuing_authority"
            label="Issuing Authority"
            variant="outlined"
            class="mb-3"
          />
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="licenseForm.issue_date"
                label="Issue Date"
                type="date"
                variant="outlined"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="licenseForm.expiration_date"
                label="Expiration Date"
                type="date"
                variant="outlined"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showLicenseDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="savingLicense" @click="saveLicense">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add CE Credit Dialog -->
    <v-dialog v-model="showCEDialog" max-width="500">
      <v-card>
        <v-card-title>{{ ceCredits ? 'Add CE Spend' : 'Set CE Budget' }}</v-card-title>
        <v-card-text>
          <template v-if="!ceCredits">
            <v-text-field
              v-model.number="ceForm.budget_amount"
              label="Annual CE Budget ($)"
              type="number"
              variant="outlined"
              class="mb-3"
            />
          </template>
          <template v-else>
            <v-text-field
              v-model.number="ceForm.amount"
              label="Amount Spent ($)"
              type="number"
              step="0.01"
              variant="outlined"
              class="mb-3"
            />
            <v-text-field
              v-model="ceForm.description"
              label="What was it spent on?"
              variant="outlined"
              class="mb-3"
            />
            <v-select
              v-model="ceForm.category"
              :items="['course', 'conference', 'certification', 'materials', 'travel', 'other']"
              label="Category"
              variant="outlined"
            />
          </template>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showCEDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="savingCE" @click="saveCEData">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Employee Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="d-flex align-center text-error">
          <v-icon start color="error">mdi-alert-circle</v-icon>
          Delete Employee
        </v-card-title>
        <v-card-text>
          <v-alert type="warning" variant="tonal" class="mb-4">
            <strong>This action cannot be undone!</strong>
          </v-alert>
          <p class="mb-3">
            You are about to permanently delete <strong>{{ employee?.first_name }} {{ employee?.last_name }}</strong> 
            and ALL associated data including:
          </p>
          <ul class="text-body-2 mb-4">
            <li>Employee profile and personal information</li>
            <li>Skills and certifications</li>
            <li>Pay settings and PTO balances</li>
            <li>Documents and notes</li>
            <li>Schedule assignments</li>
            <li>Time-off requests</li>
            <li>All historical records</li>
          </ul>
          <v-text-field
            v-model="deleteConfirmText"
            :label="`Type '${employee?.first_name} ${employee?.last_name}' to confirm`"
            variant="outlined"
            color="error"
            class="mb-2"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeDeleteDialog">Cancel</v-btn>
          <v-btn 
            color="error" 
            variant="flat"
            :loading="deleting" 
            :disabled="deleteConfirmText !== `${employee?.first_name} ${employee?.last_name}`"
            @click="deleteEmployee"
          >
            <v-icon start>mdi-delete-forever</v-icon>
            Permanently Delete
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

const employeeId = computed(() => route.params.id as string)
const currentYear = new Date().getFullYear()

// State
const isLoading = ref(true)
const error = ref('')
const employee = ref<any>(null)
const paySettings = ref<any>(null)
const ptoBalances = ref<any[]>([])
const notes = ref<any[]>([])
const documents = ref<any[]>([])
const licenses = ref<any[]>([])
const ceCredits = ref<any>(null)
const ceTransactions = ref<any[]>([])
const reliabilityScore = ref(0)
const totalShifts = ref(0)
const aggregateSkillLevel = ref(1)

// Dialogs
const showPayDialog = ref(false)
const showUploadDialog = ref(false)
const showLicenseDialog = ref(false)
const showCEDialog = ref(false)
const showDeleteDialog = ref(false)
const deleteConfirmText = ref('')
const deleting = ref(false)

// Form states
const newNote = ref('')
const newNoteType = ref('general')
const postingNote = ref(false)
const savingPay = ref(false)
const savingLicense = ref(false)
const savingCE = ref(false)
const uploading = ref(false)
const isDraggingFile = ref(false)

const noteTypes = [
  { title: 'General', value: 'general' },
  { title: 'Performance', value: 'performance' },
  { title: 'Disciplinary', value: 'disciplinary' },
  { title: 'Recognition', value: 'recognition' },
  { title: 'Goal', value: 'goal' }
]

const documentCategories = [
  { title: 'General', value: 'general' },
  { title: 'Offer Letter', value: 'offer_letter' },
  { title: 'Contract', value: 'contract' },
  { title: 'Performance Review', value: 'performance_review' },
  { title: 'Certification', value: 'certification' },
  { title: 'License', value: 'license' },
  { title: 'Training', value: 'training' },
  { title: 'Disciplinary', value: 'disciplinary' }
]

// Upload form
const uploadFile = ref<File | null>(null)
const uploadCategory = ref('general')
const uploadDescription = ref('')

// Pay form
const payForm = ref({
  pay_type: 'hourly',
  hourly_rate: 0,
  annual_salary: 0
})

// License form
const licenseForm = ref({
  license_type: '',
  license_number: '',
  issuing_authority: '',
  issue_date: '',
  expiration_date: ''
})

// CE form
const ceForm = ref({
  budget_amount: 0,
  amount: 0,
  description: '',
  category: 'course'
})

// Computed
const isAdmin = computed(() => authStore.isAdmin)
const isOwnProfile = computed(() => {
  const currentEmployeeId = userStore.employee?.id
  return currentEmployeeId === employeeId.value
})

// Access Control Logic
const canViewSensitiveData = computed(() => {
  // Admins can see everything
  if (isAdmin.value) return true
  // Users can see their own profile
  if (isOwnProfile.value) return true
  // Peers cannot see sensitive data
  return false
})

const canUploadDocs = computed(() => {
  // Admins can always upload
  if (isAdmin.value) return true
  // Users can upload to their own profile
  if (isOwnProfile.value) return true
  return false
})

const ceSpent = computed(() => {
  return ceTransactions.value.reduce((sum, tx) => sum + tx.amount, 0)
})

const ceRemaining = computed(() => {
  if (!ceCredits.value) return 0
  return ceCredits.value.budget_amount - ceSpent.value
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

// Methods
function getInitials(emp: any): string {
  return `${emp.first_name?.charAt(0) || ''}${emp.last_name?.charAt(0) || ''}`.toUpperCase()
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A'
  return format(new Date(dateStr), 'MMM d, yyyy')
}

function formatTimestamp(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
}

function getReliabilityColor(score: number): string {
  if (score >= 90) return 'success'
  if (score >= 75) return 'warning'
  return 'error'
}

function getNoteTypeColor(type: string): string {
  const colors: Record<string, string> = {
    general: 'primary',
    performance: 'info',
    disciplinary: 'error',
    recognition: 'success',
    goal: 'warning',
    system: 'grey'
  }
  return colors[type] || 'grey'
}

function getNoteTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    general: 'mdi-note-text',
    performance: 'mdi-chart-line',
    disciplinary: 'mdi-alert',
    recognition: 'mdi-trophy',
    goal: 'mdi-target',
    system: 'mdi-cog'
  }
  return icons[type] || 'mdi-note'
}

function getDocTypeIcon(fileType: string | null): string {
  if (!fileType) return 'mdi-file'
  if (fileType.includes('pdf')) return 'mdi-file-pdf-box'
  if (fileType.includes('image') || ['png', 'jpg', 'jpeg'].includes(fileType)) return 'mdi-file-image'
  if (fileType.includes('word') || fileType === 'docx') return 'mdi-file-word'
  return 'mdi-file-document'
}

function getDocTypeColor(category: string): string {
  const colors: Record<string, string> = {
    license: 'warning',
    certification: 'success',
    disciplinary: 'error',
    offer_letter: 'primary',
    contract: 'info'
  }
  return colors[category] || 'grey'
}

function getLicenseStatusColor(license: any): string {
  const days = daysUntilExpiry(license)
  if (days < 0) return 'error'
  if (days <= 30) return 'warning'
  return 'success'
}

function getLicenseExpiryClass(license: any): string {
  const days = daysUntilExpiry(license)
  if (days < 0) return 'text-error font-weight-bold'
  if (days <= 30) return 'text-warning font-weight-bold'
  return ''
}

function daysUntilExpiry(license: any): number {
  if (!license.expiration_date) return 999
  return differenceInDays(new Date(license.expiration_date), new Date())
}

// Data Loading
async function loadEmployeeData() {
  isLoading.value = true
  error.value = ''

  try {
    // Load employee basic info
    // Note: bio column may not exist yet - query will still work, just won't include it
    const { data: emp, error: empError } = await supabase
      .from('employees')
      .select(`
        *,
        profile:profiles!employees_profile_id_fkey(email, avatar_url),
        department:departments(id, name),
        position:job_positions(id, title),
        location:locations(id, name)
      `)
      .eq('id', employeeId.value)
      .single()

    if (empError) throw empError
    if (!emp) throw new Error('Employee not found')

    employee.value = {
      ...emp,
      email: emp.profile?.email || emp.email_work,
      avatar_url: emp.profile?.avatar_url
    }

    // Load additional data only if user can view sensitive info
    if (canViewSensitiveData.value) {
      await Promise.all([
        loadPaySettings(),
        loadPTOBalances(),
        loadNotes(),
        loadDocuments(),
        loadLicenses(),
        loadCECredits(),
        loadReliabilityScore(),
        loadSkillLevel()
      ])
    }
  } catch (err: any) {
    console.error('Error loading employee:', err)
    error.value = err.message || 'Failed to load employee'
  } finally {
    isLoading.value = false
  }
}

async function loadPaySettings() {
  try {
    const { data } = await supabase
      .from('employee_pay_settings')
      .select('*')
      .eq('employee_id', employeeId.value)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single()
    
    paySettings.value = data
    if (data) {
      payForm.value = {
        pay_type: data.pay_type || 'hourly',
        hourly_rate: data.hourly_rate || 0,
        annual_salary: data.annual_salary || 0
      }
    }
  } catch (err) {
    console.log('[Profile] Pay settings not available:', err)
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
      .eq('period_year', currentYear)

    ptoBalances.value = (data || []).map(b => ({
      ...b,
      type_name: b.time_off_type?.name || 'Unknown',
      available_hours: (b.accrued_hours + b.carryover_hours) - b.used_hours - b.pending_hours
    }))
  } catch (err) {
    console.log('[Profile] PTO balances not available:', err)
  }
}

async function loadNotes() {
  try {
    const { data } = await supabase
      .from('employee_notes')
      .select(`
        *,
        author:employees!employee_notes_author_employee_id_fkey(first_name, last_name)
      `)
      .eq('employee_id', employeeId.value)
      .order('created_at', { ascending: false })

    notes.value = (data || []).map(n => ({
      ...n,
      author_name: n.author ? `${n.author.first_name} ${n.author.last_name}` : null
    }))
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

async function loadCECredits() {
  try {
    const { data: credits } = await supabase
      .from('employee_ce_credits')
      .select('*')
      .eq('employee_id', employeeId.value)
      .eq('period_year', currentYear)
      .single()

    ceCredits.value = credits

    if (credits) {
      const { data: transactions } = await supabase
        .from('employee_ce_transactions')
        .select('*')
        .eq('ce_credit_id', credits.id)
        .order('transaction_date', { ascending: false })

      ceTransactions.value = transactions || []
    }
  } catch (err) {
    console.log('[Profile] CE credits not available:', err)
  }
}

async function loadReliabilityScore() {
  try {
    // Calculate from time_punches and shifts
    const { data: shifts } = await supabase
      .from('shifts')
      .select('id, start_at')
      .eq('employee_id', employeeId.value)
      .eq('status', 'completed')
      .lte('start_at', new Date().toISOString())

    const { data: punches } = await supabase
      .from('time_punches')
      .select('id, punch_in, shift_id')
      .eq('employee_id', employeeId.value)
      .not('punch_in', 'is', null)

    totalShifts.value = shifts?.length || 0
    
    if (totalShifts.value === 0) {
      reliabilityScore.value = 100
      return
    }

    // Count on-time arrivals (punched in within 5 min of shift start)
    let onTimeCount = 0
    shifts?.forEach(shift => {
      const punch = punches?.find(p => p.shift_id === shift.id)
      if (punch) {
        const shiftStart = new Date(shift.start_at)
        const punchIn = new Date(punch.punch_in)
        const diffMinutes = (punchIn.getTime() - shiftStart.getTime()) / 60000
        if (diffMinutes <= 5) onTimeCount++
      }
    })

    reliabilityScore.value = Math.round((onTimeCount / totalShifts.value) * 100)
  } catch (err) {
    console.log('[Profile] Reliability score not available:', err)
    reliabilityScore.value = 100
  }
}

async function loadSkillLevel() {
  try {
    const { data } = await supabase
      .from('employee_skills')
      .select('level')
      .eq('employee_id', employeeId.value)

    if (data && data.length > 0) {
      const totalPoints = data.reduce((sum, s) => sum + (s.level || 0), 0)
      aggregateSkillLevel.value = Math.max(1, Math.floor(totalPoints / 5) + 1)
    }
  } catch (err) {
    console.log('[Profile] Skill level not available:', err)
  }
}

// Actions
async function postNote() {
  if (!newNote.value.trim()) return
  
  postingNote.value = true
  try {
    const authorId = userStore.employee?.id
    
    const { error: err } = await supabase
      .from('employee_notes')
      .insert({
        employee_id: employeeId.value,
        author_employee_id: authorId,
        note_type: newNoteType.value,
        note: newNote.value.trim(),
        visibility: 'admin'
      })

    if (err) throw err
    
    newNote.value = ''
    newNoteType.value = 'general'
    await loadNotes()
    toast.success('Note added')
  } catch (err: any) {
    toast.error('Failed to add note')
  } finally {
    postingNote.value = false
  }
}

async function togglePinNote(note: any) {
  try {
    const { error: err } = await supabase
      .from('employee_notes')
      .update({ is_pinned: !note.is_pinned })
      .eq('id', note.id)

    if (err) throw err
    note.is_pinned = !note.is_pinned
  } catch (err) {
    toast.error('Failed to update note')
  }
}

async function deleteNote(note: any) {
  if (!confirm('Delete this note?')) return
  
  try {
    const { error: err } = await supabase
      .from('employee_notes')
      .delete()
      .eq('id', note.id)

    if (err) throw err
    notes.value = notes.value.filter(n => n.id !== note.id)
    toast.success('Note deleted')
  } catch (err) {
    toast.error('Failed to delete note')
  }
}

async function savePaySettings() {
  savingPay.value = true
  try {
    const payData = {
      employee_id: employeeId.value,
      pay_type: payForm.value.pay_type,
      hourly_rate: payForm.value.pay_type === 'hourly' ? payForm.value.hourly_rate : null,
      annual_salary: payForm.value.pay_type === 'salary' ? payForm.value.annual_salary : null,
      effective_from: new Date().toISOString().split('T')[0]
    }

    if (paySettings.value) {
      const { error: err } = await supabase
        .from('employee_pay_settings')
        .update(payData)
        .eq('id', paySettings.value.id)
      if (err) throw err
    } else {
      const { error: err } = await supabase
        .from('employee_pay_settings')
        .insert(payData)
      if (err) throw err
    }

    await loadPaySettings()
    showPayDialog.value = false
    toast.success('Compensation updated')
  } catch (err) {
    toast.error('Failed to update compensation')
  } finally {
    savingPay.value = false
  }
}

async function handleFileDrop(event: DragEvent) {
  isDraggingFile.value = false
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    uploadFile.value = files[0]
    showUploadDialog.value = true
  }
}

async function uploadDocument() {
  if (!uploadFile.value) return
  
  uploading.value = true
  try {
    // Upload to Supabase Storage
    const fileName = `${employeeId.value}/${Date.now()}_${uploadFile.value.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('employee-docs')
      .upload(fileName, uploadFile.value)

    if (uploadError) throw uploadError

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('employee-docs')
      .getPublicUrl(fileName)

    // Save document record
    const { error: docError } = await supabase
      .from('employee_documents')
      .insert({
        employee_id: employeeId.value,
        uploader_id: authStore.user?.id,
        file_name: uploadFile.value.name,
        file_url: urlData.publicUrl,
        file_type: uploadFile.value.type,
        file_size: uploadFile.value.size,
        category: uploadCategory.value,
        description: uploadDescription.value || null
      })

    if (docError) throw docError

    await loadDocuments()
    showUploadDialog.value = false
    uploadFile.value = null
    uploadCategory.value = 'general'
    uploadDescription.value = ''
    toast.success('Document uploaded')
  } catch (err: any) {
    console.error('Upload error:', err)
    toast.error('Failed to upload document')
  } finally {
    uploading.value = false
  }
}

async function deleteDocument(doc: any) {
  if (!confirm('Delete this document?')) return
  
  try {
    const { error: err } = await supabase
      .from('employee_documents')
      .delete()
      .eq('id', doc.id)

    if (err) throw err
    documents.value = documents.value.filter(d => d.id !== doc.id)
    toast.success('Document deleted')
  } catch (err) {
    toast.error('Failed to delete document')
  }
}

async function saveLicense() {
  savingLicense.value = true
  try {
    const { error: err } = await supabase
      .from('employee_licenses')
      .insert({
        employee_id: employeeId.value,
        ...licenseForm.value
      })

    if (err) throw err
    
    await loadLicenses()
    showLicenseDialog.value = false
    licenseForm.value = {
      license_type: '',
      license_number: '',
      issuing_authority: '',
      issue_date: '',
      expiration_date: ''
    }
    toast.success('License added')
  } catch (err) {
    toast.error('Failed to add license')
  } finally {
    savingLicense.value = false
  }
}

async function saveCEData() {
  savingCE.value = true
  try {
    if (!ceCredits.value) {
      // Create new CE budget
      const { error: err } = await supabase
        .from('employee_ce_credits')
        .insert({
          employee_id: employeeId.value,
          period_year: currentYear,
          budget_amount: ceForm.value.budget_amount
        })
      if (err) throw err
    } else {
      // Add CE transaction
      const { error: err } = await supabase
        .from('employee_ce_transactions')
        .insert({
          ce_credit_id: ceCredits.value.id,
          amount: ceForm.value.amount,
          description: ceForm.value.description,
          category: ceForm.value.category,
          transaction_date: new Date().toISOString().split('T')[0]
        })
      if (err) throw err
    }

    await loadCECredits()
    showCEDialog.value = false
    ceForm.value = {
      budget_amount: 0,
      amount: 0,
      description: '',
      category: 'course'
    }
    toast.success('CE data saved')
  } catch (err) {
    toast.error('Failed to save CE data')
  } finally {
    savingCE.value = false
  }
}

// Delete Employee Functions
function closeDeleteDialog() {
  showDeleteDialog.value = false
  deleteConfirmText.value = ''
}

async function deleteEmployee() {
  if (!employee.value || !isAdmin.value) return
  
  const fullName = `${employee.value.first_name} ${employee.value.last_name}`
  if (deleteConfirmText.value !== fullName) {
    toast.error('Please type the employee name correctly to confirm')
    return
  }
  
  deleting.value = true
  try {
    const empId = employee.value.id
    
    // Delete in order to respect foreign key constraints
    // 1. Delete employee_skills
    await supabase.from('employee_skills').delete().eq('employee_id', empId)
    
    // 2. Delete employee_documents
    await supabase.from('employee_documents').delete().eq('employee_id', empId)
    
    // 3. Delete employee_notes
    await supabase.from('employee_notes').delete().eq('employee_id', empId)
    
    // 4. Delete employee_licenses
    await supabase.from('employee_licenses').delete().eq('employee_id', empId)
    
    // 5. Delete employee_ce_credits
    await supabase.from('employee_ce_credits').delete().eq('employee_id', empId)
    
    // 6. Delete employee_ce_transactions
    await supabase.from('employee_ce_transactions').delete().eq('employee_id', empId)
    
    // 7. Delete employee_pay_settings
    await supabase.from('employee_pay_settings').delete().eq('employee_id', empId)
    
    // 8. Delete pto_balances
    await supabase.from('pto_balances').delete().eq('employee_id', empId)
    
    // 9. Delete time_off_requests
    await supabase.from('time_off_requests').delete().eq('employee_id', empId)
    
    // 10. Delete shift_assignments
    await supabase.from('shift_assignments').delete().eq('employee_id', empId)
    
    // 11. Delete employee_locations
    await supabase.from('employee_locations').delete().eq('employee_id', empId)
    
    // 12. Delete training_enrollments
    await supabase.from('training_enrollments').delete().eq('employee_id', empId)
    
    // 13. Nullify manager references on other employees
    await supabase.from('employees').update({ manager_employee_id: null }).eq('manager_employee_id', empId)
    
    // 14. Finally, delete the employee record
    const { error: deleteError } = await supabase
      .from('employees')
      .delete()
      .eq('id', empId)
    
    if (deleteError) throw deleteError
    
    toast.success(`${fullName} has been permanently deleted`)
    closeDeleteDialog()
    
    // Navigate back to roster
    router.push('/roster')
  } catch (err: any) {
    console.error('Delete employee error:', err)
    toast.error(err.message || 'Failed to delete employee')
  } finally {
    deleting.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadEmployeeData()
})

watch(employeeId, () => {
  loadEmployeeData()
})
</script>

<style scoped>
.profile-command-center {
  min-height: calc(100vh - 64px);
  background: #f5f5f5;
  padding: 16px;
}

.identity-column {
  position: relative;
}

.sticky-sidebar {
  position: sticky;
  top: 80px;
}

.hero-card {
  overflow: hidden;
}

.hero-header {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgb(var(--v-theme-primary-darken-1)) 100%);
  padding: 24px;
  text-align: center;
}

.avatar-hero {
  border: 4px solid white;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.reliability-gauge {
  border-bottom: 1px solid #eee;
}

.timeline-column .v-card {
  max-height: calc(100vh - 100px);
}

.notes-feed {
  max-height: 600px;
}

.timeline-item {
  border-left: 3px solid #e0e0e0;
  padding-left: 16px;
  margin-left: 16px;
}

.timeline-item.pinned {
  border-left-color: #ffc107;
  background: #fffde7;
  margin: -8px -16px 8px -16px;
  padding: 8px 16px 8px 32px;
  border-radius: 4px;
}

.note-content {
  white-space: pre-wrap;
  word-break: break-word;
}

.note-actions {
  opacity: 0;
  transition: opacity 0.2s;
}

.timeline-item:hover .note-actions {
  opacity: 1;
}

.drop-zone {
  border: 2px dashed #ccc;
  border-radius: 8px;
  transition: all 0.2s;
}

.drop-zone.drag-over {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.05);
}

.ce-budget {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 8px;
}

/* Responsive */
@media (max-width: 960px) {
  .sticky-sidebar {
    position: static;
  }
  
  .timeline-column .v-card {
    max-height: none;
  }
}
</style>
