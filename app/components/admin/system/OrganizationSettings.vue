<script setup lang="ts">
/**
 * Organization Settings
 * Manages Company Info, Departments, Positions (with skills), and Locations.
 * All changes persist to Supabase in real-time.
 */

const supabase = useSupabaseClient()
const toast = useToast()

const activeSection = ref('company')

// =====================================================
// COMPANY SETTINGS
// =====================================================
const company = reactive({
  id: null as string | null,
  name: '',
  legal_name: '',
  website: '',
  email: '',
  phone: '',
  address: '',
  timezone: 'America/Los_Angeles',
  logo: '' as string | null
})
const loadingCompany = ref(true)
const savingCompany = ref(false)
const logoInput = ref<HTMLInputElement | null>(null)
const uploadingLogo = ref(false)

const timezoneOptions = [
  'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Phoenix', 'Pacific/Honolulu',
  'America/Anchorage'
]

async function loadCompanySettings() {
  loadingCompany.value = true
  try {
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1)
      .maybeSingle()
    if (!error && data) {
      company.id = data.id
      company.name = data.display_name || data.company_name || ''
      company.legal_name = data.legal_name || ''
      company.website = data.website || ''
      company.email = data.contact_email || ''
      company.phone = data.phone || ''
      company.address = data.address || ''
      company.timezone = data.timezone || 'America/Los_Angeles'
      company.logo = data.logo_url || null
    }
  } catch (err) {
    console.error('Error loading company settings:', err)
  } finally {
    loadingCompany.value = false
  }
}

async function saveCompany() {
  savingCompany.value = true
  try {
    const payload = {
      display_name: company.name,
      company_name: company.name,
      legal_name: company.legal_name,
      website: company.website,
      contact_email: company.email,
      phone: company.phone,
      address: company.address,
      timezone: company.timezone,
      logo_url: company.logo,
      updated_at: new Date().toISOString()
    }
    if (company.id) {
      const { error } = await supabase.from('company_settings').update(payload).eq('id', company.id)
      if (error) throw error
    } else {
      const { data, error } = await supabase.from('company_settings').insert(payload).select().single()
      if (error) throw error
      company.id = data.id
    }
    toast.success('Company settings saved')
  } catch (err) {
    toast.error('Failed to save company settings')
  } finally {
    savingCompany.value = false
  }
}

function triggerLogoUpload() { logoInput.value?.click() }

async function handleLogoUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) { toast.error('Please upload a PNG or JPG'); return }
  if (file.size > 2 * 1024 * 1024) { toast.error('Image must be < 2MB'); return }
  uploadingLogo.value = true
  try {
    const fileName = `company-logo-${Date.now()}.${file.name.split('.').pop()}`
    const { error: uploadError } = await supabase.storage.from('company-assets').upload(`logos/${fileName}`, file, { upsert: true })
    if (uploadError) throw uploadError
    const { data: urlData } = supabase.storage.from('company-assets').getPublicUrl(`logos/${fileName}`)
    company.logo = urlData.publicUrl
    if (company.id) {
      await supabase.from('company_settings').update({ logo_url: urlData.publicUrl, updated_at: new Date().toISOString() }).eq('id', company.id)
    }
    toast.success('Logo uploaded')
  } catch { toast.error('Failed to upload logo') }
  finally { uploadingLogo.value = false; if (event.target) (event.target as HTMLInputElement).value = '' }
}

async function removeLogo() {
  if (!company.id) return
  try {
    await supabase.from('company_settings').update({ logo_url: null, updated_at: new Date().toISOString() }).eq('id', company.id)
    company.logo = null
    toast.success('Logo removed')
  } catch { toast.error('Failed to remove logo') }
}

// =====================================================
// DEPARTMENTS
// =====================================================
const departments = ref<any[]>([])
const loadingDepartments = ref(false)
const showDeptDialog = ref(false)
const editingDept = ref<any>(null)
const deptForm = reactive({ name: '', code: '' })

const departmentHeaders = [
  { title: 'Name', key: 'name' },
  { title: 'Code', key: 'code' },
  { title: 'Active Employees', key: 'employee_count' },
  { title: 'Actions', key: 'actions', sortable: false }
]

