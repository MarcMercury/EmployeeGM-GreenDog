<template>
  <div class="global-settings-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Global Settings</h1>
        <p class="text-body-1 text-grey-darken-1">
          Manage application-wide settings and configurations
        </p>
      </div>
      <v-chip color="warning" variant="flat">
        <v-icon start>mdi-shield-crown</v-icon>
        Admin Only
      </v-chip>
    </div>

    <!-- Settings Tabs -->
    <v-tabs v-model="activeTab" color="primary" class="mb-6">
      <v-tab value="company">Company</v-tab>
      <v-tab value="departments">Departments</v-tab>
      <v-tab value="positions">Positions</v-tab>
      <v-tab value="locations">Locations</v-tab>
      <v-tab value="roles">Roles</v-tab>
      <v-tab value="emails">Email Templates</v-tab>
      <v-tab value="integrations">Integrations</v-tab>
      <v-tab value="database">Database</v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <!-- Company Settings -->
      <v-window-item value="company">
        <v-row>
          <v-col cols="12" md="8">
            <v-card rounded="lg">
              <v-card-title>Company Information</v-card-title>
              <v-card-text>
                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="company.name"
                      label="Company Name"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="company.website"
                      label="Website"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="company.email"
                      label="Contact Email"
                      type="email"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="company.phone"
                      label="Phone Number"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12">
                    <v-textarea
                      v-model="company.address"
                      label="Address"
                      variant="outlined"
                      rows="2"
                    />
                  </v-col>
                </v-row>
              </v-card-text>
              <v-card-actions class="pa-4">
                <v-spacer />
                <v-btn color="primary" @click="saveCompany">Save Changes</v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
          
          <v-col cols="12" md="4">
            <v-card rounded="lg">
              <v-card-title>Branding</v-card-title>
              <v-card-text class="text-center">
                <v-avatar size="100" color="grey-lighten-2" class="mb-4">
                  <v-icon size="48" v-if="!company.logo">mdi-image</v-icon>
                  <v-img v-else :src="company.logo" />
                </v-avatar>
                <div>
                  <v-btn variant="outlined" size="small" @click="uploadLogo">Upload Logo</v-btn>
                  <input ref="logoInput" type="file" accept="image/*" hidden @change="handleLogoUpload" />
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- Departments -->
      <v-window-item value="departments">
        <v-card rounded="lg">
          <v-card-title class="d-flex align-center justify-space-between">
            <span>Departments</span>
            <v-btn color="primary" prepend-icon="mdi-plus" @click="showAddDepartment = true">
              Add Department
            </v-btn>
          </v-card-title>
          <v-data-table
            :headers="departmentHeaders"
            :items="departments"
            :loading="loadingDepartments"
          >
            <template #item.employee_count="{ item }">
              <v-chip size="small" variant="tonal">{{ item.employee_count }} employees</v-chip>
            </template>
            <template #item.actions="{ item }">
              <v-btn icon="mdi-pencil" size="small" variant="text" @click="editDepartment(item)" />
              <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="deleteDepartment(item)" />
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>

      <!-- Positions -->
      <v-window-item value="positions">
        <v-card rounded="lg">
          <v-card-title class="d-flex align-center justify-space-between">
            <span>Positions</span>
            <v-btn color="primary" prepend-icon="mdi-plus" @click="showAddPosition = true">
              Add Position
            </v-btn>
          </v-card-title>
          <v-data-table
            :headers="positionHeaders"
            :items="positions"
            :loading="loadingPositions"
          >
            <template #item.department="{ item }">
              <v-chip size="small" variant="outlined">{{ item.department_name }}</v-chip>
            </template>
            <template #item.actions="{ item }">
              <v-btn icon="mdi-pencil" size="small" variant="text" @click="editPosition(item)" />
              <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="deletePosition(item)" />
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>

      <!-- Locations -->
      <v-window-item value="locations">
        <v-card rounded="lg">
          <v-card-title class="d-flex align-center justify-space-between">
            <span>Locations</span>
            <v-btn color="primary" prepend-icon="mdi-plus" @click="showAddLocation = true">
              Add Location
            </v-btn>
          </v-card-title>
          <v-data-table
            :headers="locationHeaders"
            :items="locations"
            :loading="loadingLocations"
          >
            <template #item.is_active="{ item }">
              <v-chip :color="item.is_active ? 'success' : 'grey'" size="small" variant="flat">
                {{ item.is_active ? 'Active' : 'Inactive' }}
              </v-chip>
            </template>
            <template #item.actions="{ item }">
              <v-btn icon="mdi-pencil" size="small" variant="text" @click="editLocation(item)" />
              <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="deleteLocation(item)" />
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>

      <!-- Roles -->
      <v-window-item value="roles">
        <v-card rounded="lg">
          <v-card-title>User Roles & Permissions</v-card-title>
          <v-card-text>
            <v-progress-circular v-if="loadingRoles" indeterminate color="primary" class="d-block mx-auto my-8" />
            <v-alert v-else-if="roles.length === 0" type="info" variant="tonal" class="my-4">
              No roles defined. Roles are managed in the RBAC system.
            </v-alert>
            <v-list v-else>
              <v-list-item v-for="role in roles" :key="role.id">
                <template #prepend>
                  <v-avatar :color="role.color" size="40">
                    <v-icon color="white">{{ role.icon }}</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-bold">{{ role.name }}</v-list-item-title>
                <v-list-item-subtitle>{{ role.description }}</v-list-item-subtitle>
                <template #append>
                  <v-chip size="small" variant="outlined">{{ role.user_count }} users</v-chip>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-window-item>

      <!-- Email Templates -->
      <v-window-item value="emails">
        <v-row>
          <v-col cols="12" md="4">
            <v-card rounded="lg" class="fill-height">
              <v-card-title>
                <v-icon start>mdi-email-outline</v-icon>
                Email Templates
              </v-card-title>
              <v-card-text>
                <p class="text-body-2 text-medium-emphasis mb-4">
                  Configure email templates for automated communications sent from the system.
                </p>
                <v-list density="compact" nav>
                  <v-list-item 
                    v-for="template in emailTemplates" 
                    :key="template.id"
                    :active="selectedEmailTemplate?.id === template.id"
                    @click="selectEmailTemplate(template)"
                    rounded
                  >
                    <template #prepend>
                      <v-icon :color="template.is_active ? 'success' : 'grey'">{{ template.icon }}</v-icon>
                    </template>
                    <v-list-item-title>{{ template.name }}</v-list-item-title>
                    <v-list-item-subtitle>{{ template.category }}</v-list-item-subtitle>
                    <template #append>
                      <v-chip v-if="template.is_active" size="x-small" color="success" variant="tonal">Active</v-chip>
                    </template>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>
          
          <v-col cols="12" md="8">
            <v-card v-if="selectedEmailTemplate" rounded="lg">
              <v-card-title class="d-flex align-center">
                <v-icon start>{{ selectedEmailTemplate.icon }}</v-icon>
                {{ selectedEmailTemplate.name }}
                <v-spacer />
                <v-switch 
                  v-model="selectedEmailTemplate.is_active" 
                  label="Active" 
                  color="success"
                  hide-details
                  density="compact"
                />
              </v-card-title>
              <v-divider />
              <v-card-text>
                <v-text-field
                  v-model="selectedEmailTemplate.subject"
                  label="Email Subject"
                  variant="outlined"
                  density="compact"
                  class="mb-4"
                  hint="Use {{name}}, {{email}}, {{program}}, etc. for dynamic content"
                  persistent-hint
                />
                
                <v-textarea
                  v-model="selectedEmailTemplate.body"
                  label="Email Body"
                  variant="outlined"
                  rows="12"
                  hint="HTML supported. Available variables: {{name}}, {{first_name}}, {{email}}, {{date}}, {{program}}, {{location}}, {{link}}"
                  persistent-hint
                />
                
                <v-expansion-panels class="mt-4">
                  <v-expansion-panel>
                    <v-expansion-panel-title>
                      <v-icon start>mdi-eye</v-icon>
                      Preview
                    </v-expansion-panel-title>
                    <v-expansion-panel-text>
                      <div class="email-preview pa-4 bg-grey-lighten-4 rounded">
                        <div class="text-subtitle-2 font-weight-bold mb-2">Subject: {{ previewEmailSubject }}</div>
                        <v-divider class="mb-3" />
                        <div v-html="previewEmailBody" class="email-body"></div>
                      </div>
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
              </v-card-text>
              <v-divider />
              <v-card-actions class="pa-4">
                <v-btn variant="text" @click="resetEmailTemplate">Reset to Default</v-btn>
                <v-spacer />
                <v-btn variant="outlined" @click="testEmailTemplate">Send Test Email</v-btn>
                <v-btn color="primary" @click="saveEmailTemplate" :loading="savingEmail">Save Template</v-btn>
              </v-card-actions>
            </v-card>
            
            <v-card v-else rounded="lg">
              <v-card-text class="text-center py-12">
                <v-icon size="64" color="grey-lighten-1">mdi-email-edit-outline</v-icon>
                <h3 class="text-h6 mt-4">Select a Template</h3>
                <p class="text-body-2 text-medium-emphasis">
                  Choose an email template from the list to edit its content
                </p>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- Integrations -->
      <v-window-item value="integrations">
        <v-progress-circular v-if="loadingIntegrations" indeterminate color="primary" class="d-block mx-auto my-8" />
        <v-row v-else>
          <v-col v-if="integrations.length === 0" cols="12">
            <v-alert type="info" variant="tonal">No integrations configured.</v-alert>
          </v-col>
          <v-col v-for="integration in integrations" :key="integration.id" cols="12" md="4">
            <v-card rounded="lg">
              <v-card-text class="text-center">
                <v-avatar size="64" :color="integration.connected ? 'success' : 'grey'" class="mb-3">
                  <v-icon size="32" color="white">{{ integration.icon }}</v-icon>
                </v-avatar>
                <h3 class="text-subtitle-1 font-weight-bold">{{ integration.name }}</h3>
                <p class="text-body-2 text-grey">{{ integration.description }}</p>
                <v-chip 
                  :color="integration.connected ? 'success' : 'grey'" 
                  size="small" 
                  variant="tonal"
                  class="mt-2"
                >
                  {{ integration.connected ? 'Connected' : 'Not Connected' }}
                </v-chip>
              </v-card-text>
              <v-card-actions>
                <v-btn 
                  :color="integration.connected ? 'error' : 'primary'" 
                  variant="text" 
                  block
                  @click="toggleIntegration(integration)"
                >
                  {{ integration.connected ? 'Disconnect' : 'Connect' }}
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- Database -->
      <v-window-item value="database">
        <v-alert type="warning" variant="tonal" class="mb-6">
          <v-icon start>mdi-alert</v-icon>
          Database operations require careful consideration. Changes may affect application functionality.
        </v-alert>
        
        <v-card rounded="lg" class="mb-4">
          <v-card-title>Create Migration</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="migration.name"
              label="Migration Name"
              placeholder="e.g., add_employee_status_field"
              variant="outlined"
              class="mb-3"
            />
            <v-textarea
              v-model="migration.sql"
              label="SQL Statement"
              placeholder="ALTER TABLE employees ADD COLUMN status VARCHAR(50);"
              variant="outlined"
              rows="6"
              font-family="monospace"
            />
          </v-card-text>
          <v-card-actions class="pa-4">
            <v-btn variant="outlined" prepend-icon="mdi-content-copy" @click="copyMigration">
              Copy to Clipboard
            </v-btn>
            <v-spacer />
            <v-btn color="primary" prepend-icon="mdi-download" @click="downloadMigration">
              Download Migration File
            </v-btn>
          </v-card-actions>
        </v-card>

        <v-card rounded="lg">
          <v-card-title>Recent Migrations</v-card-title>
          <v-list>
            <v-list-item v-for="m in recentMigrations" :key="m.name">
              <template #prepend>
                <v-icon :color="m.applied ? 'success' : 'warning'">
                  {{ m.applied ? 'mdi-check-circle' : 'mdi-clock' }}
                </v-icon>
              </template>
              <v-list-item-title>{{ m.name }}</v-list-item-title>
              <v-list-item-subtitle>{{ m.date }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card>
      </v-window-item>
    </v-window>

    <!-- Add Department Dialog -->
    <v-dialog v-model="showAddDepartment" max-width="400">
      <v-card>
        <v-card-title>{{ editingDepartment ? 'Edit Department' : 'Add Department' }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newDepartment.name"
            label="Department Name"
            variant="outlined"
          />
          <v-textarea
            v-model="newDepartment.description"
            label="Description"
            variant="outlined"
            rows="2"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showAddDepartment = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveDepartment">{{ editingDepartment ? 'Save' : 'Add' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add/Edit Position Dialog -->
    <v-dialog v-model="showAddPosition" max-width="400">
      <v-card>
        <v-card-title>{{ editingPosition ? 'Edit Position' : 'Add Position' }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newPosition.title"
            label="Position Title"
            variant="outlined"
            class="mb-3"
          />
          <v-select
            v-model="newPosition.department_id"
            :items="departments"
            item-title="name"
            item-value="id"
            label="Department"
            variant="outlined"
            class="mb-3"
          />
          <v-select
            v-model="newPosition.level"
            :items="['Entry', 'Mid', 'Senior', 'Lead', 'Manager']"
            label="Level"
            variant="outlined"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showAddPosition = false">Cancel</v-btn>
          <v-btn color="primary" @click="savePosition">{{ editingPosition ? 'Save' : 'Add' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add/Edit Location Dialog -->
    <v-dialog v-model="showAddLocation" max-width="400">
      <v-card>
        <v-card-title>{{ editingLocation ? 'Edit Location' : 'Add Location' }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newLocation.name"
            label="Location Name"
            variant="outlined"
            class="mb-3"
          />
          <v-textarea
            v-model="newLocation.address"
            label="Address"
            variant="outlined"
            rows="2"
            class="mb-3"
          />
          <v-switch
            v-model="newLocation.is_active"
            label="Active"
            color="success"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showAddLocation = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveLocation">{{ editingLocation ? 'Save' : 'Add' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin']
})

useHead({
  title: 'Global Settings'
})

const supabase = useSupabaseClient()

// State
const activeTab = ref('company')
const showAddDepartment = ref(false)
const showAddPosition = ref(false)
const showAddLocation = ref(false)
const loadingDepartments = ref(false)
const loadingPositions = ref(false)
const loadingLocations = ref(false)
const editingDepartment = ref<any>(null)
const editingPosition = ref<any>(null)
const editingLocation = ref<any>(null)
const logoInput = ref<HTMLInputElement | null>(null)

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success'
})

// Company data
const company = reactive({
  name: 'Green Dog Veterinary',
  website: 'www.greendog.vet',
  email: 'info@greendog.vet',
  phone: '555-123-4567',
  address: '123 Pet Care Lane, Animal City, AC 12345',
  logo: ''
})

// Table headers
const departmentHeaders = [
  { title: 'Name', key: 'name' },
  { title: 'Description', key: 'description' },
  { title: 'Employees', key: 'employee_count' },
  { title: 'Actions', key: 'actions', sortable: false }
]

const positionHeaders = [
  { title: 'Title', key: 'title' },
  { title: 'Department', key: 'department' },
  { title: 'Level', key: 'level' },
  { title: 'Actions', key: 'actions', sortable: false }
]

const locationHeaders = [
  { title: 'Name', key: 'name' },
  { title: 'Address', key: 'address' },
  { title: 'Status', key: 'is_active' },
  { title: 'Actions', key: 'actions', sortable: false }
]

// Data - loaded from database
const departments = ref<any[]>([])

const positions = ref<any[]>([])

const locations = ref<any[]>([])

const roles = ref<any[]>([])
const loadingRoles = ref(false)

const integrations = ref<any[]>([])
const loadingIntegrations = ref(false)

const newDepartment = reactive({
  name: '',
  description: ''
})

const newPosition = reactive({
  title: '',
  department_id: '',
  level: 'Mid'
})

const newLocation = reactive({
  name: '',
  address: '',
  is_active: true
})

const migration = reactive({
  name: '',
  sql: ''
})

const recentMigrations = [
  { name: '027_employee_documents.sql', date: 'Dec 10, 2024', applied: true },
  { name: '026_public_lead_capture.sql', date: 'Dec 8, 2024', applied: true },
  { name: '025_partner_crm_fields.sql', date: 'Dec 5, 2024', applied: true }
]

// Email templates
interface EmailTemplate {
  id: string
  name: string
  category: string
  icon: string
  subject: string
  body: string
  is_active: boolean
}

const emailTemplates = ref<EmailTemplate[]>([
  { 
    id: 'student_invite', 
    name: 'Student Invitation', 
    category: 'GDU Academy',
    icon: 'mdi-school',
    subject: 'Welcome to {{program}} at Green Dog Dental',
    body: `<p>Hello {{first_name}},</p>
<p>We're excited to welcome you to the {{program}} program at Green Dog Dental!</p>
<p>Please click the link below to complete your enrollment:</p>
<p><a href="{{link}}">Complete Your Enrollment</a></p>
<p>Your program starts on {{date}}.</p>
<p>Best regards,<br>Green Dog Dental Academy Team</p>`,
    is_active: true
  },
  { 
    id: 'candidate_application', 
    name: 'Application Received', 
    category: 'Recruiting',
    icon: 'mdi-account-plus',
    subject: 'Application Received - {{position}}',
    body: `<p>Dear {{first_name}},</p>
<p>Thank you for applying for the {{position}} position at Green Dog Dental.</p>
<p>We have received your application and will review it shortly. You can expect to hear from us within 5-7 business days.</p>
<p>Best regards,<br>Green Dog Dental HR Team</p>`,
    is_active: true
  },
  { 
    id: 'interview_scheduled', 
    name: 'Interview Scheduled', 
    category: 'Recruiting',
    icon: 'mdi-calendar-check',
    subject: 'Interview Scheduled - {{position}}',
    body: `<p>Dear {{first_name}},</p>
<p>Great news! We'd like to schedule an interview for the {{position}} position.</p>
<p><strong>Date:</strong> {{date}}<br>
<strong>Time:</strong> {{time}}<br>
<strong>Location:</strong> {{location}}</p>
<p>Please confirm your availability by replying to this email.</p>
<p>Best regards,<br>Green Dog Dental HR Team</p>`,
    is_active: true
  },
  { 
    id: 'offer_letter', 
    name: 'Job Offer', 
    category: 'Recruiting',
    icon: 'mdi-file-document-check',
    subject: 'Job Offer - {{position}} at Green Dog Dental',
    body: `<p>Dear {{first_name}},</p>
<p>Congratulations! We are pleased to offer you the position of {{position}} at Green Dog Dental.</p>
<p>Please review the attached offer letter and respond within 5 business days.</p>
<p>We look forward to welcoming you to our team!</p>
<p>Best regards,<br>Green Dog Dental HR Team</p>`,
    is_active: true
  },
  { 
    id: 'time_off_approved', 
    name: 'Time Off Approved', 
    category: 'HR',
    icon: 'mdi-calendar-check',
    subject: 'Your Time Off Request Has Been Approved',
    body: `<p>Hi {{first_name}},</p>
<p>Your time off request has been approved!</p>
<p><strong>Dates:</strong> {{start_date}} - {{end_date}}<br>
<strong>Type:</strong> {{type}}</p>
<p>Enjoy your time off!</p>`,
    is_active: true
  },
  { 
    id: 'time_off_denied', 
    name: 'Time Off Denied', 
    category: 'HR',
    icon: 'mdi-calendar-remove',
    subject: 'Your Time Off Request Status',
    body: `<p>Hi {{first_name}},</p>
<p>Unfortunately, your time off request for {{start_date}} - {{end_date}} could not be approved at this time.</p>
<p>Please speak with your manager for more information.</p>`,
    is_active: true
  },
  { 
    id: 'schedule_published', 
    name: 'Schedule Published', 
    category: 'Scheduling',
    icon: 'mdi-calendar-month',
    subject: 'Your Schedule for {{week}}',
    body: `<p>Hi {{first_name}},</p>
<p>Your schedule for the week of {{week}} has been published.</p>
<p>Please log in to TeamOS to view your shifts.</p>`,
    is_active: true
  },
  { 
    id: 'password_reset', 
    name: 'Password Reset', 
    category: 'System',
    icon: 'mdi-lock-reset',
    subject: 'Reset Your Password',
    body: `<p>Hi {{first_name}},</p>
<p>Click the link below to reset your password:</p>
<p><a href="{{link}}">Reset Password</a></p>
<p>This link will expire in 24 hours.</p>`,
    is_active: true
  }
])

const selectedEmailTemplate = ref<EmailTemplate | null>(null)
const savingEmail = ref(false)

const previewEmailSubject = computed(() => {
  if (!selectedEmailTemplate.value) return ''
  return selectedEmailTemplate.value.subject
    .replace(/\{\{first_name\}\}/g, 'John')
    .replace(/\{\{name\}\}/g, 'John Doe')
    .replace(/\{\{program\}\}/g, 'Externship Program')
    .replace(/\{\{position\}\}/g, 'Veterinary Technician')
    .replace(/\{\{week\}\}/g, 'January 20-26')
})

const previewEmailBody = computed(() => {
  if (!selectedEmailTemplate.value) return ''
  return selectedEmailTemplate.value.body
    .replace(/\{\{first_name\}\}/g, 'John')
    .replace(/\{\{name\}\}/g, 'John Doe')
    .replace(/\{\{email\}\}/g, 'john.doe@example.com')
    .replace(/\{\{program\}\}/g, 'Externship Program')
    .replace(/\{\{position\}\}/g, 'Veterinary Technician')
    .replace(/\{\{date\}\}/g, 'January 20, 2026')
    .replace(/\{\{time\}\}/g, '2:00 PM')
    .replace(/\{\{location\}\}/g, 'Venice Clinic')
    .replace(/\{\{start_date\}\}/g, 'January 20, 2026')
    .replace(/\{\{end_date\}\}/g, 'January 24, 2026')
    .replace(/\{\{type\}\}/g, 'Vacation')
    .replace(/\{\{week\}\}/g, 'January 20-26')
    .replace(/\{\{link\}\}/g, '#')
})

function selectEmailTemplate(template: EmailTemplate) {
  selectedEmailTemplate.value = { ...template }
}

async function saveEmailTemplate() {
  if (!selectedEmailTemplate.value) return
  savingEmail.value = true
  
  try {
    // Update in local list
    const index = emailTemplates.value.findIndex(t => t.id === selectedEmailTemplate.value!.id)
    if (index >= 0) {
      emailTemplates.value[index] = { ...selectedEmailTemplate.value }
    }
    
    // Save to database (email_templates table)
    const { error } = await supabase
      .from('email_templates')
      .upsert({
        id: selectedEmailTemplate.value.id,
        name: selectedEmailTemplate.value.name,
        category: selectedEmailTemplate.value.category,
        subject: selectedEmailTemplate.value.subject,
        body: selectedEmailTemplate.value.body,
        is_active: selectedEmailTemplate.value.is_active,
        updated_at: new Date().toISOString()
      })
    
    if (error) throw error
    
    showSnackbar('Email template saved successfully', 'success')
  } catch (err: any) {
    console.error('Error saving email template:', err)
    showSnackbar('Failed to save email template', 'error')
  } finally {
    savingEmail.value = false
  }
}

function resetEmailTemplate() {
  if (!selectedEmailTemplate.value) return
  const original = emailTemplates.value.find(t => t.id === selectedEmailTemplate.value!.id)
  if (original) {
    selectedEmailTemplate.value = { ...original }
  }
}

async function testEmailTemplate() {
  showSnackbar('Test email functionality will be implemented with email service integration', 'info')
}

// Load data from database
onMounted(async () => {
  await Promise.all([
    loadDepartments(),
    loadPositions(),
    loadLocations(),
    loadRoles(),
    loadIntegrations(),
    loadCompanySettings()
  ])
})

async function loadCompanySettings() {
  const { data } = await supabase
    .from('company_settings')
    .select('*')
    .eq('id', 'default')
    .maybeSingle()
  
  if (data) {
    company.name = data.company_name || company.name
    company.website = data.website || company.website
    company.email = data.contact_email || company.email
    company.phone = data.phone || company.phone
    company.address = data.address || company.address
    company.logo = data.logo_url || ''
  }
}

async function loadDepartments() {
  loadingDepartments.value = true
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('id, name, description')
      .order('name')
    
    if (error) throw error
    
    departments.value = (data || []).map(d => ({
      ...d,
      employee_count: 0 // Could be calculated with a join
    }))
  } catch (err) {
    console.error('Error loading departments:', err)
  } finally {
    loadingDepartments.value = false
  }
}

async function loadPositions() {
  loadingPositions.value = true
  try {
    const { data, error } = await supabase
      .from('job_positions')
      .select('id, title, code, description, job_family, is_manager')
      .order('title')
    
    if (error) throw error
    
    positions.value = (data || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      code: p.code,
      department_name: p.job_family || '',
      level: p.is_manager ? 'Manager' : 'Staff'
    }))
  } catch (err) {
    console.error('Error loading positions:', err)
  } finally {
    loadingPositions.value = false
  }
}

