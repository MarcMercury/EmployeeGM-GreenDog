<script setup lang="ts">
import type { EmailTemplate } from '~/types/admin.types'

/**
 * System Health & Settings Dashboard
 * 
 * Admin-only page combining system health monitoring with
 * application-wide settings and configurations.
 */

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin']
})

useHead({
  title: 'System Health & Settings'
})

const supabase = useSupabaseClient()
const route = useRoute()

// =====================================================
// TABS & NAVIGATION
// =====================================================
const activeTab = ref(route.query.tab?.toString() || 'health')

// =====================================================
// SYSTEM HEALTH STATE
// =====================================================
const refreshInterval = ref<ReturnType<typeof setInterval> | null>(null)
const autoRefresh = ref(true)
const lastRefresh = ref(new Date())

// Fetch system health from API
const { data: health, pending: healthPending, refresh: refreshHealth } = await useFetch('/api/system-health', {
  lazy: true
})

// Fetch database health via RPC
const dbHealth = ref<any>(null)
const dbHealthPending = ref(false)

async function fetchDbHealth() {
  dbHealthPending.value = true
  try {
    const { data, error } = await supabase.rpc('check_database_health')
    if (!error) {
      dbHealth.value = data
    }
  } catch (e) {
    console.error('Failed to fetch DB health:', e)
  }
  dbHealthPending.value = false
}

// Fetch table statistics
const tableStats = ref<any[]>([])
const tableStatsPending = ref(false)

async function fetchTableStats() {
  tableStatsPending.value = true
  try {
    const { data, error } = await supabase.rpc('get_table_statistics')
    if (!error && data) {
      tableStats.value = data
    }
  } catch (e) {
    console.error('Table stats not available:', e)
  }
  tableStatsPending.value = false
}

// Refresh all health data
async function refreshAll() {
  lastRefresh.value = new Date()
  await Promise.all([
    refreshHealth(),
    fetchDbHealth(),
    fetchTableStats()
  ])
}

// =====================================================
// SETTINGS STATE
// =====================================================
const showAddDepartment = ref(false)
const showAddPosition = ref(false)
const showAddLocation = ref(false)
const showPositionSkillsDialog = ref(false)
const loadingDepartments = ref(false)
const loadingPositions = ref(false)
const loadingLocations = ref(false)
const loadingRoles = ref(false)
const loadingIntegrations = ref(false)
const loadingSkillLibrary = ref(false)
const loadingPositionSkills = ref(false)
const savingPositionSkills = ref(false)
const editingDepartment = ref<any>(null)
const editingPosition = ref<any>(null)
const editingLocation = ref<any>(null)
const selectedPositionForSkills = ref<any>(null)
const selectedSkillToAdd = ref<string | null>(null)
const skillLibrary = ref<any[]>([])
const positionSkills = ref<any[]>([]) // Skills assigned to the selected position
const logoInput = ref<HTMLInputElement | null>(null)
const savingEmail = ref(false)

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success'
})

function showSnackbar(message: string, color: string = 'success') {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}

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
  { title: 'Code', key: 'code' },
  { title: 'Employees', key: 'employee_count' },
  { title: 'Actions', key: 'actions', sortable: false }
]

const positionHeaders = [
  { title: 'Title', key: 'title' },
  { title: 'Department', key: 'department_name' },
  { title: 'Level', key: 'level' },
  { title: 'Required Skills', key: 'required_skills_count' },
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
const integrations = ref<any[]>([])

const newDepartment = reactive({
  name: '',
  code: ''
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
    id: 'schedule_published', 
    name: 'Schedule Published', 
    category: 'Scheduling',
    icon: 'mdi-calendar-month',
    subject: 'Your Schedule for {{week}}',
    body: `<p>Hi {{first_name}},</p>
<p>Your schedule for the week of {{week}} has been published.</p>
<p>Please log in to EmployeeGM to view your shifts.</p>`,
    is_active: true
  }
])

const selectedEmailTemplate = ref<EmailTemplate | null>(null)

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

// =====================================================
// HEALTH STATUS HELPERS
// =====================================================
const overallStatus = computed(() => {
  if (!health.value) return 'unknown'
  return health.value.status
})

const statusColor = computed(() => {
  const colors: Record<string, string> = {
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    error: 'bg-red-500',
    unknown: 'bg-gray-400'
  }
  return colors[overallStatus.value] || colors.unknown
})

const statusIcon = computed(() => {
  const icons: Record<string, string> = {
    healthy: '✅',
    degraded: '⚠️',
    error: '❌',
    unknown: '❓'
  }
  return icons[overallStatus.value] || icons.unknown
})

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}

function timeSince(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  return `${Math.floor(seconds / 60)}m ago`
}

