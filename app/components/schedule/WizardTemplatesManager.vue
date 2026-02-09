<script setup lang="ts">
/**
 * WizardTemplatesManager - Schedule template browser & save dialogs
 * Extracted from pages/schedule/wizard.vue
 */
import { format } from 'date-fns'
import type { ScheduleTemplate } from '~/types/schedule.types'

const props = defineProps<{
  weekStart: Date
  locationId: string
  draftId: string | null
}>()

const emit = defineEmits<{
  (e: 'applied', payload: { draftId: string; operationalDays: number[] }): void
  (e: 'notify', payload: { message: string; color: string }): void
}>()

const supabase = useSupabaseClient()

// State
const templates = ref<ScheduleTemplate[]>([])
const templatesDialog = ref(false)
const saveTemplateDialog = ref(false)
const templateName = ref('')
const templateDescription = ref('')
const templateLocationSpecific = ref(false)
const isSavingTemplate = ref(false)
const isApplyingTemplate = ref(false)
const isLoadingTemplates = ref(false)

// Load available templates
async function loadTemplates() {
  isLoadingTemplates.value = true
  try {
    const { data, error } = await supabase.rpc('list_schedule_templates', {
      p_location_id: props.locationId
    })

    if (error) throw error
    templates.value = data || []
  } catch (err) {
    console.error('Failed to load templates:', err)
    templates.value = []
  } finally {
    isLoadingTemplates.value = false
  }
}

// Open templates dialog
async function openBrowser() {
  await loadTemplates()
  templatesDialog.value = true
}

// Apply template to current draft
async function applyTemplate(template: ScheduleTemplate) {
  if (!props.locationId) {
    emit('notify', { message: 'Please select a location first', color: 'error' })
    return
  }

  isApplyingTemplate.value = true
  try {
    const { data, error } = await supabase.rpc('apply_template_to_draft', {
      p_template_id: template.id,
      p_location_id: props.locationId,
      p_week_start: format(props.weekStart, 'yyyy-MM-dd')
    })

    if (error) throw error

    templatesDialog.value = false
    emit('applied', { draftId: data, operationalDays: [...template.operational_days] })
    emit('notify', { message: `Applied template "${template.name}" - ${template.slot_count} slots created`, color: 'success' })
  } catch (err) {
    console.error('Failed to apply template:', err)
    emit('notify', { message: 'Failed to apply template', color: 'error' })
  } finally {
    isApplyingTemplate.value = false
  }
}

// Open save template dialog
function openSave() {
  templateName.value = 'Schedule Template'
  templateDescription.value = ''
  templateLocationSpecific.value = false
  saveTemplateDialog.value = true
}

// Save current draft as template
async function saveAsTemplate() {
  if (!props.draftId || !templateName.value.trim()) {
    emit('notify', { message: 'Please provide a template name', color: 'error' })
    return
  }

  isSavingTemplate.value = true
  try {
    const { data, error } = await supabase.rpc('save_template_from_draft', {
      p_draft_id: props.draftId,
      p_name: templateName.value.trim(),
      p_description: templateDescription.value.trim() || null,
      p_location_specific: templateLocationSpecific.value
    })

    if (error) throw error

    saveTemplateDialog.value = false
    emit('notify', { message: 'Template saved successfully!', color: 'success' })
  } catch (err) {
    console.error('Failed to save template:', err)
    emit('notify', { message: 'Failed to save template', color: 'error' })
  } finally {
    isSavingTemplate.value = false
  }
}

// Delete a template
async function deleteTemplate(template: ScheduleTemplate) {
  if (!confirm(`Delete template "${template.name}"?`)) return

  try {
    const { error } = await supabase.rpc('delete_schedule_template', {
      p_template_id: template.id
    })

    if (error) throw error

    templates.value = templates.value.filter(t => t.id !== template.id)
    emit('notify', { message: 'Template deleted', color: 'success' })
  } catch (err) {
    console.error('Failed to delete template:', err)
    emit('notify', { message: 'Failed to delete template', color: 'error' })
  }
}