async function loadLocations() {
  loadingLocations.value = true
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('id, name, code, address_line1, address_line2, city, state, postal_code, phone, is_active')
      .order('name')
    
    if (error) throw error
    
    // Format address from component parts
    locations.value = (data || []).map((loc: any) => {
      const addressParts = [
        loc.address_line1,
        loc.address_line2,
        loc.city,
        loc.state,
        loc.postal_code
      ].filter(Boolean)
      
      return {
        id: loc.id,
        name: loc.name,
        code: loc.code,
        address: addressParts.join(', ') || 'No address on file',
        phone: loc.phone,
        is_active: loc.is_active
      }
    })
  } catch (err) {
    console.error('Error loading locations:', err)
  } finally {
    loadingLocations.value = false
  }
}

async function loadRoles() {
  loadingRoles.value = true
  try {
    // Load roles from role_definitions table
    const { data: roleData, error: roleError } = await supabase
      .from('role_definitions')
      .select('id, role_key, display_name, description, tier, icon, color')
      .order('tier')
    
    if (roleError) throw roleError
    
    // Count users per role from user_role_assignments
    const { data: userCounts, error: countError } = await supabase
      .from('user_role_assignments')
      .select('role_key')
    
    const roleCounts: Record<string, number> = {}
    if (!countError && userCounts) {
      userCounts.forEach((u: any) => {
        roleCounts[u.role_key] = (roleCounts[u.role_key] || 0) + 1
      })
    }
    
    roles.value = (roleData || []).map((r: any) => ({
      id: r.role_key,
      name: r.display_name,
      description: r.description,
      icon: r.icon || 'mdi-account',
      color: r.color || 'primary',
      tier: r.tier,
      user_count: roleCounts[r.role_key] || 0
    }))
  } catch (err) {
    console.error('Error loading roles:', err)
  } finally {
    loadingRoles.value = false
  }
}

