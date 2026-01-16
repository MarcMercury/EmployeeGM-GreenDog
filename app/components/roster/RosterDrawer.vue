<template>
  <v-navigation-drawer
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    location="right"
    width="480"
    temporary
    class="roster-drawer"
  >
    <template v-if="employee">
      <!-- Drawer Header -->
      <div class="drawer-header" :style="headerStyle">
        <!-- Top Actions -->
        <div class="drawer-header__actions">
          <v-btn 
            icon="mdi-close" 
            variant="text" 
            size="small"
            @click="$emit('update:modelValue', false)"
          />
          <div class="d-flex gap-1">
            <v-btn 
              icon="mdi-open-in-new" 
              variant="text" 
              size="small"
              :to="`/roster/${employee.id}`"
            />
            <v-btn 
              v-if="isAdmin"
              icon="mdi-pencil" 
              variant="text" 
              size="small"
              @click="$emit('edit', employee)"
            />
          </div>
        </div>
        
        <!-- Profile Section -->
        <div class="drawer-header__profile">
          <div class="profile-avatar-wrap">
            <v-avatar 
              size="100" 
              class="profile-avatar"
              :color="employee.avatar_url ? undefined : 'white'"
            >
              <v-img v-if="employee.avatar_url" :src="employee.avatar_url" />
              <span v-else class="text-h3 font-weight-bold" :style="{ color: departmentColor }">
                {{ initials }}
              </span>
            </v-avatar>
            
            <!-- Level Badge -->
            <div class="profile-level">
              <span class="level-number">{{ employee.player_level || 75 }}</span>
            </div>
          </div>
          
          <h2 class="profile-name">{{ displayName }}</h2>
          <p class="profile-title">{{ employee.position?.title || 'Team Member' }}</p>
          
          <!-- Status Chips -->
          <div class="d-flex justify-center gap-2 mt-2">
            <v-chip 
              :color="statusChipColor" 
              size="small"
              variant="elevated"
            >
              {{ statusText }}
            </v-chip>
            <v-chip 
              v-if="employee.role === 'super_admin'" 
              color="amber" 
              size="small"
              variant="elevated"
            >
              <v-icon size="14" start>mdi-shield-crown</v-icon>
              Super Admin
            </v-chip>
            <v-chip 
              v-else-if="employee.role === 'admin'" 
              color="purple" 
              size="small"
              variant="elevated"
            >
              <v-icon size="14" start>mdi-shield-crown</v-icon>
              Admin
            </v-chip>
          </div>
        </div>
      </div>
      
      <!-- Tabs -->
      <v-tabs v-model="activeTab" color="primary" grow class="drawer-tabs">
        <v-tab value="overview">
          <v-icon start size="18">mdi-card-account-details</v-icon>
          Overview
        </v-tab>
        <v-tab value="skills">
          <v-icon start size="18">mdi-star-circle</v-icon>
          Skills
        </v-tab>
        <v-tab value="operations">
          <v-icon start size="18">mdi-calendar-clock</v-icon>
          Ops
        </v-tab>
      </v-tabs>
      
      <v-divider />
      
      <!-- Tab Content -->
      <v-window v-model="activeTab" class="drawer-content">
        <!-- Tab A: Overview (Back of Baseball Card) -->
        <v-window-item value="overview">
          <div class="pa-4">
            <!-- Bio Section -->
            <div v-if="employee.bio" class="section mb-4">
              <h4 class="section-title">
                <v-icon size="18" class="mr-2">mdi-text-account</v-icon>
                About
              </h4>
              <p class="text-body-2 text-grey-darken-2">{{ employee.bio }}</p>
            </div>
            
            <!-- Vitals Section -->
            <div class="section mb-4">
              <h4 class="section-title">
                <v-icon size="18" class="mr-2">mdi-card-account-details</v-icon>
                Vitals
              </h4>
              <v-list density="compact" class="bg-transparent">
                <v-list-item>
                  <template #prepend>
                    <v-icon color="primary" size="20">mdi-calendar-star</v-icon>
                  </template>
                  <v-list-item-title class="text-body-2">Hire Date</v-list-item-title>
                  <v-list-item-subtitle>{{ formatDate(employee.hire_date) }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <template #prepend>
                    <v-icon color="primary" size="20">mdi-email-outline</v-icon>
                  </template>
                  <v-list-item-title class="text-body-2">Email</v-list-item-title>
                  <v-list-item-subtitle>{{ employee.email }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item v-if="employee.phone">
                  <template #prepend>
                    <v-icon color="primary" size="20">mdi-phone-outline</v-icon>
                  </template>
                  <v-list-item-title class="text-body-2">Phone</v-list-item-title>
                  <v-list-item-subtitle>{{ employee.phone }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item v-if="employee.department">
                  <template #prepend>
                    <v-icon color="primary" size="20">mdi-domain</v-icon>
                  </template>
                  <v-list-item-title class="text-body-2">Department</v-list-item-title>
                  <v-list-item-subtitle>{{ employee.department.name }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item v-if="employee.location">
                  <template #prepend>
                    <v-icon color="primary" size="20">mdi-map-marker-outline</v-icon>
                  </template>
                  <v-list-item-title class="text-body-2">Location</v-list-item-title>
                  <v-list-item-subtitle>{{ employee.location.name }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </div>
            
            <!-- Stats Summary -->
            <div class="section mb-4">
              <h4 class="section-title">
                <v-icon size="18" class="mr-2">mdi-chart-box</v-icon>
                Stats Summary
              </h4>
              <v-row dense>
                <v-col cols="4">
                  <div class="stat-card">
                    <div class="stat-card__value text-primary">
                      {{ employee.skill_stats?.total || 0 }}
                    </div>
                    <div class="stat-card__label">Total Skills</div>
                  </div>
                </v-col>
                <v-col cols="4">
                  <div class="stat-card">
                    <div class="stat-card__value text-success">
                      {{ employee.skill_stats?.mastered_count || 0 }}
                    </div>
                    <div class="stat-card__label">Mastered</div>
                  </div>
                </v-col>
                <v-col cols="4">
                  <div class="stat-card">
                    <div class="stat-card__value text-blue">
                      {{ tenure }}
                    </div>
                    <div class="stat-card__label">Tenure</div>
                  </div>
                </v-col>
              </v-row>
            </div>
            
            <!-- Certifications Section -->
            <div class="section">
              <h4 class="section-title">
                <v-icon size="18" class="mr-2">mdi-certificate</v-icon>
                Certifications
                <v-chip 
                  v-if="employee.certifications_count" 
                  size="x-small" 
                  color="primary"
                  class="ml-2"
                >
                  {{ employee.certifications_count }}
                </v-chip>
              </h4>
              
              <div v-if="certifications.length > 0">
                <v-list density="compact" class="bg-transparent">
                  <v-list-item
                    v-for="cert in certifications"
                    :key="cert.id"
                    class="cert-item"
                  >
                    <template #prepend>
                      <v-icon 
                        :color="getCertStatusColor(cert.status)" 
                        size="20"
                      >
                        {{ getCertStatusIcon(cert.status) }}
                      </v-icon>
                    </template>
                    <v-list-item-title class="text-body-2 font-weight-medium">
                      {{ cert.name }}
                    </v-list-item-title>
                    <v-list-item-subtitle>
                      <span v-if="cert.expiration_date">
                        Expires: {{ formatDate(cert.expiration_date) }}
                      </span>
                      <span v-else>No expiration</span>
                    </v-list-item-subtitle>
                    <template #append>
                      <v-chip 
                        :color="getCertStatusColor(cert.status)" 
                        size="x-small"
                        variant="tonal"
                      >
                        {{ cert.status }}
                      </v-chip>
                    </template>
                  </v-list-item>
                </v-list>
              </div>
              <div v-else class="text-center py-4">
                <v-icon size="40" color="grey-lighten-2">mdi-certificate-outline</v-icon>
                <p class="text-body-2 text-grey mt-2">No certifications recorded</p>
              </div>
            </div>
          </div>
        </v-window-item>
        
        <!-- Tab B: Skill Matrix -->
        <v-window-item value="skills">
          <div class="pa-4">
            <!-- Skill Stats Header -->
            <div class="skills-header mb-4">
              <div class="d-flex justify-space-between align-center mb-2">
                <h4 class="section-title mb-0">
                  <v-icon size="18" class="mr-2">mdi-star-circle</v-icon>
                  Skill Matrix
                </h4>
                <v-chip size="small" color="primary" variant="tonal">
                  Avg: {{ (employee.skill_stats?.average_level || 0).toFixed(1) }}
                </v-chip>
              </div>
            </div>
            
            <!-- Skills List -->
            <div v-if="employee.all_skills?.length" class="skills-list">
              <div 
                v-for="skill in sortedSkills" 
                :key="skill.id"
                class="skill-row"
              >
                <div class="skill-info">
                  <span class="skill-name">{{ skill.name }}</span>
                  <span class="skill-category text-caption text-grey">{{ skill.category }}</span>
                </div>
                <div class="skill-rating">
                  <div class="skill-bar">
                    <div 
                      class="skill-bar__fill" 
                      :style="{ 
                        width: `${(skill.level / 5) * 100}%`,
                        backgroundColor: getSkillBarColor(skill.level)
                      }"
                    />
                  </div>
                  <span class="skill-level" :style="{ color: getSkillBarColor(skill.level) }">
                    {{ skill.level }}
                  </span>
                  
                  <!-- Endorse Button (Admin Only) -->
                  <v-btn
                    v-if="isAdmin && skill.level < 5"
                    icon="mdi-thumb-up"
                    size="x-small"
                    variant="text"
                    color="success"
                    class="ml-2"
                    @click="endorseSkill(skill)"
                  >
                    <v-tooltip activator="parent" location="top">Endorse Skill</v-tooltip>
                  </v-btn>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-8">
              <v-icon size="60" color="grey-lighten-2">mdi-star-off</v-icon>
              <p class="text-body-2 text-grey mt-2">No skills recorded yet</p>
            </div>
            
            <!-- Skill Legend -->
            <div class="skill-legend mt-4">
              <div class="legend-item">
                <span class="legend-dot" style="background: #FF9800"></span>
                <span class="text-caption">Learning (1-2)</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot" style="background: #2196F3"></span>
                <span class="text-caption">Competent (3-4)</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot" style="background: #4CAF50"></span>
                <span class="text-caption">Mentor (5)</span>
              </div>
            </div>
          </div>
        </v-window-item>
        
        <!-- Tab C: Operations -->
        <v-window-item value="operations">
          <div class="pa-4">
            <!-- Next Shifts -->
            <div class="section mb-4">
              <h4 class="section-title">
                <v-icon size="18" class="mr-2">mdi-calendar-clock</v-icon>
                Upcoming Shifts
              </h4>
              
              <div v-if="upcomingShifts.length > 0">
                <v-list density="compact" class="bg-transparent">
                  <v-list-item
                    v-for="shift in upcomingShifts"
                    :key="shift.id"
                    class="shift-item"
                  >
                    <template #prepend>
                      <v-avatar size="40" color="primary" variant="tonal">
                        <span class="text-caption font-weight-bold">
                          {{ formatShiftDay(shift.date) }}
                        </span>
                      </v-avatar>
                    </template>
                    <v-list-item-title class="text-body-2 font-weight-medium">
                      {{ formatShiftTime(shift.start_time, shift.end_time) }}
                    </v-list-item-title>
                    <v-list-item-subtitle>
                      {{ shift.location_name || 'TBD' }}
                      <span v-if="shift.role_name"> • {{ shift.role_name }}</span>
                    </v-list-item-subtitle>
                    <template #append>
                      <v-chip 
                        :color="getShiftStatusColor(shift.status)" 
                        size="x-small"
                        variant="tonal"
                      >
                        {{ shift.status }}
                      </v-chip>
                    </template>
                  </v-list-item>
                </v-list>
              </div>
              <div v-else class="text-center py-4">
                <v-icon size="40" color="grey-lighten-2">mdi-calendar-blank</v-icon>
                <p class="text-body-2 text-grey mt-2">No upcoming shifts</p>
              </div>
            </div>
            
            <!-- Recent Activity -->
            <div class="section">
              <h4 class="section-title">
                <v-icon size="18" class="mr-2">mdi-clock-outline</v-icon>
                Recent Clock Activity
              </h4>
              
              <div v-if="recentPunches.length > 0">
                <v-timeline density="compact" side="end">
                  <v-timeline-item
                    v-for="punch in recentPunches"
                    :key="punch.id"
                    :dot-color="punch.punch_type === 'in' ? 'success' : 'grey'"
                    size="small"
                  >
                    <div class="d-flex justify-space-between align-center">
                      <div>
                        <span class="text-body-2 font-weight-medium">
                          Clock {{ punch.punch_type === 'in' ? 'In' : 'Out' }}
                        </span>
                        <span class="text-caption text-grey d-block">
                          {{ punch.location_name || 'Unknown' }}
                        </span>
                      </div>
                      <span class="text-caption text-grey">
                        {{ formatDateTime(punch.punched_at) }}
                      </span>
                    </div>
                  </v-timeline-item>
                </v-timeline>
              </div>
              <div v-else class="text-center py-4">
                <v-icon size="40" color="grey-lighten-2">mdi-clock-alert-outline</v-icon>
                <p class="text-body-2 text-grey mt-2">No recent activity</p>
              </div>
            </div>
          </div>
        </v-window-item>
      </v-window>
      
      <!-- Footer Actions -->
      <div class="drawer-footer">
        <v-row dense>
          <v-col cols="6">
            <v-btn
              block
              variant="tonal"
              color="primary"
              prepend-icon="mdi-calendar"
              size="small"
              :to="`/schedule?employee=${employee.id}`"
            >
              Schedule
            </v-btn>
          </v-col>
          <v-col cols="6">
            <v-btn
              block
              variant="tonal"
              color="secondary"
              prepend-icon="mdi-message-text"
              size="small"
              @click="$emit('message', employee)"
            >
              Message
            </v-btn>
          </v-col>
        </v-row>
      </div>
    </template>
    
    <!-- Empty State -->
    <div v-else class="d-flex align-center justify-center h-100">
      <div class="text-center">
        <v-icon size="60" color="grey-lighten-2">mdi-account-off</v-icon>
        <p class="text-body-2 text-grey mt-2">Select an employee to view details</p>
      </div>
    </div>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import type { 
  RosterCardProps, 
  RosterDetailProps,
  RosterCertification,
  RosterShift,
  RosterTimePunch,
  SkillLevel 
} from '~/types/database.types'
import { getDepartmentColor, getSkillCategory } from '~/types/database.types'

interface Props {
  modelValue: boolean
  employee: RosterCardProps | RosterDetailProps | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  edit: [employee: RosterCardProps]
  message: [employee: RosterCardProps]
  endorse: [employee: RosterCardProps, skillId: string]
}>()

const supabase = useSupabaseClient()
const toast = useToast()
const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isAdmin)

// State
const activeTab = ref('overview')

// Computed
const displayName = computed(() => {
  if (!props.employee) return ''
  return props.employee.preferred_name || `${props.employee.first_name} ${props.employee.last_name}`
})

const initials = computed(() => {
  if (!props.employee) return ''
  const first = props.employee.first_name?.[0] || ''
  const last = props.employee.last_name?.[0] || ''
  return (first + last).toUpperCase() || 'U'
})

const departmentColor = computed(() => {
  return getDepartmentColor(props.employee?.department?.name)
})

const headerStyle = computed(() => ({
  background: `linear-gradient(135deg, ${departmentColor.value} 0%, ${adjustColor(departmentColor.value, -20)} 100%)`
}))

const tenure = computed(() => {
  if (!props.employee?.hire_date) return '-'
  
  const hire = new Date(props.employee.hire_date)
  const now = new Date()
  const months = Math.floor((now.getTime() - hire.getTime()) / (30.44 * 24 * 60 * 60 * 1000))
  const years = Math.floor(months / 12)
  
  if (years < 1) return `${months}mo`
  if (months % 12 === 0) return `${years}yr`
  return `${years}yr ${months % 12}mo`
})

const statusChipColor = computed(() => {
  if (!props.employee) return 'grey'
  if (props.employee.clock_status === 'clocked_in') return 'success'
  if (props.employee.is_active) return 'primary'
  return 'grey'
})

const statusText = computed(() => {
  if (!props.employee) return ''
  if (props.employee.clock_status === 'clocked_in') return 'On Shift'
  if (props.employee.is_active) return 'Active'
  return 'Inactive'
})

const sortedSkills = computed(() => {
  if (!props.employee?.all_skills) return []
  return [...props.employee.all_skills].sort((a, b) => b.level - a.level)
})

// Cast to RosterDetailProps for extended data
const detailEmployee = computed(() => props.employee as RosterDetailProps | null)

const certifications = computed<RosterCertification[]>(() => {
  return detailEmployee.value?.certifications || []
})

const upcomingShifts = computed<RosterShift[]>(() => {
  return detailEmployee.value?.upcoming_shifts || []
})

const recentPunches = computed<RosterTimePunch[]>(() => {
  return detailEmployee.value?.recent_punches || []
})

// Methods
function formatDate(date: string | null): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function formatDateTime(datetime: string): string {
  return new Date(datetime).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function formatShiftDay(date: string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
}

function formatShiftTime(start: string, end: string): string {
  const formatTime = (t: string) => {
    const [hours, minutes] = t.split(':')
    const h = parseInt(hours)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${minutes} ${ampm}`
  }
  return `${formatTime(start)} - ${formatTime(end)}`
}

function getSkillBarColor(level: SkillLevel): string {
  const category = getSkillCategory(level)
  switch (category) {
    case 'learning': return '#FF9800'
    case 'competent': return '#2196F3'
    case 'mentor': return '#4CAF50'
  }
}

function getCertStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'success'
    case 'expired': return 'error'
    case 'renewal_pending': return 'warning'
    case 'pending': return 'info'
    default: return 'grey'
  }
}

function getCertStatusIcon(status: string): string {
  switch (status) {
    case 'active': return 'mdi-check-circle'
    case 'expired': return 'mdi-alert-circle'
    case 'renewal_pending': return 'mdi-clock-alert'
    case 'pending': return 'mdi-clock'
    default: return 'mdi-help-circle'
  }
}

function getShiftStatusColor(status: string): string {
  switch (status) {
    case 'confirmed': return 'success'
    case 'scheduled': return 'primary'
    case 'completed': return 'grey'
    case 'cancelled': return 'error'
    default: return 'grey'
  }
}

function endorseSkill(skill: { id: string; skill_id: string }) {
  if (props.employee) {
    // Emit event for parent to handle the endorsement
    emit('endorse', props.employee as RosterCardProps, skill.skill_id)
    
    // Also directly update the endorsement in the database
    endorseSkillAsync(skill)
  }
}

// Async function to handle the endorsement
async function endorseSkillAsync(skill: { id: string; skill_id: string }) {
  if (!props.employee || !authStore.profile?.id) return
  
  try {
    // Check if already endorsed by this user
    const { data: existingEndorsement } = await supabase
      .from('skill_endorsements')
      .select('id')
      .eq('employee_skill_id', skill.id)
      .eq('endorsed_by', authStore.profile.id)
      .single()
    
    if (existingEndorsement) {
      toast.info('You have already endorsed this skill')
      return
    }
    
    // Add endorsement
    const { error } = await supabase
      .from('skill_endorsements')
      .insert({
        employee_skill_id: skill.id,
        endorsed_by: authStore.profile.id,
        endorsed_at: new Date().toISOString()
      })
    
    if (error) {
      // If table doesn't exist, log and show gentle message
      if (error.code === '42P01') {
        console.log('Skill endorsements table not yet created')
        toast.info('Skill endorsement feature coming soon!')
        return
      }
      throw error
    }
    
    toast.success('Skill endorsed!')
  } catch (err) {
    console.error('Error endorsing skill:', err)
    // Don't show error toast - fail silently for non-critical feature
  }
}

function adjustColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.max(0, Math.min(255, (num >> 16) + amt))
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt))
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt))
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`
}
</script>

<style scoped>
.roster-drawer {
  border-left: 1px solid rgba(0, 0, 0, 0.12);
}

.drawer-header {
  color: white;
  padding: 20px;
}

.drawer-header__actions {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.drawer-header__actions .v-btn {
  color: white;
}

.drawer-header__profile {
  text-align: center;
}

.profile-avatar-wrap {
  position: relative;
  display: inline-block;
}

.profile-avatar {
  border: 4px solid white;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}

.profile-level {
  position: absolute;
  bottom: -8px;
  right: -8px;
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #FFD700, #FFA000);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.profile-level .level-number {
  font-size: 14px;
  font-weight: 800;
  color: #1a1a1a;
}

.profile-name {
  font-size: 22px;
  font-weight: 700;
  margin: 16px 0 4px;
}

.profile-title {
  font-size: 14px;
  opacity: 0.9;
}

.drawer-tabs {
  background: #f8f9fa;
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  max-height: calc(100vh - 360px);
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #666;
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.stat-card {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px 8px;
  text-align: center;
}

.stat-card__value {
  font-size: 24px;
  font-weight: 800;
  line-height: 1;
}

.stat-card__label {
  font-size: 11px;
  color: #666;
  margin-top: 4px;
}

.skills-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skill-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.skill-info {
  flex: 1;
}

.skill-name {
  font-size: 14px;
  font-weight: 600;
  display: block;
}

.skill-category {
  display: block;
  margin-top: 2px;
}

.skill-rating {
  display: flex;
  align-items: center;
  gap: 8px;
}

.skill-bar {
  width: 60px;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.skill-bar__fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.skill-level {
  font-size: 16px;
  font-weight: 800;
  min-width: 20px;
  text-align: center;
}

.skill-legend {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.drawer-footer {
  padding: 16px;
  background: #f8f9fa;
  border-top: 1px solid #e0e0e0;
  position: sticky;
  bottom: 0;
}

.cert-item,
.shift-item {
  border-radius: 8px;
  margin-bottom: 4px;
}

.cert-item:hover,
.shift-item:hover {
  background: rgba(0, 0, 0, 0.02);
}
</style>
