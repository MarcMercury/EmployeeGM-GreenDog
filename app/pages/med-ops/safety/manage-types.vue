<template>
  <div class="manage-types-page">
    <UiPageHeader
      title="Manage Safety Log Types"
      subtitle="Green Dog Dental & Veterinary Center — Workplace Safety Program (Cal/OSHA Compliant)"
      icon="mdi-cog"
    >
      <template #actions>
        <v-btn variant="outlined" prepend-icon="mdi-arrow-left" @click="router.push('/med-ops/safety')">
          Back
        </v-btn>
        <v-btn v-if="canManage" color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
          New Log Type
        </v-btn>
      </template>
    </UiPageHeader>

    <!-- Program Overview Card -->
    <v-card variant="outlined" rounded="lg" class="mb-6">
      <v-card-text class="py-3">
        <div class="d-flex align-center gap-2 mb-2">
          <v-icon color="primary" size="20">mdi-shield-check</v-icon>
          <span class="text-subtitle-2 font-weight-bold">Injury & Illness Prevention Program (IIPP) | Fire Prevention Plan | Emergency Action Plan</span>
        </div>
        <div class="text-caption text-grey">
          Last reviewed: 01/01/2026 · Annual Review: 01/01/2027 · Covers: Venice, Sherman Oaks, Van Nuys
        </div>
      </v-card-text>
    </v-card>

    <!-- Built-in Types -->
    <h3 class="text-h6 font-weight-bold mb-3">
      Built-in Log Types ({{ builtInTypes.length }})
      <v-chip size="x-small" variant="tonal" color="info" class="ml-2">Read-only</v-chip>
    </h3>
    <v-row dense class="mb-6">
      <v-col
        v-for="cfg in builtInTypes"
        :key="cfg.key"
        cols="12"
        sm="6"
        md="4"
      >
        <v-card variant="outlined" rounded="lg" class="pa-3">
          <div class="d-flex align-center gap-2 mb-2">
            <v-avatar :color="cfg.color" size="32" variant="tonal">
              <v-icon size="18">{{ cfg.icon }}</v-icon>
            </v-avatar>
            <div>
              <div class="text-subtitle-2 font-weight-medium">{{ cfg.label }}</div>
              <div class="text-caption text-grey">{{ cfg.fields.length }} fields</div>
            </div>
          </div>
          <div class="text-caption text-grey-darken-1 mb-2" style="min-height: 32px;">
            {{ truncate(cfg.description, 80) }}
          </div>
          <div class="d-flex flex-wrap gap-1">
            <v-chip
              v-for="std in (cfg.complianceStandards || []).slice(0, 2)"
              :key="std"
              size="x-small"
              variant="tonal"
              color="info"
            >
              {{ std }}
            </v-chip>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Custom Types -->
    <h3 class="text-h6 font-weight-bold mb-3">
      Custom Log Types ({{ customTypes.length }})
    </h3>

    <div v-if="ctLoading" class="d-flex justify-center pa-6">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <template v-else-if="customTypes.length > 0">
      <v-row dense class="mb-6">
        <v-col
          v-for="ct in customTypes"
          :key="ct.key"
          cols="12"
          sm="6"
          md="4"
        >
          <v-card variant="outlined" rounded="lg" class="pa-3">
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="d-flex align-center gap-2">
                <v-avatar :color="ct.color" size="32" variant="tonal">
                  <v-icon size="18">{{ ct.icon }}</v-icon>
                </v-avatar>
                <div>
                  <div class="text-subtitle-2 font-weight-medium">{{ ct.label }}</div>
                  <div class="text-caption text-grey">{{ ct.fields.length }} fields · Custom</div>
                </div>
              </div>
              <div class="d-flex gap-1">
                <v-btn icon="mdi-pencil" variant="text" size="x-small" @click="openEditDialog(ct)" />
                <v-btn icon="mdi-delete" variant="text" size="x-small" color="error" @click="confirmDelete(ct)" />
              </div>
            </div>
            <div class="text-caption text-grey-darken-1">
              {{ truncate(ct.description, 80) }}
            </div>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <v-card v-else variant="outlined" rounded="lg" class="text-center pa-8 mb-6">
      <v-icon size="48" color="grey">mdi-clipboard-plus-outline</v-icon>
      <div class="text-body-1 mt-2">No custom log types yet</div>
      <div class="text-caption text-grey mb-4">Create a new log type to define your own safety compliance forms</div>
      <v-btn v-if="canManage" color="primary" variant="tonal" prepend-icon="mdi-plus" @click="openCreateDialog">
        Create One
      </v-btn>
    </v-card>

    <!-- Create/Edit Dialog -->
    <v-dialog v-model="dialog" max-width="860" scrollable persistent>
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center justify-space-between pt-4 px-4">
          <span class="text-h6 font-weight-bold">
            {{ editingId ? 'Edit' : 'Create' }} Log Type
          </span>
          <v-btn icon="mdi-close" variant="text" @click="dialog = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4" style="max-height: 60vh; overflow-y: auto;">
          <v-row dense>
            <v-col cols="12" sm="8">
              <v-text-field
                v-model="form.label"
                label="Log Type Name *"
                variant="outlined"
                density="comfortable"
                :rules="[v => !!v || 'Name is required']"
                @update:model-value="autoKey"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="form.key"
                label="Key (auto)"
                variant="outlined"
                density="comfortable"
                :disabled="!!editingId"
                hint="Unique slug, auto-generated"
                persistent-hint
              />
            </v-col>
            <v-col cols="6" sm="4">
              <v-text-field
                v-model="form.icon"
                label="Icon"
                variant="outlined"
                density="comfortable"
                hint="e.g. mdi-fire, mdi-flask"
                persistent-hint
                prepend-inner-icon="mdi-palette"
              />
            </v-col>
            <v-col cols="6" sm="4">
              <v-select
                v-model="form.color"
                :items="colorOptions"
                label="Color"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-switch
                v-model="form.has_osha_toggle"
                label="OSHA Recordable Toggle"
                color="primary"
                density="compact"
                hide-details
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="form.description"
                label="Description"
                variant="outlined"
                density="comfortable"
                rows="2"
                auto-grow
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="form.complianceText"
                label="Compliance Standards (comma-separated)"
                variant="outlined"
                density="comfortable"
                hint="e.g. Cal/OSHA Title 8 §3203, AAHA"
                persistent-hint
              />
            </v-col>
          </v-row>

          <!-- Field Builder -->
          <v-divider class="my-4" />
          <div class="d-flex align-center justify-space-between mb-3">
            <h4 class="text-subtitle-1 font-weight-bold">
              <v-icon size="18" class="mr-1">mdi-form-select</v-icon>
              Form Fields ({{ form.fields.length }})
            </h4>
            <v-btn variant="tonal" size="small" prepend-icon="mdi-plus" @click="addField">
              Add Field
            </v-btn>
          </div>

          <div v-if="form.fields.length === 0" class="text-center pa-6 text-caption text-grey">
            No fields yet. Add at least one field to make this log type usable.
          </div>

          <div
            v-for="(field, i) in form.fields"
            :key="i"
            class="field-builder-row mb-3"
          >
            <v-card variant="tonal" rounded="lg" class="pa-3">
              <v-row dense>
                <v-col cols="12" sm="4">
                  <v-text-field
                    v-model="field.label"
                    label="Label *"
                    variant="outlined"
                    density="compact"
                    hide-details
                    @update:model-value="field.key = slugify(field.label)"
                  />
                </v-col>
                <v-col cols="6" sm="3">
                  <v-select
                    v-model="field.type"
                    :items="fieldTypeOptions"
                    label="Type"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="3" sm="2">
                  <v-select
                    v-model="field.cols"
                    :items="[6, 12]"
                    label="Width"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="3" sm="2">
                  <v-checkbox
                    v-model="field.required"
                    label="Required"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="12" sm="1" class="d-flex justify-end align-center">
                  <v-btn icon="mdi-delete" variant="text" size="x-small" color="error" @click="removeField(i)" />
                </v-col>
              </v-row>
              <!-- Options for select/multiselect -->
              <v-text-field
                v-if="['select', 'multiselect'].includes(field.type)"
                v-model="field._optionsText"
                label="Options (comma separated)"
                variant="outlined"
                density="compact"
                class="mt-2"
                hide-details
                hint="e.g. Option 1, Option 2, Option 3"
              />
            </v-card>
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="outlined" @click="dialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="saving"
            :disabled="!form.label || !form.key || form.fields.length === 0"
            @click="saveType"
          >
            {{ editingId ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card rounded="lg">
        <v-card-text class="text-center pa-6">
          <v-icon size="48" color="error" class="mb-3">mdi-alert-circle</v-icon>
          <h3 class="text-h6 font-weight-bold mb-2">Delete Log Type?</h3>
          <p class="text-body-2 text-grey">
            This will permanently delete <strong>{{ deletingType?.label }}</strong>.
            Existing log entries of this type will remain but the form definition will be removed.
          </p>
        </v-card-text>
        <v-card-actions class="justify-center pb-4">
          <v-btn variant="outlined" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" :loading="deleting" @click="doDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  SAFETY_LOG_TYPE_CONFIGS,
  type SafetyLogTypeConfig,
  type SafetyFormField,
} from '~/types/safety-log.types'

definePageMeta({
  middleware: ['auth'],
  layout: 'default',
})

const router = useRouter()
const toast = useToast()
const { can } = usePermissions()
const { customTypes, loading: ctLoading, fetchCustomTypes, createCustomType, updateCustomType, deleteCustomType } = useCustomSafetyLogTypes()

const canManage = computed(() => can('manage:safety-logs'))

// Redirect base users who shouldn't access this page
onMounted(() => {
  if (!canManage.value) {
    toast.error('You do not have permission to manage log types')
    router.replace('/med-ops/safety')
  }
})
const builtInTypes = computed(() => SAFETY_LOG_TYPE_CONFIGS)

// ── Dialog state ───────────────────────────────────────
const dialog = ref(false)
const saving = ref(false)
const editingId = ref<string | null>(null)

interface FieldForm extends SafetyFormField {
  _optionsText?: string
}

const form = ref({
  label: '',
  key: '',
  icon: 'mdi-clipboard-text',
  color: 'grey',
  description: '',
  has_osha_toggle: false,
  complianceText: '',
  fields: [] as FieldForm[],
})

const colorOptions = [
  'grey', 'blue', 'red', 'green', 'orange', 'purple', 'teal', 'amber',
  'indigo', 'cyan', 'lime', 'deep-orange', 'blue-grey', 'pink', 'brown',
]

const fieldTypeOptions = [
  { title: 'Text', value: 'text' },
  { title: 'Textarea', value: 'textarea' },
  { title: 'Select', value: 'select' },
  { title: 'Multi-select', value: 'multiselect' },
  { title: 'Boolean (Toggle)', value: 'boolean' },
  { title: 'Date', value: 'date' },
  { title: 'Number', value: 'number' },
]

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

function autoKey() {
  if (!editingId.value) {
    form.value.key = slugify(form.value.label)
  }
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len - 3) + '...' : str
}