async function loadIntegrations() {
  loadingIntegrations.value = true
  try {
    const intList = []
    
    // Check Slack integration status via health endpoint
    let slackConnected = false
    try {
      const slackHealth = await $fetch('/api/slack/health')
      slackConnected = slackHealth?.status === 'healthy' || slackHealth?.connected === true
    } catch {
      slackConnected = false
    }
    
    intList.push({
      id: 'slack',
      name: 'Slack',
      description: 'Team communication and notifications',
      icon: 'mdi-slack',
      connected: slackConnected
    })
    
    // EzyVet integration - check for ezyvet tables presence
    const { count: ezyvetCount } = await supabase
      .from('ezyvet_contacts')
      .select('*', { count: 'exact', head: true })
      .limit(1)
    
    intList.push({
      id: 'ezyvet',
      name: 'EzyVet',
      description: 'Veterinary practice management',
      icon: 'mdi-paw',
      connected: ezyvetCount !== null && ezyvetCount > 0
    })
    
    // Supabase integration (always connected if we got this far)
    intList.push({
      id: 'supabase',
      name: 'Supabase',
      description: 'Database and authentication',
      icon: 'mdi-database',
      connected: true
    })
    
    integrations.value = intList
  } catch (err) {
    console.error('Error loading integrations:', err)
    // Fallback to basic integrations with unknown status
    integrations.value = [
      { id: 'slack', name: 'Slack', description: 'Team communication', icon: 'mdi-slack', connected: false },
      { id: 'ezyvet', name: 'EzyVet', description: 'Veterinary practice management', icon: 'mdi-paw', connected: false },
      { id: 'supabase', name: 'Supabase', description: 'Database and authentication', icon: 'mdi-database', connected: true }
    ]
  } finally {
    loadingIntegrations.value = false
  }
}