// =====================================================
// DATA LOADING FUNCTIONS
// =====================================================
async function loadCompanySettings() {
  try {
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1)
      .maybeSingle()
    
    if (error) {
      console.error('Error loading company settings:', error)
      return
    }
    
    if (data) {
      company.name = data.company_name || data.display_name || data.legal_name || company.name
      company.website = data.website || company.website
      company.email = data.contact_email || company.email
      company.phone = data.phone || company.phone
      company.address = data.address || company.address
      company.logo = data.logo_url || ''
    }
  } catch (err) {
    console.error('Error loading company settings:', err)
  }
}

async function loadDepartments() {
  loadingDepartments.value = true
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('id, name, code, is_active')
      .eq('is_active', true)
      .order('name')
    
    if (error) throw error
    
    departments.value = (data || []).map(d => ({
      id: d.id,
      name: d.name,
      code: d.code || '',
      employee_count: 0
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
      .select(`
        id, title, code, description, job_family, is_manager,
        position_required_skills(count)
      `)
      .order('title')
    
    if (error) throw error
    
    positions.value = (data || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      code: p.code,
      department_name: p.job_family || '',
      level: p.is_manager ? 'Manager' : 'Staff',
      required_skills_count: p.position_required_skills?.[0]?.count || 0
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
    const { data: roleData, error: roleError } = await supabase
      .from('role_definitions')
      .select('id, role_key, display_name, description, tier, icon, color')
      .order('tier')
    
    if (roleError) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
      
      const roleCounts: Record<string, number> = {}
      if (profileData) {
        profileData.forEach((p: any) => {
          const role = p.role || 'user'
          roleCounts[role] = (roleCounts[role] || 0) + 1
        })
      }
      
      roles.value = Object.entries(roleCounts).map(([role, count]) => ({
        id: role,
        name: role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' '),
        description: `${role} role`,
        icon: role === 'admin' ? 'mdi-shield-crown' : 'mdi-account',
        color: role === 'admin' ? 'warning' : 'primary',
        tier: role === 'admin' ? 1 : 10,
        user_count: count
      }))
      return
    }
    
    let roleCounts: Record<string, number> = {}
    try {
      const { data: userCounts } = await supabase
        .from('user_role_assignments')
        .select('role_key')
      
      if (userCounts) {
        userCounts.forEach((u: any) => {
          roleCounts[u.role_key] = (roleCounts[u.role_key] || 0) + 1
        })
      }
    } catch {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
      
      if (profileData) {
        profileData.forEach((p: any) => {
          const role = p.role || 'user'
          roleCounts[role] = (roleCounts[role] || 0) + 1
        })
      }
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
    
    let slackConnected = false
    try {
      const slackHealth = await $fetch('/api/slack/health')
      slackConnected = slackHealth?.status === 'healthy' || 
                       slackHealth?.status === 'degraded' || 
                       slackHealth?.connected === true
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
    
    let ezyvetConnected = false
    try {
      const { count: ezyvetCount, error } = await supabase
        .from('ezyvet_contacts')
        .select('*', { count: 'exact', head: true })
        .limit(1)
      
      ezyvetConnected = !error && ezyvetCount !== null && ezyvetCount > 0
    } catch {
      ezyvetConnected = false
    }
    
    intList.push({
      id: 'ezyvet',
      name: 'EzyVet',
      description: 'Veterinary practice management',
      icon: 'mdi-paw',
      connected: ezyvetConnected
    })
    
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
    integrations.value = [
      { id: 'slack', name: 'Slack', description: 'Team communication', icon: 'mdi-slack', connected: false },
      { id: 'ezyvet', name: 'EzyVet', description: 'Veterinary practice management', icon: 'mdi-paw', connected: false },
      { id: 'supabase', name: 'Supabase', description: 'Database and authentication', icon: 'mdi-database', connected: true }
    ]
  } finally {
    loadingIntegrations.value = false
  }
}

// =====================================================
// SAVE/UPDATE FUNCTIONS
// =====================================================
async function saveCompany() {
  try {
    const { data: existing } = await supabase
      .from('company_settings')
      .select('id')
      .limit(1)
      .maybeSingle()
    
    const settingsData = {
      company_name: company.name,
      display_name: company.name,
      website: company.website,
      contact_email: company.email,
      phone: company.phone,
      address: company.address,
      logo_url: company.logo
    }
    
    let error
    if (existing) {
      const result = await supabase
        .from('company_settings')
        .update(settingsData)
        .eq('id', existing.id)
      error = result.error
    } else {
      const result = await supabase
        .from('company_settings')
        .insert(settingsData)
      error = result.error
    }
    
    if (error) throw error
    showSnackbar('Company settings saved', 'success')
  } catch (err: any) {
    console.error('Error saving company:', err)
    showSnackbar('Failed to save company settings', 'error')
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
    showSnackbar('Logo uploaded successfully', 'success')
  } catch (err: any) {
    console.error('Error uploading logo:', err)
    showSnackbar('Failed to upload logo', 'error')
  }
}

async function saveDepartment() {
  if (!newDepartment.name) return
  
  try {
    if (editingDepartment.value) {
      const { error } = await supabase
        .from('departments')
        .update({ name: newDepartment.name, code: newDepartment.code || null })
        .eq('id', editingDepartment.value.id)
      
      if (error) throw error
      
      const idx = departments.value.findIndex(d => d.id === editingDepartment.value.id)
      if (idx !== -1) {
        departments.value[idx].name = newDepartment.name
        departments.value[idx].code = newDepartment.code
      }
      showSnackbar('Department updated', 'success')
    } else {
      const { data, error } = await supabase
        .from('departments')
        .insert({ name: newDepartment.name, code: newDepartment.code || null })
        .select()
        .single()
      
      if (error) throw error
      
      departments.value.push({
        id: data.id,
        name: data.name,
        code: data.code,
        employee_count: 0
      })
      showSnackbar('Department added', 'success')
    }
    
    showAddDepartment.value = false
    editingDepartment.value = null
    newDepartment.name = ''
    newDepartment.code = ''
  } catch (err: any) {
    console.error('Error saving department:', err)
    showSnackbar('Failed to save department', 'error')
  }
}

function editDepartment(item: any) {
  editingDepartment.value = item
  newDepartment.name = item.name
  newDepartment.code = item.code || ''
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
    showSnackbar('Department deleted', 'info')
  } catch (err: any) {
    console.error('Error deleting department:', err)
    showSnackbar('Failed to delete department', 'error')
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
          job_family: dept?.name || null,
          is_manager: newPosition.level === 'Manager'
        })
        .eq('id', editingPosition.value.id)
      
      if (error) throw error
      
      const idx = positions.value.findIndex(p => p.id === editingPosition.value.id)
      if (idx !== -1) {
        positions.value[idx].title = newPosition.title
        positions.value[idx].department_name = dept?.name || ''
        positions.value[idx].level = newPosition.level
      }
      showSnackbar('Position updated', 'success')
    } else {
      const { data, error } = await supabase
        .from('job_positions')
        .insert({ 
          title: newPosition.title, 
          job_family: dept?.name || null,
          is_manager: newPosition.level === 'Manager'
        })
        .select()
        .single()
      
      if (error) throw error
      
      positions.value.push({
        id: data.id,
        title: data.title,
        department_name: dept?.name || '',
        level: newPosition.level
      })
      showSnackbar('Position added', 'success')
    }
    
    showAddPosition.value = false
    editingPosition.value = null
    newPosition.title = ''
    newPosition.department_id = ''
    newPosition.level = 'Mid'
  } catch (err: any) {
    console.error('Error saving position:', err)
    showSnackbar('Failed to save position', 'error')
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
    showSnackbar('Position deleted', 'info')
  } catch (err: any) {
    console.error('Error deleting position:', err)
    showSnackbar('Failed to delete position', 'error')
  }
}