async function loadDepartments() {
  loadingDepartments.value = true
  try {
    // Load departments with employee counts
    const { data, error } = await supabase
      .from('departments')
      .select('id, name, code, is_active')
      .eq('is_active', true)
      .order('name')
    if (error) throw error

    // Get employee counts per department  
    const { data: empCounts } = await supabase
      .from('employees')
      .select('department_id')
      .eq('employment_status', 'active')

    const countMap: Record<string, number> = {}
    if (empCounts) {
      empCounts.forEach((e: any) => {
        if (e.department_id) countMap[e.department_id] = (countMap[e.department_id] || 0) + 1
      })
    }

    departments.value = (data || []).map(d => ({
      id: d.id,
      name: d.name,
      code: d.code || '',
      employee_count: countMap[d.id] || 0
    }))
  } catch (err) { console.error('Error loading departments:', err) }
  finally { loadingDepartments.value = false }
}

function openDeptDialog(dept?: any) {
  editingDept.value = dept || null
  deptForm.name = dept?.name || ''
  deptForm.code = dept?.code || ''
  showDeptDialog.value = true
}

async function saveDepartment() {
  if (!deptForm.name) { toast.error('Name is required'); return }
  try {
    if (editingDept.value) {
      const { error } = await supabase.from('departments').update({ name: deptForm.name, code: deptForm.code || null }).eq('id', editingDept.value.id)
      if (error) throw error
      toast.success('Department updated')
    } else {
      const { error } = await supabase.from('departments').insert({ name: deptForm.name, code: deptForm.code || null }).select().single()
      if (error) throw error
      toast.success('Department added')
    }
    showDeptDialog.value = false
    await loadDepartments()
  } catch { toast.error('Failed to save department') }
}

async function deleteDepartment(dept: any) {
  if (dept.employee_count > 0) { toast.error(`Cannot delete: ${dept.employee_count} employees assigned`); return }
  try {
    const { error } = await supabase.from('departments').delete().eq('id', dept.id)
    if (error) throw error
    departments.value = departments.value.filter(d => d.id !== dept.id)
    toast.success('Department deleted')
  } catch { toast.error('Failed to delete department') }
}

// =====================================================
// POSITIONS
// =====================================================
const positions = ref<any[]>([])
const loadingPositions = ref(false)
const showPosDialog = ref(false)
const editingPos = ref<any>(null)
const posForm = reactive({ title: '', department_id: '', level: 'Mid' as string })

// Position skills
const showSkillsDialog = ref(false)
const selectedPosition = ref<any>(null)
const positionSkills = ref<any[]>([])
const skillLibrary = ref<any[]>([])
const loadingSkills = ref(false)
const selectedSkillToAdd = ref<string | null>(null)

const positionHeaders = [
  { title: 'Title', key: 'title' },
  { title: 'Department', key: 'department_name' },
  { title: 'Level', key: 'level' },
  { title: 'Employees', key: 'employee_count' },
  { title: 'Required Skills', key: 'required_skills_count' },
  { title: 'Actions', key: 'actions', sortable: false }
]

async function loadPositions() {
  loadingPositions.value = true
  try {
    const { data, error } = await supabase
      .from('job_positions')
      .select('id, title, code, department_id, is_manager, department:departments(id, name), position_required_skills(count)')
      .order('title')
    if (error) throw error

    // Get employee counts per position
    const { data: empCounts } = await supabase
      .from('employees')
      .select('position_id')
      .eq('employment_status', 'active')

    const countMap: Record<string, number> = {}
    if (empCounts) {
      empCounts.forEach((e: any) => {
        if (e.position_id) countMap[e.position_id] = (countMap[e.position_id] || 0) + 1
      })
    }

    positions.value = (data || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      code: p.code,
      department_id: p.department_id || null,
      department_name: p.department?.name || '',
      level: p.is_manager ? 'Manager' : 'Staff',
      employee_count: countMap[p.id] || 0,
      required_skills_count: p.position_required_skills?.[0]?.count || 0
    }))
  } catch (err) { console.error('Error loading positions:', err) }
  finally { loadingPositions.value = false }
}

function openPosDialog(pos?: any) {
  editingPos.value = pos || null
  posForm.title = pos?.title || ''
  posForm.department_id = pos?.department_id || ''
  posForm.level = pos?.level || 'Mid'
  showPosDialog.value = true
}

async function savePosition() {
  if (!posForm.title) { toast.error('Title is required'); return }
  try {
    const payload = {
      title: posForm.title,
      department_id: posForm.department_id || null,
      is_manager: posForm.level === 'Manager'
    }
    if (editingPos.value) {
      const { error } = await supabase.from('job_positions').update(payload).eq('id', editingPos.value.id)
      if (error) throw error
      toast.success('Position updated')
    } else {
      const { error } = await supabase.from('job_positions').insert(payload).select().single()
      if (error) throw error
      toast.success('Position added')
    }
    showPosDialog.value = false
    await loadPositions()
  } catch { toast.error('Failed to save position') }
}

