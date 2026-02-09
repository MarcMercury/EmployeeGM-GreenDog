<script setup lang="ts">
import { format, addDays } from 'date-fns'
import type { ScheduleTemplate } from '~/types/schedule.types'

const props = defineProps<{
  weekStart: Date
  shifts: any[]
}>()

const emit = defineEmits<{
  applied: []
  notify: [payload: { message: string; color: string }]
}>()

const supabase = useSupabaseClient()

// State
const templates = ref<ScheduleTemplate[]>([])
const saveTemplateDialog = ref(false)
const applyTemplateDialog = ref(false)
const isSavingTemplate = ref(false)
const isApplyingTemplate = ref(false)
const templateForm = ref({
  name: '',
  description: ''
})
const selectedTemplateId = ref<string | null>(null)
const clearExistingOnApply = ref(false)

// Load available templates
async function loadTemplates() {
  try {
    const { data, error } = await supabase.rpc('get_schedule_templates')

    if (error) {
      // Fallback to direct query if RPC doesn't exist yet
      const { data: fallbackData } = await supabase
        .from('schedule_templates')
        .select(`
          id, name, description, location_id, created_at, is_active,
          locations:location_id(name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (fallbackData) {
        templates.value = fallbackData.map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          location_id: t.location_id,
          location_name: t.locations?.name || null,
          shift_count: 0, // Can't get count in fallback
          created_by_name: null,
          created_at: t.created_at
        }))
      }
      return
    }

    templates.value = data || []
  } catch (err) {
    console.error('Failed to load templates:', err)
  }
}

// Open save template dialog
function openSaveTemplateDialog() {
  if (props.shifts.length === 0) {
    emit('notify', { message: 'No shifts to save as template', color: 'warning' })
    return
  }
  templateForm.value = {
    name: `Week of ${format(props.weekStart, 'MMM d, yyyy')}`,
    description: ''
  }
  saveTemplateDialog.value = true
}

// Save current week as template
async function saveAsTemplate() {
  if (!templateForm.value.name.trim()) {
    emit('notify', { message: 'Template name is required', color: 'warning' })
    return
  }

  isSavingTemplate.value = true

  try {
    // Try RPC first
    const { data: templateId, error: rpcError } = await supabase.rpc('save_week_as_template', {
      p_template_name: templateForm.value.name.trim(),
      p_template_description: templateForm.value.description.trim() || null,
      p_week_start: format(props.weekStart, 'yyyy-MM-dd'),
      p_location_id: null // All locations
    })

    if (rpcError) {
      // Fallback: manual save
      const { data: newTemplate, error: insertError } = await supabase
        .from('schedule_templates')
        .insert({
          name: templateForm.value.name.trim(),
          description: templateForm.value.description.trim() || null
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Copy shifts to template_shifts
      const templateShifts = props.shifts.map(s => ({
        template_id: newTemplate.id,
        day_of_week: new Date(s.start_at).getDay(),
        start_time: format(new Date(s.start_at), 'HH:mm:ss'),
        end_time: format(new Date(s.end_at), 'HH:mm:ss'),
        role_required: s.role_required,
        location_id: s.location_id,
        service_id: s.service_id,
        staffing_requirement_id: s.staffing_requirement_id
      }))

      const { error: shiftsError } = await supabase
        .from('schedule_template_shifts')
        .insert(templateShifts)

      if (shiftsError) {
        console.warn('Failed to save template shifts:', shiftsError)
      }
    }

    emit('notify', { message: `Template "${templateForm.value.name}" saved!`, color: 'success' })
    saveTemplateDialog.value = false
    await loadTemplates()
  } catch (err) {
    console.error('Save template error:', err)
    emit('notify', { message: 'Failed to save template', color: 'error' })
  } finally {
    isSavingTemplate.value = false
  }
}

// Open apply template dialog
async function openApplyTemplateDialog() {
  await loadTemplates()
  if (templates.value.length === 0) {
    emit('notify', { message: 'No templates available. Save a week as a template first.', color: 'info' })
    return
  }
  selectedTemplateId.value = null
  clearExistingOnApply.value = false
  applyTemplateDialog.value = true
}

// Apply selected template to current week
async function applyTemplate() {
  if (!selectedTemplateId.value) {
    emit('notify', { message: 'Select a template to apply', color: 'warning' })
    return
  }

  isApplyingTemplate.value = true

  try {
    // Try RPC first
    const { data, error: rpcError } = await supabase.rpc('apply_template_to_week', {
      p_template_id: selectedTemplateId.value,
      p_week_start: format(props.weekStart, 'yyyy-MM-dd'),
      p_clear_existing: clearExistingOnApply.value
    })

    if (rpcError) {
      // Fallback: manual apply
      if (clearExistingOnApply.value) {
        // Delete existing draft shifts
        await supabase
          .from('shifts')
          .delete()
          .eq('status', 'draft')
          .gte('start_at', props.weekStart.toISOString())
          .lt('start_at', addDays(props.weekStart, 7).toISOString())
      }

      // Get template shifts
      const { data: templateShifts } = await supabase
        .from('schedule_template_shifts')
        .select('*')
        .eq('template_id', selectedTemplateId.value)

      if (templateShifts && templateShifts.length > 0) {
        // Create new shifts from template
        const newShifts = templateShifts.map(ts => {
          const targetDate = addDays(props.weekStart, ts.day_of_week)
          const dateStr = format(targetDate, 'yyyy-MM-dd')
          return {
            location_id: ts.location_id,
            start_at: `${dateStr}T${ts.start_time}`,
            end_at: `${dateStr}T${ts.end_time}`,
            role_required: ts.role_required,
            service_id: ts.service_id,
            staffing_requirement_id: ts.staffing_requirement_id,
            status: 'draft',
            assignment_source: 'template'
          }
        })

        await supabase.from('shifts').insert(newShifts)
      }

      emit('notify', { message: `Applied template with ${templateShifts?.length || 0} shift slots`, color: 'success' })
    } else {
      emit('notify', { message: `Applied template: ${data?.[0]?.shifts_created || 0} shifts created, ${data?.[0]?.shifts_skipped || 0} skipped`, color: 'success' })
    }

    applyTemplateDialog.value = false
    emit('applied')
  } catch (err) {
    console.error('Apply template error:', err)
    emit('notify', { message: 'Failed to apply template', color: 'error' })
  } finally {
    isApplyingTemplate.value = false
  }
}

// Delete a template
async function deleteTemplate(templateId: string) {
  try {
    const { error } = await supabase
      .from('schedule_templates')
      .update({ is_active: false })
      .eq('id', templateId)

    if (error) throw error

    templates.value = templates.value.filter(t => t.id !== templateId)
    emit('notify', { message: 'Template deleted', color: 'success' })
  } catch (err) {
    console.error('Delete template error:', err)
    emit('notify', { message: 'Failed to delete template', color: 'error' })
  }
}

// Public methods
function openSave() {
  openSaveTemplateDialog()
}

function openApply() {
  openApplyTemplateDialog()
}

defineExpose({ openSave, openApply })

// Load templates on mount
onMounted(() => {
  loadTemplates()
})
</script>

<template>
  <!-- Save Template Dialog -->
  <v-dialog v-model="saveTemplateDialog" max-width="450">
    <v-card>
      <v-card-title class="text-h6">
        <v-icon color="primary" class="mr-2">mdi-content-save</v-icon>
        Save Week as Template
      </v-card-title>
      <v-card-text>
        <p class="mb-4 text-body-2">
          Save the current week's {{ shifts.length }} shifts as a reusable template.
        </p>

        <v-text-field
          v-model="templateForm.name"
          label="Template Name"
          placeholder="e.g., Standard Week, Holiday Week"
          variant="outlined"
          density="compact"
          class="mb-3"
          :rules="[(v: string) => !!v.trim() || 'Name is required']"
        />

        <v-textarea
          v-model="templateForm.description"
          label="Description (optional)"
          placeholder="Notes about when to use this template..."
          variant="outlined"
          density="compact"
          rows="2"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="saveTemplateDialog = false" :disabled="isSavingTemplate">
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          @click="saveAsTemplate"
          :loading="isSavingTemplate"
        >
          <v-icon start>mdi-content-save</v-icon>
          Save Template
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Apply Template Dialog -->
  <v-dialog v-model="applyTemplateDialog" max-width="550">
    <v-card>
      <v-card-title class="text-h6">
        <v-icon color="primary" class="mr-2">mdi-file-import</v-icon>
        Apply Template
      </v-card-title>
      <v-card-text>
        <p class="mb-4 text-body-2">
          Apply a saved template to the week of {{ format(weekStart, 'MMM d, yyyy') }}.
        </p>

        <v-list v-if="templates.length > 0" density="compact" class="template-list">
          <v-list-item
            v-for="tpl in templates"
            :key="tpl.id"
            :value="tpl.id"
            :active="selectedTemplateId === tpl.id"
            @click="selectedTemplateId = tpl.id"
            rounded="lg"
            class="mb-1"
          >
            <template #prepend>
              <v-radio-group v-model="selectedTemplateId" hide-details>
                <v-radio :value="tpl.id" />
              </v-radio-group>
            </template>
            <v-list-item-title>{{ tpl.name }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ tpl.description || 'No description' }}
              <span v-if="tpl.shift_count" class="ml-2">• {{ tpl.shift_count }} shifts</span>
            </v-list-item-subtitle>
            <template #append>
              <v-btn
                icon
                size="small"
                variant="text"
                color="error"
                @click.stop="deleteTemplate(tpl.id)"
              >
                <v-icon size="small">mdi-delete</v-icon>
              </v-btn>
            </template>
          </v-list-item>
        </v-list>

        <v-alert v-else type="info" density="compact" variant="tonal">
          No templates saved yet. Save a week as a template first.
        </v-alert>

        <v-divider class="my-4" />

        <v-checkbox
          v-model="clearExistingOnApply"
          label="Clear existing draft shifts first"
          density="compact"
          hide-details
          color="warning"
        />
        <p class="text-caption text-grey ml-8 mt-1">
          If checked, existing draft shifts will be removed before applying the template.
        </p>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="applyTemplateDialog = false" :disabled="isApplyingTemplate">
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          @click="applyTemplate"
          :loading="isApplyingTemplate"
          :disabled="!selectedTemplateId"
        >
          <v-icon start>mdi-file-import</v-icon>
          Apply Template
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