// =====================================================
// POSITION SKILLS MANAGEMENT
// =====================================================
async function loadSkillLibrary() {
  if (skillLibrary.value.length > 0) return // Already loaded
  
  loadingSkillLibrary.value = true
  try {
    const { data, error } = await supabase
      .from('skill_library')
      .select('id, name, category, description')
      .eq('is_active', true)
      .order('category')
      .order('name')
    
    if (error) throw error
    skillLibrary.value = data || []
  } catch (err) {
    console.error('Error loading skill library:', err)
  } finally {
    loadingSkillLibrary.value = false
  }
}

async function loadPositionSkills(positionId: string) {
  loadingPositionSkills.value = true
  try {
    const { data, error } = await supabase
      .from('position_required_skills')
      .select(`
        id,
        skill_id,
        required_level,
        is_core,
        skill:skill_library(id, name, category)
      `)
      .eq('position_id', positionId)
      .order('is_core', { ascending: false })
      .order('required_level', { ascending: false })
    
    if (error) throw error
    positionSkills.value = (data || []).map((s: any) => ({
      ...s,
      skill_name: s.skill?.name,
      category: s.skill?.category
    }))
  } catch (err) {
    console.error('Error loading position skills:', err)
    positionSkills.value = []
  } finally {
    loadingPositionSkills.value = false
  }
}

async function openPositionSkillsDialog(position: any) {
  selectedPositionForSkills.value = position
  showPositionSkillsDialog.value = true
  await Promise.all([
    loadSkillLibrary(),
    loadPositionSkills(position.id)
  ])
}