async function deletePosition(pos: any) {
  if (pos.employee_count > 0) { toast.error(`Cannot delete: ${pos.employee_count} employees assigned`); return }
  try {
    const { error } = await supabase.from('job_positions').delete().eq('id', pos.id)
    if (error) throw error
    positions.value = positions.value.filter(p => p.id !== pos.id)
    toast.success('Position deleted')
  } catch { toast.error('Failed to delete position') }
}

// Position Skills Management
async function openSkillsDialog(position: any) {
  selectedPosition.value = position
  showSkillsDialog.value = true
  loadingSkills.value = true
  try {
    const [skillRes, posSkillRes] = await Promise.all([
      supabase.from('skill_library').select('id, name, category, description').eq('is_active', true).order('category').order('name'),
      supabase.from('position_required_skills').select('id, skill_id, required_level, is_core, skill:skill_library(id, name, category)').eq('position_id', position.id).order('is_core', { ascending: false })
    ])
    skillLibrary.value = skillRes.data || []
    positionSkills.value = (posSkillRes.data || []).map((s: any) => ({
      ...s, skill_name: s.skill?.name, category: s.skill?.category
    }))
  } catch (err) { console.error('Error loading skills:', err) }
  finally { loadingSkills.value = false }
}

const availableSkills = computed(() => {
  const assignedIds = new Set(positionSkills.value.map(s => s.skill_id))
  return skillLibrary.value.filter(s => !assignedIds.has(s.id))
})

async function addSkillToPosition(skillId: string) {
  selectedSkillToAdd.value = null
  if (positionSkills.value.some(s => s.skill_id === skillId)) return
  try {
    const skill = skillLibrary.value.find(s => s.id === skillId)
    const { data, error } = await supabase.from('position_required_skills')
      .insert({ position_id: selectedPosition.value.id, skill_id: skillId, required_level: 3, is_core: true })
      .select().single()
    if (error) throw error
    positionSkills.value.push({ ...data, skill_name: skill?.name, category: skill?.category })
    const posIdx = positions.value.findIndex(p => p.id === selectedPosition.value.id)
    if (posIdx !== -1) positions.value[posIdx].required_skills_count++
    toast.success('Skill added')
  } catch { toast.error('Failed to add skill') }
}

async function updatePositionSkill(skill: any) {
  try {
    const { error } = await supabase.from('position_required_skills')
      .update({ required_level: skill.required_level, is_core: skill.is_core }).eq('id', skill.id)
    if (error) throw error
  } catch { toast.error('Failed to update skill') }
}

async function removeSkillFromPosition(skill: any) {
  try {
    const { error } = await supabase.from('position_required_skills').delete().eq('id', skill.id)
    if (error) throw error
    positionSkills.value = positionSkills.value.filter(s => s.id !== skill.id)
    const posIdx = positions.value.findIndex(p => p.id === selectedPosition.value?.id)
    if (posIdx !== -1) positions.value[posIdx].required_skills_count--
    toast.info('Skill removed')
  } catch { toast.error('Failed to remove skill') }
}

// =====================================================
// LOCATIONS
// =====================================================
const locations = ref<any[]>([])
const loadingLocations = ref(false)
const showLocDialog = ref(false)
const editingLoc = ref<any>(null)
const locForm = reactive({ name: '', address: '', is_active: true })

const locationHeaders = [
  { title: 'Name', key: 'name' },
  { title: 'Address', key: 'address' },
  { title: 'Employees', key: 'employee_count' },
  { title: 'Status', key: 'is_active' },
  { title: 'Actions', key: 'actions', sortable: false }
]

async function loadLocations() {
  loadingLocations.value = true
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('id, name, code, address_line1, address_line2, city, state, postal_code, phone, is_active')
      .order('name')
    if (error) throw error

    // Get employee counts per location
    const { data: empCounts } = await supabase
      .from('employees')
      .select('primary_location_id')
      .eq('employment_status', 'active')

    const countMap: Record<string, number> = {}
    if (empCounts) {
      empCounts.forEach((e: any) => {
        if (e.primary_location_id) countMap[e.primary_location_id] = (countMap[e.primary_location_id] || 0) + 1
      })
    }

    locations.value = (data || []).map((loc: any) => ({
      id: loc.id,
      name: loc.name,
      address: [loc.address_line1, loc.city, loc.state, loc.postal_code].filter(Boolean).join(', ') || 'No address',
      phone: loc.phone,
      is_active: loc.is_active,
      employee_count: countMap[loc.id] || 0
    }))
  } catch (err) { console.error('Error loading locations:', err) }
  finally { loadingLocations.value = false }
}