// Methods
async function saveCompany() {
  try {
    const { error } = await supabase
      .from('company_settings')
      .upsert({
        id: 'default',
        company_name: company.name,
        website: company.website,
        contact_email: company.email,
        phone: company.phone,
        address: company.address,
        logo_url: company.logo
      })
    
    if (error) throw error
    snackbar.message = 'Company settings saved'
    snackbar.color = 'success'
    snackbar.show = true
  } catch (err: any) {
    console.error('Error saving company:', err)
    snackbar.message = 'Failed to save company settings'
    snackbar.color = 'error'
    snackbar.show = true
  }
}

function uploadLogo() {
  logoInput.value?.click()
}

async function handleLogoUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  
  try {
    const fileName = `company-logo-${Date.now()}.${file.name.split('.').pop()}`
    const { error: uploadError } = await supabase.storage
      .from('company-assets')
      .upload(fileName, file, { upsert: true })
    
    if (uploadError) throw uploadError
    
    const { data: urlData } = supabase.storage
      .from('company-assets')
      .getPublicUrl(fileName)
    
    company.logo = urlData.publicUrl
    snackbar.message = 'Logo uploaded successfully'
    snackbar.color = 'success'
    snackbar.show = true
  } catch (err: any) {
    console.error('Error uploading logo:', err)
    snackbar.message = 'Failed to upload logo'
    snackbar.color = 'error'
    snackbar.show = true
  }
}

