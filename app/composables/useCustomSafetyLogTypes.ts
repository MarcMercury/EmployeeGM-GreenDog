/**
 * useCustomSafetyLogTypes composable
 *
 * Fetches user-defined safety log types from server API endpoints
 * and merges them with the built-in SAFETY_LOG_TYPE_CONFIGS for a unified list.
 *
 * Uses $fetch to /api/safety-log/custom-types instead of direct Supabase client
 * to avoid TypeScript issues with tables not yet in the generated Supabase types.
 */

import { ref, computed } from 'vue'
import {
  SAFETY_LOG_TYPE_CONFIGS,
  type SafetyLogTypeConfig,
  type SafetyFormField,
} from '~/types/safety-log.types'

// Module-level cache so multiple components share the same data
const _customTypes = ref<SafetyLogTypeConfig[]>([])
const _loaded = ref(false)
const _loading = ref(false)

export function useCustomSafetyLogTypes() {
  async function fetchCustomTypes(force = false) {
    if (_loaded.value && !force) return
    _loading.value = true

    try {
      const rows = await $fetch<any[]>('/api/safety-log/custom-types')

      _customTypes.value = (rows || []).map((row: any) => ({
        key: row.key,
        label: row.label,
        icon: row.icon || 'mdi-clipboard-text',
        color: row.color || 'grey',
        description: row.description || '',
        fields: (row.fields || []) as SafetyFormField[],
        hasOshaToggle: row.has_osha_toggle || false,
        complianceStandards: row.compliance_standards || [],
        isCustom: true,
      }))
      _loaded.value = true
    } catch (err: any) {
      console.error('[useCustomSafetyLogTypes] Fetch error:', err?.message || err)
      _customTypes.value = []
    } finally {
      _loading.value = false
    }
  }

  /** All types: built-in + custom */
  const allTypes = computed<SafetyLogTypeConfig[]>(() => [
    ...SAFETY_LOG_TYPE_CONFIGS,
    ..._customTypes.value,
  ])

  /** Only submittable types (have at least 1 field) */
  const submittableTypes = computed<SafetyLogTypeConfig[]>(() =>
    allTypes.value.filter(c => c.fields.length > 0)
  )

  /** Look up any type by key (built-in or custom) */
  function findType(key: string): SafetyLogTypeConfig | undefined {
    return allTypes.value.find(t => t.key === key)
  }

  /** Create a new custom type */
  async function createCustomType(payload: {
    key: string
    label: string
    icon: string
    color: string
    description: string
    fields: SafetyFormField[]
    has_osha_toggle: boolean
    compliance_standards: string[]
  }) {
    const result = await $fetch<{ data: any }>('/api/safety-log/custom-types', {
      method: 'POST',
      body: payload,
    })

    await fetchCustomTypes(true)
    return result.data
  }

  /** Update an existing custom type */
  async function updateCustomType(id: string, payload: Partial<{
    label: string
    icon: string
    color: string
    description: string
    fields: SafetyFormField[]
    has_osha_toggle: boolean
    compliance_standards: string[]
    is_active: boolean
  }>) {
    const result = await $fetch<{ data: any }>('/api/safety-log/custom-types', {
      method: 'PUT',
      body: { id, ...payload },
    })

    await fetchCustomTypes(true)
    return result.data
  }

  /** Delete a custom type (admin only) */
  async function deleteCustomType(id: string) {
    await $fetch('/api/safety-log/custom-types', {
      method: 'DELETE',
      body: { id },
    })

    await fetchCustomTypes(true)
  }

  return {
    customTypes: _customTypes,
    allTypes,
    submittableTypes,
    loading: _loading,
    loaded: _loaded,
    fetchCustomTypes,
    findType,
    createCustomType,
    updateCustomType,
    deleteCustomType,
  }
}