function closePositionSkillsDialog() {
  showPositionSkillsDialog.value = false
  selectedPositionForSkills.value = null
  positionSkills.value = []
  selectedSkillToAdd.value = null
}

async function addSkillToPosition(skillId: string) {
  if (!selectedPositionForSkills.value) return
  
  // Reset the autocomplete
  selectedSkillToAdd.value = null
  
  // Check if already added
  if (positionSkills.value.some(s => s.skill_id === skillId)) {
    showSnackbar('Skill already added', 'warning')
    return
  }
  
  try {
    const skill = skillLibrary.value.find(s => s.id === skillId)
    const { data, error } = await supabase
      .from('position_required_skills')
      .insert({
        position_id: selectedPositionForSkills.value.id,
        skill_id: skillId,
        required_level: 3,
        is_core: true
      })
      .select()
      .single()
    
    if (error) throw error
    
    positionSkills.value.push({
      ...data,
      skill_name: skill?.name,
      category: skill?.category
    })
    
    // Update the position's skill count
    const idx = positions.value.findIndex(p => p.id === selectedPositionForSkills.value.id)
    if (idx !== -1) {
      positions.value[idx].required_skills_count++
    }
    
    showSnackbar('Skill added', 'success')
  } catch (err) {
    console.error('Error adding skill:', err)
    showSnackbar('Failed to add skill', 'error')
  }
}

async function updatePositionSkill(skill: any) {
  try {
    const { error } = await supabase
      .from('position_required_skills')
      .update({
        required_level: skill.required_level,
        is_core: skill.is_core
      })
      .eq('id', skill.id)
    
    if (error) throw error
    showSnackbar('Skill updated', 'success')
  } catch (err) {
    console.error('Error updating skill:', err)
    showSnackbar('Failed to update skill', 'error')
  }
}

async function removeSkillFromPosition(skill: any) {
  try {
    const { error } = await supabase
      .from('position_required_skills')
      .delete()
      .eq('id', skill.id)
    
    if (error) throw error
    
    positionSkills.value = positionSkills.value.filter(s => s.id !== skill.id)
    
    // Update the position's skill count
    const idx = positions.value.findIndex(p => p.id === selectedPositionForSkills.value?.id)
    if (idx !== -1) {
      positions.value[idx].required_skills_count--
    }
    
    showSnackbar('Skill removed', 'info')
  } catch (err) {
    console.error('Error removing skill:', err)
    showSnackbar('Failed to remove skill', 'error')
  }
}

// Computed: Available skills (not yet assigned to position)
const availableSkillsForPosition = computed(() => {
  const assignedIds = new Set(positionSkills.value.map(s => s.skill_id))
  return skillLibrary.value.filter(s => !assignedIds.has(s.id))
})

// Group skills by category for the dropdown
const skillsByCategory = computed(() => {
  const grouped: Record<string, any[]> = {}
  for (const skill of availableSkillsForPosition.value) {
    if (!grouped[skill.category]) {
      grouped[skill.category] = []
    }
    grouped[skill.category].push(skill)
  }
  return grouped
})

