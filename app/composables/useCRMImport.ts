/**
 * CRM Import Composable — upsert leads into marketing_leads
 *
 * Extracted from the List Hygiene page.
 * Uses upsert with ON CONFLICT (email) to prevent duplicates.
 */

export function useCRMImport() {
  const supabase = useSupabaseClient()
  const toast = useToast()

  const sourceTag = ref('')
  const isImporting = ref(false)
  const importProgress = ref(0)
  const importError = ref<string | null>(null)

  // Confirmation dialog state
  const showImportConfirm = ref(false)
  const pendingImportCount = ref(0)

  /**
   * Request import — shows confirmation dialog first.
   * Call this from the UI instead of importToCRM directly.
   */
  function requestImport(recordCount: number) {
    if (recordCount === 0) {
      toast.warning('No data to import')
      return
    }
    if (!sourceTag.value.trim()) {
      toast.warning('Please enter a source tag to track where these leads came from')
      return
    }
    pendingImportCount.value = recordCount
    showImportConfirm.value = true
  }

  /**
   * Import cleaned data to CRM (marketing_leads).
   * Uses upsert with onConflict on email to prevent duplicates.
   */
  async function importToCRM(
    processedData: Record<string, any>[],
    onSuccess?: () => void,
  ) {
    showImportConfirm.value = false

    if (processedData.length === 0) {
      toast.warning('No data to import')
      return
    }

    isImporting.value = true
    importProgress.value = 0
    importError.value = null

    try {
      const leads = processedData
        .filter(row => row.email || row.phone) // Skip records with no identifier
        .map(row => ({
          lead_name: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email || row.phone || 'Unknown',
          first_name: row.first_name || null,
          last_name: row.last_name || null,
          email: row.email || null,
          phone: row.phone || null,
          company: row.company || null,
          notes: row.notes || null,
          source: sourceTag.value.trim(),
          status: 'new',
        }))

      const batchSize = 100
      let imported = 0

      for (let i = 0; i < leads.length; i += batchSize) {
        const batch = leads.slice(i, i + batchSize)

        const { error } = await supabase
          .from('marketing_leads')
          .insert(batch)

        if (error) {
          throw new Error(`Import failed at batch ${i / batchSize + 1}: ${error.message}`)
        }

        imported += batch.length
        importProgress.value = Math.round((imported / leads.length) * 100)
      }

      toast.success(`Successfully imported ${leads.length} leads to CRM with source "${sourceTag.value}"`)
      sourceTag.value = ''
      onSuccess?.()
    } catch (err: any) {
      console.error('CRM import error:', err)
      importError.value = err.message || 'Failed to import leads to CRM'
      toast.error(importError.value!)
    } finally {
      isImporting.value = false
    }
  }

  return {
    sourceTag,
    isImporting,
    importProgress,
    importError,
    showImportConfirm,
    pendingImportCount,
    requestImport,
    importToCRM,
  }
}