function toggleIntegration(integration: any) {
  if (integration.id === 'slack') {
    navigateTo('/admin/slack')
    return
  }
  
  integration.connected = !integration.connected
  snackbar.message = integration.connected 
    ? `${integration.name} connected` 
    : `${integration.name} disconnected`
  snackbar.color = 'success'
  snackbar.show = true
}

async function saveDepartment() {
  if (!newDepartment.name) return
  
  try {
    if (editingDepartment.value) {
      const { error } = await supabase
        .from('departments')
        .update({ name: newDepartment.name, description: newDepartment.description })
        .eq('id', editingDepartment.value.id)
      
      if (error) throw error
      
      const idx = departments.value.findIndex(d => d.id === editingDepartment.value.id)
      if (idx !== -1) {
        departments.value[idx].name = newDepartment.name
        departments.value[idx].description = newDepartment.description
      }
      snackbar.message = 'Department updated'
    } else {
      const { data, error } = await supabase
        .from('departments')
        .insert({ name: newDepartment.name, description: newDepartment.description })
        .select()
        .single()
      
      if (error) throw error
      
      departments.value.push({
        id: data.id,
        name: data.name,
        description: data.description,
        employee_count: 0
      })
      snackbar.message = 'Department added'
    }
    
    showAddDepartment.value = false
    editingDepartment.value = null
    newDepartment.name = ''
    newDepartment.description = ''
    snackbar.color = 'success'
    snackbar.show = true
  } catch (err: any) {
    console.error('Error saving department:', err)
    snackbar.message = 'Failed to save department'
    snackbar.color = 'error'
    snackbar.show = true
  }
}