function addField() {
  form.value.fields.push({
    key: '',
    label: '',
    type: 'text',
    required: false,
    cols: 12,
    _optionsText: '',
  })
}

function removeField(i: number) {
  form.value.fields.splice(i, 1)
}

function openCreateDialog() {
  editingId.value = null
  form.value = {
    label: '',
    key: '',
    icon: 'mdi-clipboard-text',
    color: 'grey',
    description: '',
    has_osha_toggle: false,
    complianceText: '',
    fields: [],
  }
  dialog.value = true
}

function openEditDialog(ct: SafetyLogTypeConfig) {
  // Find the raw DB record for this custom type
  editingId.value = (ct as any).id || ct.key
  form.value = {
    label: ct.label,
    key: ct.key,
    icon: ct.icon,
    color: ct.color,
    description: ct.description,
    has_osha_toggle: ct.hasOshaToggle || false,
    complianceText: (ct.complianceStandards || []).join(', '),
    fields: ct.fields.map(f => ({
      ...f,
      _optionsText: (f.options || []).join(', '),
    })),
  }
  dialog.value = true
}

async function saveType() {
  if (!form.value.label || !form.value.key || form.value.fields.length === 0) return
  saving.value = true

  try {
    // Convert field options from text
    const fields: SafetyFormField[] = form.value.fields.map(f => {
      const field: SafetyFormField = {
        key: f.key || slugify(f.label),
        label: f.label,
        type: f.type,
        required: f.required,
        cols: f.cols || 12,
      }
      if (['select', 'multiselect'].includes(f.type) && f._optionsText) {
        field.options = f._optionsText.split(',').map(o => o.trim()).filter(Boolean)
      }
      return field
    })

    const complianceStandards = form.value.complianceText
      ? form.value.complianceText.split(',').map(s => s.trim()).filter(Boolean)
      : []

    if (editingId.value) {
      // Find the DB record to get actual UUID
      const supabase = useSupabaseClient()
      const { data: existing } = await supabase
        .from('custom_safety_log_types')
        .select('id')
        .eq('key', form.value.key)
        .single()

      if (existing) {
        await updateCustomType(existing.id, {
          label: form.value.label,
          icon: form.value.icon,
          color: form.value.color,
          description: form.value.description,
          fields,
          has_osha_toggle: form.value.has_osha_toggle,
          compliance_standards: complianceStandards,
        })
        toast.success('Log type updated')
      }
    } else {
      // Check for key conflicts with built-in types
      const builtInKeys = SAFETY_LOG_TYPE_CONFIGS.map(c => c.key)
      if (builtInKeys.includes(form.value.key as any)) {
        toast.error('This key conflicts with a built-in type. Choose a different name.')
        saving.value = false
        return
      }

      await createCustomType({
        key: form.value.key,
        label: form.value.label,
        icon: form.value.icon,
        color: form.value.color,
        description: form.value.description,
        fields,
        has_osha_toggle: form.value.has_osha_toggle,
        compliance_standards: complianceStandards,
      })
      toast.success('Log type created')
    }

    dialog.value = false
  } catch (err: any) {
    toast.error(err?.message || 'Failed to save log type')
  } finally {
    saving.value = false
  }
}

// ── Delete ─────────────────────────────────────────────
const deleteDialog = ref(false)
const deleting = ref(false)
const deletingType = ref<SafetyLogTypeConfig | null>(null)

function confirmDelete(ct: SafetyLogTypeConfig) {
  deletingType.value = ct
  deleteDialog.value = true
}

async function doDelete() {
  if (!deletingType.value) return
  deleting.value = true
  try {
    const supabase = useSupabaseClient()
    const { data } = await supabase
      .from('custom_safety_log_types')
      .select('id')
      .eq('key', deletingType.value.key)
      .single()

    if (data) {
      await deleteCustomType(data.id)
      toast.success('Log type deleted')
    }
    deleteDialog.value = false
  } catch (err: any) {
    toast.error(err?.message || 'Failed to delete')
  } finally {
    deleting.value = false
  }
}

// ── Lifecycle ──────────────────────────────────────────
onMounted(() => {
  fetchCustomTypes()
})
</script>

<style scoped>
.manage-types-page {
  max-width: 1200px;
}
.field-builder-row {
  transition: opacity 0.15s;
}
</style>