function openLocDialog(loc?: any) {
  editingLoc.value = loc || null
  locForm.name = loc?.name || ''
  locForm.address = loc?.address || ''
  locForm.is_active = loc?.is_active ?? true
  showLocDialog.value = true
}

async function saveLocation() {
  if (!locForm.name) { toast.error('Name is required'); return }
  try {
    const payload = { name: locForm.name, address_line1: locForm.address, is_active: locForm.is_active }
    if (editingLoc.value) {
      const { error } = await supabase.from('locations').update(payload).eq('id', editingLoc.value.id)
      if (error) throw error
      toast.success('Location updated')
    } else {
      const { error } = await supabase.from('locations').insert(payload).select().single()
      if (error) throw error
      toast.success('Location added')
    }
    showLocDialog.value = false
    await loadLocations()
  } catch { toast.error('Failed to save location') }
}

async function deleteLocation(loc: any) {
  if (loc.employee_count > 0) { toast.error(`Cannot delete: ${loc.employee_count} employees assigned`); return }
  try {
    const { error } = await supabase.from('locations').delete().eq('id', loc.id)
    if (error) throw error
    locations.value = locations.value.filter(l => l.id !== loc.id)
    toast.success('Location deleted')
  } catch { toast.error('Failed to delete location') }
}

// =====================================================
// LIFECYCLE
// =====================================================
onMounted(async () => {
  await Promise.all([
    loadCompanySettings(),
    loadDepartments(),
    loadPositions(),
    loadLocations()
  ])
})
</script>