function editDepartment(item: any) {
  editingDepartment.value = item
  newDepartment.name = item.name
  newDepartment.description = item.description || ''
  showAddDepartment.value = true
}

async function deleteDepartment(item: any) {
  try {
    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', item.id)
    
    if (error) throw error
    
    departments.value = departments.value.filter(d => d.id !== item.id)
    snackbar.message = 'Department deleted'
    snackbar.color = 'info'
    snackbar.show = true
  } catch (err: any) {
    console.error('Error deleting department:', err)
    snackbar.message = 'Failed to delete department'
    snackbar.color = 'error'
    snackbar.show = true
  }
}

async function savePosition() {
  if (!newPosition.title) return
  
  try {
    const dept = departments.value.find(d => d.id === newPosition.department_id)
    
    if (editingPosition.value) {
      const { error } = await supabase
        .from('job_positions')
        .update({ 
          title: newPosition.title, 
          department_id: newPosition.department_id,
          level: newPosition.level 
        })
        .eq('id', editingPosition.value.id)
      
      if (error) throw error
      
      const idx = positions.value.findIndex(p => p.id === editingPosition.value.id)
      if (idx !== -1) {
        positions.value[idx].title = newPosition.title
        positions.value[idx].department_name = dept?.name || ''
        positions.value[idx].level = newPosition.level
      }
      snackbar.message = 'Position updated'
    } else {
      const { data, error } = await supabase
        .from('job_positions')
        .insert({ 
          title: newPosition.title, 
          department_id: newPosition.department_id || null,
          level: newPosition.level,
          is_active: true
        })
        .select()
        .single()
      
      if (error) throw error
      
      positions.value.push({
        id: data.id,
        title: data.title,
        department_name: dept?.name || '',
        level: data.level
      })
      snackbar.message = 'Position added'
    }
    
    showAddPosition.value = false
    editingPosition.value = null
    newPosition.title = ''
    newPosition.department_id = ''
    newPosition.level = 'Mid'
    snackbar.color = 'success'
    snackbar.show = true
  } catch (err: any) {
    console.error('Error saving position:', err)
    snackbar.message = 'Failed to save position'
    snackbar.color = 'error'
    snackbar.show = true
  }
}

