/**
 * Composable for Unified User Lifecycle operations (barrel)
 *
 * Re-exports all sub-composables and provides a unified `useLifecycle()`
 * function that merges them for backward-compatible usage.
 *
 * Sub-composables can also be imported individually:
 *   - useLifecyclePersons  — person CRUD, stages, promotions, profiles
 *   - useLifecycleIntake   — intake links & submissions
 *   - useLifecycleHats     — add CRM/recruiting/employee hats + access
 *   - useLifecycleData     — extension-table CRUD & migration
 */

// Sub-composables are auto-imported by Nuxt from their own files.
// Do NOT re-export them here — it causes "Duplicated imports" warnings.

import { useLifecyclePersons } from './useLifecyclePersons'
import { useLifecycleIntake } from './useLifecycleIntake'
import { useLifecycleHats } from './useLifecycleHats'
import { useLifecycleData } from './useLifecycleData'

/**
 * Unified lifecycle composable — returns everything the original
 * 905-line composable returned so existing callers keep working.
 */
export function useLifecycle() {
  const {
    persons,
    loading: personsLoading,
    error: personsError,
    stageStats,
    fetchPersons,
    promotePerson,
    getPersonById,
    getPersonTransitions,
    getPersonExtendedData,
    updatePersonExtendedData,
    getMasterProfile,
    findOrCreatePerson,
    getAvailablePromotions,
    getStageInfo,
  } = useLifecyclePersons()

  const {
    intakeLinks,
    submissions,
    loading: intakeLoading,
    error: intakeError,
    fetchIntakeLinks,
    createIntakeLink,
    revokeIntakeLink,
    copyLinkToClipboard,
  } = useLifecycleIntake()

  const {
    loading: hatsLoading,
    addCrmHat,
    addRecruitingHat,
    addEmployeeHat,
    grantAccess,
    revokeAccess,
  } = useLifecycleHats()

  const {
    loading: dataLoading,
    getPersonCrmData,
    getPersonRecruitingData,
    getPersonEmployeeData,
    updatePersonCrmData,
    updatePersonRecruitingData,
    updatePersonEmployeeData,
    runMigrationToExtensionTables,
  } = useLifecycleData()

  // Unified loading / error — true when ANY sub-composable is busy
  const loading = computed(
    () => personsLoading.value || intakeLoading.value || hatsLoading.value || dataLoading.value,
  )
  const error = computed(() => personsError.value || intakeError.value)

  return {
    // State
    persons,
    intakeLinks,
    submissions,
    loading,
    error,
    stageStats,

    // Methods
    fetchPersons,
    fetchIntakeLinks,
    createIntakeLink,
    revokeIntakeLink,
    promotePerson,
    getPersonById,
    getPersonTransitions,
    getPersonExtendedData,
    updatePersonExtendedData,
    copyLinkToClipboard,

    // Master Profile
    getMasterProfile,
    findOrCreatePerson,

    // Add Hats
    addCrmHat,
    addRecruitingHat,
    addEmployeeHat,

    // Access Management
    grantAccess,
    revokeAccess,

    // Extension Table Data
    getPersonCrmData,
    getPersonRecruitingData,
    getPersonEmployeeData,
    updatePersonCrmData,
    updatePersonRecruitingData,
    updatePersonEmployeeData,

    // Migration
    runMigrationToExtensionTables,

    // Helpers
    getAvailablePromotions,
    getStageInfo,
  }
}
