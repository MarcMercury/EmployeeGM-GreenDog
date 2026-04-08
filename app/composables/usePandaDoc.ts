/**
 * usePandaDoc - Composable
 * ==========================
 * Frontend composable for PandaDoc e-signatures.
 */
export function usePandaDoc() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const documents = ref<any[]>([])

  async function fetchDocuments(status?: string) {
    loading.value = true
    error.value = null
    try {
      const result = await $fetch('/api/integrations/pandadoc/documents', {
        params: { status },
      })
      documents.value = (result as any)?.results || []
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to fetch documents'
    } finally {
      loading.value = false
    }
  }

  async function createFromTemplate(options: {
    templateId: string
    name: string
    recipients: { email: string; first_name: string; last_name: string; role: string }[]
    tokens?: { name: string; value: string }[]
  }) {
    loading.value = true
    error.value = null
    try {
      return await $fetch('/api/integrations/pandadoc/documents', {
        method: 'POST',
        body: options,
      })
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to create document'
      return null
    } finally {
      loading.value = false
    }
  }

  async function sendForSigning(documentId: string, message?: string) {
    try {
      return await $fetch(`/api/integrations/pandadoc/documents/${documentId}/send`, {
        method: 'POST',
        body: { message },
      })
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to send document'
      return null
    }
  }

  async function getSigningLink(documentId: string, recipientEmail: string) {
    try {
      return await $fetch(`/api/integrations/pandadoc/documents/${documentId}/session`, {
        method: 'POST',
        body: { recipientEmail },
      })
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to get signing link'
      return null
    }
  }

  return { documents, loading, error, fetchDocuments, createFromTemplate, sendForSigning, getSigningLink }
}