function editPosition(item: any) {
  editingPosition.value = item
  newPosition.title = item.title
  newPosition.department_id = departments.value.find(d => d.name === item.department_name)?.id || ''
  newPosition.level = item.level
  showAddPosition.value = true
}

async function deletePosition(item: any) {
  try {
    const { error } = await supabase
      .from('job_positions')
      .delete()
      .eq('id', item.id)
    
    if (error) throw error
    
    positions.value = positions.value.filter(p => p.id !== item.id)
    snackbar.message = 'Position deleted'
    snackbar.color = 'info'
    snackbar.show = true
  } catch (err: any) {
    console.error('Error deleting position:', err)
    snackbar.message = 'Failed to delete position'
    snackbar.color = 'error'
    snackbar.show = true
  }
}

async function saveLocation() {
  if (!newLocation.name) return
  
  try {
    if (editingLocation.value) {
      const { error } = await supabase
        .from('locations')
        .update({ 
          name: newLocation.name, 
          address: newLocation.address,
          is_active: newLocation.is_active 
        })
        .eq('id', editingLocation.value.id)
      
      if (error) throw error
      
      const idx = locations.value.findIndex(l => l.id === editingLocation.value.id)
      if (idx !== -1) {
        locations.value[idx].name = newLocation.name
        locations.value[idx].address = newLocation.address
        locations.value[idx].is_active = newLocation.is_active
      }
      snackbar.message = 'Location updated'
    } else {
      const { data, error } = await supabase
        .from('locations')
        .insert({ 
          name: newLocation.name, 
          address: newLocation.address,
          is_active: newLocation.is_active
        })
        .select()
        .single()
      
      if (error) throw error
      
      locations.value.push({
        id: data.id,
        name: data.name,
        address: data.address,
        is_active: data.is_active
      })
      snackbar.message = 'Location added'
    }
    
    showAddLocation.value = false
    editingLocation.value = null
    newLocation.name = ''
    newLocation.address = ''
    newLocation.is_active = true
    snackbar.color = 'success'
    snackbar.show = true
  } catch (err: any) {
    console.error('Error saving location:', err)
    snackbar.message = 'Failed to save location'
    snackbar.color = 'error'
    snackbar.show = true
  }
}