// Load templates on mount
onMounted(() => {
  loadTemplates()
})

defineExpose({ openBrowser, openSave })
</script>

<template>
  <!-- Templates Dialog -->
  <v-dialog v-model="templatesDialog" max-width="700">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-file-document-multiple-outline</v-icon>
        Schedule Templates
        <v-spacer />
        <v-btn
          v-if="draftId"
          variant="tonal"
          color="primary"
          size="small"
          @click="templatesDialog = false; openSave()"
        >
          <v-icon start>mdi-content-save</v-icon>
          Save Current as Template
        </v-btn>
      </v-card-title>

      <v-divider />

      <v-card-text v-if="isLoadingTemplates" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" />
      </v-card-text>

      <v-list v-else-if="templates.length > 0" lines="three">
        <v-list-item
          v-for="template in templates"
          :key="template.id"
          :disabled="isApplyingTemplate"
          @click="applyTemplate(template)"
        >
          <template #prepend>
            <v-avatar color="secondary" variant="tonal">
              <v-icon>mdi-file-document-outline</v-icon>
            </v-avatar>
          </template>

          <v-list-item-title class="font-weight-medium">
            {{ template.name }}
            <v-chip v-if="template.is_default" size="x-small" color="primary" class="ml-2">
              Default
            </v-chip>
          </v-list-item-title>

          <v-list-item-subtitle>
            {{ template.description || 'No description' }}
          </v-list-item-subtitle>

          <v-list-item-subtitle class="mt-1">
            <v-chip size="x-small" variant="outlined" class="mr-1">
              {{ template.slot_count }} slots
            </v-chip>
            <v-chip size="x-small" variant="outlined" class="mr-1">
              {{ template.service_count }} services
            </v-chip>
            <v-chip v-if="template.location_name" size="x-small" variant="outlined">
              {{ template.location_name }}
            </v-chip>
            <v-chip v-else size="x-small" variant="outlined" color="success">
              Any Location
            </v-chip>
          </v-list-item-subtitle>

          <template #append>
            <div class="d-flex flex-column align-end">
              <div class="text-caption text-grey mb-1">
                Used {{ template.usage_count }} times
              </div>
              <v-btn
                icon="mdi-delete"
                size="x-small"
                variant="text"
                color="error"
                @click.stop="deleteTemplate(template)"
              />
            </div>
          </template>
        </v-list-item>
      </v-list>

      <v-card-text v-else class="text-center py-8">
        <v-icon size="48" color="grey">mdi-file-document-outline</v-icon>
        <p class="text-body-2 text-grey mt-2">No templates found</p>
        <p class="text-caption text-grey">
          Build a schedule and save it as a template to reuse it later
        </p>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="templatesDialog = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Save Template Dialog -->
  <v-dialog v-model="saveTemplateDialog" max-width="450">
    <v-card>
      <v-card-title>
        <v-icon class="mr-2">mdi-content-save-outline</v-icon>
        Save as Template
      </v-card-title>

      <v-card-text>
        <v-text-field
          v-model="templateName"
          label="Template Name"
          placeholder="e.g., Standard Monday-Friday"
          variant="outlined"
          density="compact"
          :rules="[(v: string) => !!v.trim() || 'Name is required']"
          class="mb-3"
        />

        <v-textarea
          v-model="templateDescription"
          label="Description (optional)"
          placeholder="Describe when to use this template..."
          variant="outlined"
          density="compact"
          rows="2"
          class="mb-3"
        />

        <v-checkbox
          v-model="templateLocationSpecific"
          label="Location-specific template"
          hint="If checked, this template will only be available for the current location"
          persistent-hint
          density="compact"
        />
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="saveTemplateDialog = false">Cancel</v-btn>
        <v-btn
          color="primary"
          :loading="isSavingTemplate"
          :disabled="!templateName.trim()"
          @click="saveAsTemplate"
        >
          Save Template
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