async function saveLocation() {
  if (!newLocation.name) return
  
  try {
    if (editingLocation.value) {
      const { error } = await supabase
        .from('locations')
        .update({ 
          name: newLocation.name, 
          address_line1: newLocation.address,
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
      showSnackbar('Location updated', 'success')
    } else {
      const { data, error } = await supabase
        .from('locations')
        .insert({ 
          name: newLocation.name, 
          address_line1: newLocation.address,
          is_active: newLocation.is_active
        })
        .select()
        .single()
      
      if (error) throw error
      
      locations.value.push({
        id: data.id,
        name: data.name,
        address: data.address_line1 || '',
        is_active: data.is_active
      })
      showSnackbar('Location added', 'success')
    }
    
    showAddLocation.value = false
    editingLocation.value = null
    newLocation.name = ''
    newLocation.address = ''
    newLocation.is_active = true
  } catch (err: any) {
    console.error('Error saving location:', err)
    showSnackbar('Failed to save location', 'error')
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
    showSnackbar('Location deleted', 'info')
  } catch (err: any) {
    console.error('Error deleting location:', err)
    showSnackbar('Failed to delete location', 'error')
  }
}

function toggleIntegration(integration: any) {
  if (integration.id === 'slack') {
    navigateTo('/admin/slack')
    return
  }
  showSnackbar(`${integration.name} configuration coming soon`, 'info')
}

function selectEmailTemplate(template: EmailTemplate) {
  selectedEmailTemplate.value = { ...template }
}

async function saveEmailTemplate() {
  if (!selectedEmailTemplate.value) return
  savingEmail.value = true
  
  try {
    const index = emailTemplates.value.findIndex(t => t.id === selectedEmailTemplate.value!.id)
    if (index >= 0) {
      emailTemplates.value[index] = { ...selectedEmailTemplate.value }
    }
    
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
    
    showSnackbar('Email template saved', 'success')
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

function testEmailTemplate() {
  showSnackbar('Test email functionality coming soon', 'info')
}

function copyMigration() {
  navigator.clipboard.writeText(migration.sql)
  showSnackbar('Migration SQL copied to clipboard', 'success')
}

function downloadMigration() {
  if (!migration.name || !migration.sql) {
    showSnackbar('Please enter migration name and SQL', 'warning')
    return
  }
  
  const blob = new Blob([migration.sql], { type: 'text/plain' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${migration.name}.sql`
  link.click()
  
  showSnackbar('Migration file downloaded', 'success')
}

// =====================================================
// LIFECYCLE
// =====================================================
onMounted(async () => {
  // Load health data
  refreshAll()
  
  if (autoRefresh.value) {
    refreshInterval.value = setInterval(() => {
      if (autoRefresh.value && activeTab.value === 'health') {
        refreshAll()
      }
    }, 30000)
  }
  
  // Load settings data
  await Promise.all([
    loadCompanySettings(),
    loadDepartments(),
    loadPositions(),
    loadLocations(),
    loadRoles(),
    loadIntegrations()
  ])
})

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
})
</script>

<template>
  <div class="max-w-7xl mx-auto">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center gap-2">
          <span>🏥</span>
          <span>System Health & Settings</span>
        </h1>
        <p class="text-slate-500 text-sm mt-1">
          Monitor system performance and manage configurations
        </p>
      </div>
      <v-chip color="warning" variant="flat">
        <v-icon start>mdi-shield-crown</v-icon>
        Admin Only
      </v-chip>
    </div>

    <!-- Tab Navigation -->
    <v-tabs v-model="activeTab" color="primary" class="mb-6" show-arrows>
      <v-tab value="health">
        <v-icon start>mdi-heart-pulse</v-icon>
        Health
      </v-tab>
      <v-tab value="company">
        <v-icon start>mdi-domain</v-icon>
        Company
      </v-tab>
      <v-tab value="departments">
        <v-icon start>mdi-sitemap</v-icon>
        Departments
      </v-tab>
      <v-tab value="positions">
        <v-icon start>mdi-account-tie</v-icon>
        Positions
      </v-tab>
      <v-tab value="locations">
        <v-icon start>mdi-map-marker</v-icon>
        Locations
      </v-tab>
      <v-tab value="roles">
        <v-icon start>mdi-shield-account</v-icon>
        Roles
      </v-tab>
      <v-tab value="emails">
        <v-icon start>mdi-email-edit</v-icon>
        Emails
      </v-tab>
      <v-tab value="integrations">
        <v-icon start>mdi-connection</v-icon>
        Integrations
      </v-tab>
      <v-tab value="database">
        <v-icon start>mdi-database-cog</v-icon>
        Database
      </v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <!-- ===== HEALTH TAB ===== -->
      <v-window-item value="health">
        <!-- Refresh Controls -->
        <div class="flex items-center justify-end gap-3 mb-4">
          <span class="text-xs text-slate-400">
            {{ timeSince(lastRefresh) }}
          </span>
          <button 
            @click="refreshAll"
            class="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
            :class="{ 'animate-spin': healthPending || dbHealthPending }"
          >
            <v-icon size="20">mdi-refresh</v-icon>
          </button>
          <label class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input 
              type="checkbox" 
              v-model="autoRefresh"
              class="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
            >
            <span>Auto</span>
          </label>
        </div>

        <!-- Overall Status Banner -->
        <div 
          class="rounded-xl p-4 sm:p-6 mb-6 text-white shadow-lg transition-all"
          :class="statusColor"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-3xl sm:text-4xl">{{ statusIcon }}</span>
              <div>
                <h2 class="text-xl sm:text-2xl font-bold capitalize">
                  {{ overallStatus }}
                </h2>
                <p class="text-white/80 text-sm">
                  <span v-if="health?.uptime">Up {{ formatUptime(health.uptime) }}</span>
                  <span v-else>Checking...</span>
                </p>
              </div>
            </div>
            <div class="text-right text-sm text-white/70">
              <div>{{ health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '-' }}</div>
              <div class="text-xs">v{{ health?.version || '1.0.0' }}</div>
            </div>
          </div>
        </div>

        <!-- Service Checks Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <template v-if="health?.checks">
            <div 
              v-for="check in health.checks" 
              :key="check.name"
              class="bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
            >
              <div class="flex items-start justify-between">
                <div>
                  <h3 class="font-semibold text-slate-800 capitalize flex items-center gap-2">
                    <span v-if="check.status === 'ok'" class="text-green-500">●</span>
                    <span v-else-if="check.status === 'degraded'" class="text-yellow-500">●</span>
                    <span v-else class="text-red-500">●</span>
                    {{ check.name }}
                  </h3>
                  <p v-if="check.message" class="text-xs text-slate-500 mt-1 line-clamp-2">
                    {{ check.message }}
                  </p>
                </div>
                <span 
                  v-if="check.latency !== undefined"
                  class="text-xs px-2 py-1 rounded-full"
                  :class="{
                    'bg-green-100 text-green-700': check.latency < 200,
                    'bg-yellow-100 text-yellow-700': check.latency >= 200 && check.latency < 500,
                    'bg-red-100 text-red-700': check.latency >= 500
                  }"
                >
                  {{ check.latency }}ms
                </span>
              </div>
            </div>
          </template>
          
          <template v-else>
            <div v-for="i in 3" :key="i" class="bg-white rounded-xl p-4 shadow-sm border border-slate-200 animate-pulse">
              <div class="h-4 bg-slate-200 rounded w-24 mb-2"></div>
              <div class="h-3 bg-slate-100 rounded w-16"></div>
            </div>
          </template>
        </div>

        <!-- Database Metrics -->
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <span>📊</span> Database Metrics
          </h2>
          
          <div v-if="dbHealth?.metrics" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-200 text-center">
              <div class="text-2xl sm:text-3xl font-bold text-green-600">
                {{ formatNumber(dbHealth.metrics.active_employees || 0) }}
              </div>
              <div class="text-xs text-slate-500 mt-1">Active Employees</div>
            </div>
            
            <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-200 text-center">
              <div class="text-2xl sm:text-3xl font-bold text-amber-600">
                {{ formatNumber(dbHealth.metrics.pending_time_off || 0) }}
              </div>
              <div class="text-xs text-slate-500 mt-1">Pending Time Off</div>
            </div>
            
            <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-200 text-center">
              <div class="text-2xl sm:text-3xl font-bold text-blue-600">
                {{ formatNumber(dbHealth.metrics.unread_notifications || 0) }}
              </div>
              <div class="text-xs text-slate-500 mt-1">Unread Notifications</div>
            </div>
            
            <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-200 text-center">
              <div class="text-2xl sm:text-3xl font-bold text-purple-600">
                {{ formatNumber(dbHealth.metrics.recent_audit_entries || 0) }}
              </div>
              <div class="text-xs text-slate-500 mt-1">Recent Audits (1hr)</div>
            </div>
          </div>
          
          <div v-else-if="dbHealthPending" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div v-for="i in 4" :key="i" class="bg-white rounded-xl p-4 shadow-sm border border-slate-200 animate-pulse">
              <div class="h-8 bg-slate-200 rounded w-16 mx-auto mb-2"></div>
              <div class="h-3 bg-slate-100 rounded w-20 mx-auto"></div>
            </div>
          </div>
          
          <div v-else class="bg-slate-100 rounded-xl p-6 text-center text-slate-500">
            <p>Database metrics unavailable</p>
            <button @click="fetchDbHealth" class="mt-2 text-sm text-green-600 hover:underline">
              Retry
            </button>
          </div>
        </div>

        <!-- Issues Alert -->
        <div 
          v-if="dbHealth?.issues?.orphaned_profiles > 0"
          class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6"
        >
          <div class="flex items-start gap-3">
            <span class="text-2xl">⚠️</span>
            <div>
              <h3 class="font-semibold text-amber-800">Data Integrity Issue</h3>
              <p class="text-sm text-amber-700 mt-1">
                Found {{ dbHealth.issues.orphaned_profiles }} orphaned profile(s) with no matching auth user.
              </p>
              <NuxtLink 
                to="/admin/users"
                class="inline-block mt-2 text-sm text-amber-800 font-medium hover:underline"
              >
                Review Users →
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- Table Statistics -->
        <details class="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
          <summary class="p-4 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between">
            <span class="font-semibold text-slate-800 flex items-center gap-2">
              <span>🗄️</span> Table Statistics
            </span>
            <v-icon size="20">mdi-chevron-down</v-icon>
          </summary>
          
          <div class="border-t border-slate-100 p-4">
            <div v-if="tableStats.length" class="overflow-x-auto -mx-4 px-4">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-slate-500 border-b">
                    <th class="pb-2 font-medium">Table</th>
                    <th class="pb-2 font-medium text-right">Rows</th>
                    <th class="pb-2 font-medium text-right hidden sm:table-cell">Size</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="table in tableStats" :key="table.table_name" class="hover:bg-slate-50">
                    <td class="py-2 font-mono text-xs">{{ table.table_name }}</td>
                    <td class="py-2 text-right">{{ formatNumber(table.row_count || 0) }}</td>
                    <td class="py-2 text-right hidden sm:table-cell text-slate-500">
                      {{ table.total_size || '-' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div v-else-if="tableStatsPending" class="text-center py-8 text-slate-400">
              Loading table statistics...
            </div>
            
            <div v-else class="text-center py-8 text-slate-400">
              <p>Table statistics not available</p>
            </div>
          </div>
        </details>

        <!-- Quick Actions -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <h3 class="font-semibold text-slate-800 mb-3">Quick Actions</h3>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <NuxtLink 
              to="/admin/users"
              class="flex flex-col items-center gap-2 p-4 rounded-lg bg-slate-50 hover:bg-green-50 hover:text-green-700 transition-colors text-center"
            >
              <span class="text-2xl">👥</span>
              <span class="text-sm font-medium">Users</span>
            </NuxtLink>
            
            <button
              @click="activeTab = 'database'"
              class="flex flex-col items-center gap-2 p-4 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 transition-colors text-center"
            >
              <span class="text-2xl">🗃️</span>
              <span class="text-sm font-medium">Database</span>
            </button>
            
            <NuxtLink 
              to="/admin/slack"
              class="flex flex-col items-center gap-2 p-4 rounded-lg bg-slate-50 hover:bg-purple-50 hover:text-purple-700 transition-colors text-center"
            >
              <span class="text-2xl">💬</span>
              <span class="text-sm font-medium">Slack</span>
            </NuxtLink>
            
            <button 
              @click="refreshAll"
              class="flex flex-col items-center gap-2 p-4 rounded-lg bg-slate-50 hover:bg-amber-50 hover:text-amber-700 transition-colors text-center"
            >
              <span class="text-2xl">🔄</span>
              <span class="text-sm font-medium">Refresh All</span>
            </button>
          </div>
        </div>

        <!-- Compliance Alerts Widget -->
        <div class="mt-6">
          <DashboardComplianceAlertsWidget :max-items="5" />
        </div>
      </v-window-item>

      <!-- ===== COMPANY TAB ===== -->
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

      <!-- ===== DEPARTMENTS TAB ===== -->
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
              <v-btn icon="mdi-pencil" size="small" variant="text" aria-label="Edit department" @click="editDepartment(item)" />
              <v-btn icon="mdi-delete" size="small" variant="text" color="error" aria-label="Delete department" @click="deleteDepartment(item)" />
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>

      <!-- ===== POSITIONS TAB ===== -->
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
            <template #item.department_name="{ item }">
              <v-chip size="small" variant="outlined">{{ item.department_name || 'None' }}</v-chip>
            </template>
            <template #item.required_skills_count="{ item }">
              <v-chip 
                size="small" 
                :color="item.required_skills_count > 0 ? 'success' : 'grey'" 
                variant="tonal"
                class="cursor-pointer"
                @click="openPositionSkillsDialog(item)"
              >
                {{ item.required_skills_count || 0 }} skills
              </v-chip>
            </template>
            <template #item.actions="{ item }">
              <v-btn 
                icon="mdi-school" 
                size="small" 
                variant="text" 
                color="primary"
                title="Manage Required Skills"
                aria-label="Manage required skills"
                @click="openPositionSkillsDialog(item)" 
              />
              <v-btn icon="mdi-pencil" size="small" variant="text" aria-label="Edit position" @click="editPosition(item)" />
              <v-btn icon="mdi-delete" size="small" variant="text" color="error" aria-label="Delete position" @click="deletePosition(item)" />
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>

      <!-- ===== LOCATIONS TAB ===== -->
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
              <v-btn icon="mdi-pencil" size="small" variant="text" aria-label="Edit location" @click="editLocation(item)" />
              <v-btn icon="mdi-delete" size="small" variant="text" color="error" aria-label="Delete location" @click="deleteLocation(item)" />
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>

      <!-- ===== ROLES TAB ===== -->
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

      <!-- ===== EMAILS TAB ===== -->
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
                  Configure email templates for automated communications.
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
                  hint="HTML supported. Variables: {{name}}, {{first_name}}, {{email}}, {{date}}, {{program}}, {{location}}, {{link}}"
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

      <!-- ===== INTEGRATIONS TAB ===== -->
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

      <!-- ===== DATABASE TAB ===== -->
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

    <!-- ===== DIALOGS ===== -->
    
    <!-- Add Department Dialog -->
    <v-dialog v-model="showAddDepartment" max-width="400">
      <v-card>
        <v-card-title>{{ editingDepartment ? 'Edit Department' : 'Add Department' }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newDepartment.name"
            label="Department Name"
            variant="outlined"
            class="mb-3"
          />
          <v-text-field
            v-model="newDepartment.code"
            label="Department Code"
            variant="outlined"
            hint="Optional short code for the department"
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
            clearable
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

    <!-- Position Skills Management Dialog -->
    <v-dialog v-model="showPositionSkillsDialog" max-width="700" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start color="primary">mdi-school</v-icon>
          Required Skills: {{ selectedPositionForSkills?.title }}
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" aria-label="Close" @click="closePositionSkillsDialog" />
        </v-card-title>
        <v-divider />
        
        <v-card-text style="max-height: 500px;">
          <!-- Add Skills Section -->
          <div class="mb-6">
            <div class="text-subtitle-2 font-weight-bold mb-2">Add Required Skill</div>
            <v-autocomplete
              v-model="selectedSkillToAdd"
              :items="availableSkillsForPosition"
              item-title="name"
              item-value="id"
              label="Search skills..."
              variant="outlined"
              density="compact"
              :loading="loadingSkillLibrary"
              clearable
              hide-details
              class="mb-2"
              @update:model-value="(val) => val && addSkillToPosition(val)"
            >
              <template #item="{ item, props }">
                <v-list-item v-bind="props">
                  <template #append>
                    <v-chip size="x-small" variant="tonal">{{ item.raw.category }}</v-chip>
                  </template>
                </v-list-item>
              </template>
            </v-autocomplete>
          </div>
          
          <v-divider class="mb-4" />
          
          <!-- Current Skills List -->
          <div v-if="loadingPositionSkills" class="text-center py-8">
            <v-progress-circular indeterminate color="primary" />
          </div>
          
          <div v-else-if="positionSkills.length === 0" class="text-center py-8">
            <v-icon size="48" color="grey-lighten-1">mdi-school-outline</v-icon>
            <p class="text-grey mt-2">No skills assigned to this position yet</p>
            <p class="text-caption text-grey">Use the search above to add required skills</p>
          </div>
          
          <div v-else>
            <div class="text-subtitle-2 font-weight-bold mb-3">
              Assigned Skills ({{ positionSkills.length }})
            </div>
            <v-list density="compact" class="pa-0">
              <v-list-item
                v-for="skill in positionSkills"
                :key="skill.id"
                class="px-0"
              >
                <template #prepend>
                  <v-chip 
                    size="small" 
                    :color="skill.is_core ? 'error' : 'grey'" 
                    variant="tonal"
                    class="mr-2"
                    style="min-width: 50px;"
                    @click="skill.is_core = !skill.is_core; updatePositionSkill(skill)"
                  >
                    {{ skill.is_core ? 'Core' : 'Nice' }}
                  </v-chip>
                </template>
                
                <v-list-item-title>
                  {{ skill.skill_name }}
                  <span class="text-caption text-grey ml-2">({{ skill.category }})</span>
                </v-list-item-title>
                
                <template #append>
                  <div class="d-flex align-center gap-2">
                    <div style="width: 120px;">
                      <v-select
                        v-model="skill.required_level"
                        :items="[1, 2, 3, 4, 5]"
                        density="compact"
                        variant="outlined"
                        hide-details
                        :label="`Level ${skill.required_level}`"
                        @update:model-value="updatePositionSkill(skill)"
                      >
                        <template #item="{ item, props }">
                          <v-list-item v-bind="props">
                            <template #prepend>
                              <v-rating :model-value="item.value" readonly density="compact" size="14" />
                            </template>
                          </v-list-item>
                        </template>
                      </v-select>
                    </div>
                    <v-btn
                      icon="mdi-delete"
                      size="small"
                      variant="text"
                      color="error"
                      @click="removeSkillFromPosition(skill)"
                    />
                  </div>
                </template>
              </v-list-item>
            </v-list>
          </div>
        </v-card-text>
        
        <v-divider />
        <v-card-actions>
          <v-chip size="small" variant="tonal" color="info">
            <v-icon start size="14">mdi-information</v-icon>
            Core = required, Nice = nice-to-have
          </v-chip>
          <v-spacer />
          <v-btn color="primary" variant="flat" @click="closePositionSkillsDialog">
            Done
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<style scoped>
/* Ensure touch targets are at least 44x44px on mobile */
button, a, summary {
  min-height: 44px;
}

/* Improve tap feedback */
button:active, a:active {
  transform: scale(0.98);
}

/* Line clamp for mobile text truncation */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Details marker styling */
details summary::-webkit-details-marker {
  display: none;
}

details[open] summary .v-icon {
  transform: rotate(180deg);
}
</style>