function editLocation(item: any) {
  editingLocation.value = item
  newLocation.name = item.name
  newLocation.address = item.address || ''
  newLocation.is_active = item.is_active
  showAddLocation.value = true
}

async function deleteLocation(item: any) {
  try {
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', item.id)
    
    if (error) throw error
    
    locations.value = locations.value.filter(l => l.id !== item.id)
    snackbar.message = 'Location deleted'
    snackbar.color = 'info'
    snackbar.show = true
  } catch (err: any) {
    console.error('Error deleting location:', err)
    snackbar.message = 'Failed to delete location'
    snackbar.color = 'error'
    snackbar.show = true
  }
}

function copyMigration() {
  navigator.clipboard.writeText(migration.sql)
  snackbar.message = 'Migration SQL copied to clipboard'
  snackbar.color = 'success'
  snackbar.show = true
}

function downloadMigration() {
  if (!migration.name || !migration.sql) {
    snackbar.message = 'Please enter migration name and SQL'
    snackbar.color = 'warning'
    snackbar.show = true
    return
  }
  
  const blob = new Blob([migration.sql], { type: 'text/plain' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${migration.name}.sql`
  link.click()
  
  snackbar.message = 'Migration file downloaded'
  snackbar.color = 'success'
  snackbar.show = true
}
</script>

<style scoped>
.global-settings-page {
  max-width: 1200px;
}
</style>