<template>
  <div>
    <!-- Section Navigation -->
    <div class="flex flex-wrap gap-2 mb-6">
      <v-btn
        v-for="s in [
          { key: 'company', icon: 'mdi-domain', label: 'Company' },
          { key: 'departments', icon: 'mdi-sitemap', label: 'Departments' },
          { key: 'positions', icon: 'mdi-account-tie', label: 'Positions' },
          { key: 'locations', icon: 'mdi-map-marker', label: 'Locations' }
        ]"
        :key="s.key"
        :variant="activeSection === s.key ? 'flat' : 'outlined'"
        :color="activeSection === s.key ? 'primary' : undefined"
        size="small"
        :prepend-icon="s.icon"
        @click="activeSection = s.key"
      >
        {{ s.label }}
      </v-btn>
    </div>

    <!-- ===== COMPANY ===== -->
    <div v-show="activeSection === 'company'">
      <v-skeleton-loader v-if="loadingCompany" type="card" />
      <v-row v-else>
        <v-col cols="12" md="8">
          <v-card rounded="lg">
            <v-card-title>Company Information</v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field v-model="company.name" label="Display Name" variant="outlined" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="company.legal_name" label="Legal Name" variant="outlined" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="company.website" label="Website" variant="outlined" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="company.email" label="Contact Email" type="email" variant="outlined" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="company.phone" label="Phone" variant="outlined" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select v-model="company.timezone" :items="timezoneOptions" label="Timezone" variant="outlined" />
                </v-col>
                <v-col cols="12">
                  <v-textarea v-model="company.address" label="Address" variant="outlined" rows="2" />
                </v-col>
              </v-row>
            </v-card-text>
            <v-card-actions class="pa-4">
              <v-spacer />
              <v-btn color="primary" :loading="savingCompany" @click="saveCompany">Save Changes</v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
        <v-col cols="12" md="4">
          <v-card rounded="lg">
            <v-card-title>Branding</v-card-title>
            <v-card-text class="text-center">
              <v-avatar size="100" color="grey-lighten-2" class="mb-4" rounded="lg">
                <v-img v-if="company.logo" :src="company.logo" cover />
                <v-icon v-else size="48">mdi-image</v-icon>
              </v-avatar>
              <div class="d-flex justify-center gap-2">
                <v-btn variant="outlined" size="small" :loading="uploadingLogo" @click="triggerLogoUpload">Upload Logo</v-btn>
                <v-btn v-if="company.logo" icon="mdi-delete" size="small" variant="text" color="error" @click="removeLogo" />
              </div>
              <input ref="logoInput" type="file" accept="image/png,image/jpeg" hidden @change="handleLogoUpload" />
              <p class="text-caption text-grey mt-2">PNG or JPG, max 2MB</p>
            </v-card-text>
          </v-card>

          <!-- Org Summary -->
          <v-card rounded="lg" class="mt-4">
            <v-card-title>Organization Summary</v-card-title>
            <v-card-text>
              <v-list density="compact">
                <v-list-item>
                  <template #prepend><v-icon color="blue">mdi-sitemap</v-icon></template>
                  <v-list-item-title>{{ departments.length }} Departments</v-list-item-title>
                </v-list-item>
                <v-list-item>
                  <template #prepend><v-icon color="green">mdi-account-tie</v-icon></template>
                  <v-list-item-title>{{ positions.length }} Positions</v-list-item-title>
                </v-list-item>
                <v-list-item>
                  <template #prepend><v-icon color="purple">mdi-map-marker</v-icon></template>
                  <v-list-item-title>{{ locations.filter(l => l.is_active).length }} Active Locations</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- ===== DEPARTMENTS ===== -->
    <div v-show="activeSection === 'departments'">
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Departments</span>
          <v-btn color="primary" prepend-icon="mdi-plus" size="small" @click="openDeptDialog()">Add Department</v-btn>
        </v-card-title>
        <v-data-table :headers="departmentHeaders" :items="departments" :loading="loadingDepartments">
          <template #item.employee_count="{ item }">
            <v-chip size="small" :color="item.employee_count > 0 ? 'primary' : 'grey'" variant="tonal">
              {{ item.employee_count }} employees
            </v-chip>
          </template>
          <template #item.actions="{ item }">
            <v-btn icon="mdi-pencil" size="small" variant="text" @click="openDeptDialog(item)" />
            <v-btn icon="mdi-delete" size="small" variant="text" color="error" :disabled="item.employee_count > 0" @click="deleteDepartment(item)" />
          </template>
        </v-data-table>
      </v-card>
    </div>

    <!-- ===== POSITIONS ===== -->
    <div v-show="activeSection === 'positions'">
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Positions</span>
          <v-btn color="primary" prepend-icon="mdi-plus" size="small" @click="openPosDialog()">Add Position</v-btn>
        </v-card-title>
        <v-data-table :headers="positionHeaders" :items="positions" :loading="loadingPositions">
          <template #item.department_name="{ item }">
            <v-chip size="small" variant="outlined">{{ item.department_name || 'Unassigned' }}</v-chip>
          </template>
          <template #item.employee_count="{ item }">
            <v-chip size="small" :color="item.employee_count > 0 ? 'primary' : 'grey'" variant="tonal">
              {{ item.employee_count }}
            </v-chip>
          </template>
          <template #item.required_skills_count="{ item }">
            <v-chip
              size="small"
              :color="item.required_skills_count > 0 ? 'success' : 'grey'"
              variant="tonal"
              class="cursor-pointer"
              @click="openSkillsDialog(item)"
            >
              {{ item.required_skills_count || 0 }} skills
            </v-chip>
          </template>
          <template #item.actions="{ item }">
            <v-btn icon="mdi-school" size="small" variant="text" color="primary" title="Manage Skills" @click="openSkillsDialog(item)" />
            <v-btn icon="mdi-pencil" size="small" variant="text" @click="openPosDialog(item)" />
            <v-btn icon="mdi-delete" size="small" variant="text" color="error" :disabled="item.employee_count > 0" @click="deletePosition(item)" />
          </template>
        </v-data-table>
      </v-card>
    </div>

    <!-- ===== LOCATIONS ===== -->
    <div v-show="activeSection === 'locations'">
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Locations</span>
          <v-btn color="primary" prepend-icon="mdi-plus" size="small" @click="openLocDialog()">Add Location</v-btn>
        </v-card-title>
        <v-data-table :headers="locationHeaders" :items="locations" :loading="loadingLocations">
          <template #item.employee_count="{ item }">
            <v-chip size="small" :color="item.employee_count > 0 ? 'primary' : 'grey'" variant="tonal">
              {{ item.employee_count }}
            </v-chip>
          </template>
          <template #item.is_active="{ item }">
            <v-chip :color="item.is_active ? 'success' : 'grey'" size="small" variant="flat">
              {{ item.is_active ? 'Active' : 'Inactive' }}
            </v-chip>
          </template>
          <template #item.actions="{ item }">
            <v-btn icon="mdi-pencil" size="small" variant="text" @click="openLocDialog(item)" />
            <v-btn icon="mdi-delete" size="small" variant="text" color="error" :disabled="item.employee_count > 0" @click="deleteLocation(item)" />
          </template>
        </v-data-table>
      </v-card>
    </div>

    <!-- ===== DIALOGS ===== -->
    
    <!-- Department Dialog -->
    <v-dialog v-model="showDeptDialog" max-width="420">
      <v-card>
        <v-card-title>{{ editingDept ? 'Edit Department' : 'Add Department' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="deptForm.name" label="Department Name" variant="outlined" class="mb-3" />
          <v-text-field v-model="deptForm.code" label="Code (optional)" variant="outlined" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDeptDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveDepartment">{{ editingDept ? 'Save' : 'Add' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Position Dialog -->
    <v-dialog v-model="showPosDialog" max-width="420">
      <v-card>
        <v-card-title>{{ editingPos ? 'Edit Position' : 'Add Position' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="posForm.title" label="Position Title" variant="outlined" class="mb-3" />
          <v-select v-model="posForm.department_id" :items="departments" item-title="name" item-value="id" label="Department" variant="outlined" class="mb-3" clearable />
          <v-select v-model="posForm.level" :items="['Entry', 'Mid', 'Senior', 'Lead', 'Manager']" label="Level" variant="outlined" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showPosDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="savePosition">{{ editingPos ? 'Save' : 'Add' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Location Dialog -->
    <v-dialog v-model="showLocDialog" max-width="420">
      <v-card>
        <v-card-title>{{ editingLoc ? 'Edit Location' : 'Add Location' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="locForm.name" label="Location Name" variant="outlined" class="mb-3" />
          <v-textarea v-model="locForm.address" label="Address" variant="outlined" rows="2" class="mb-3" />
          <v-switch v-model="locForm.is_active" label="Active" color="success" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showLocDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveLocation">{{ editingLoc ? 'Save' : 'Add' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Position Skills Dialog -->
    <v-dialog v-model="showSkillsDialog" max-width="700" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start color="primary">mdi-school</v-icon>
          Required Skills: {{ selectedPosition?.title }}
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" @click="showSkillsDialog = false" />
        </v-card-title>
        <v-divider />
        <v-card-text style="max-height: 500px;">
          <div class="mb-4">
            <div class="text-subtitle-2 font-weight-bold mb-2">Add Skill</div>
            <v-autocomplete
              v-model="selectedSkillToAdd"
              :items="availableSkills"
              item-title="name"
              item-value="id"
              label="Search skills..."
              variant="outlined"
              density="compact"
              :loading="loadingSkills"
              clearable
              hide-details
              @update:model-value="(val: string | null) => val && addSkillToPosition(val)"
            >
              <template #item="{ item, props: p }">
                <v-list-item v-bind="p">
                  <template #append>
                    <v-chip size="x-small" variant="tonal">{{ item.raw.category }}</v-chip>
                  </template>
                </v-list-item>
              </template>
            </v-autocomplete>
          </div>
          <v-divider class="mb-4" />
          <div v-if="loadingSkills" class="text-center py-8">
            <v-progress-circular indeterminate color="primary" />
          </div>
          <div v-else-if="positionSkills.length === 0" class="text-center py-8 text-grey">
            <v-icon size="48" color="grey-lighten-1">mdi-school-outline</v-icon>
            <p class="mt-2">No skills assigned yet</p>
          </div>
          <v-list v-else density="compact" class="pa-0">
            <v-list-item v-for="skill in positionSkills" :key="skill.id" class="px-0">
              <template #prepend>
                <v-chip
                  size="small"
                  :color="skill.is_core ? 'error' : 'grey'"
                  variant="tonal"
                  class="mr-2"
                  @click="skill.is_core = !skill.is_core; updatePositionSkill(skill)"
                >{{ skill.is_core ? 'Core' : 'Nice' }}</v-chip>
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
                    />
                  </div>
                  <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="removeSkillFromPosition(skill)" />
                </div>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-chip size="small" variant="tonal" color="info">Core = required, Nice = nice-to-have</v-chip>
          <v-spacer />
          <v-btn color="primary" variant="flat" @click="showSkillsDialog = false">Done</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
