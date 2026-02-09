/**
 * Sub-composable for Intake Link operations
 *
 * Handles creating, fetching, revoking intake links,
 * managing submissions, and clipboard utilities.
 */

import type {
  IntakeLink,
  IntakeSubmission,
  IntakeLinkType,
  CreateIntakeLinkRequest,
} from '~/types/lifecycle.types'

export function useLifecycleIntake() {
  const toast = useToast()
  const supabase = useSupabaseClient()

  // State
  const intakeLinks = ref<IntakeLink[]>([])
  const submissions = ref<IntakeSubmission[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch intake links with optional filtering
   */
  async function fetchIntakeLinks(options?: {
    status?: string
    linkType?: IntakeLinkType
    limit?: number
    offset?: number
  }) {
    loading.value = true
    error.value = null

    try {
      const params = new URLSearchParams()
      if (options?.status) params.set('status', options.status)
      if (options?.linkType) params.set('linkType', options.linkType)
      if (options?.limit) params.set('limit', options.limit.toString())
      if (options?.offset) params.set('offset', options.offset.toString())

      const response = await $fetch<{ success: boolean; data: IntakeLink[] }>(
        `/api/intake/links?${params}`,
      )

      if (response.success) {
        intakeLinks.value = response.data
      }

      return response
    } catch (err) {
      console.error('Error fetching intake links:', err)
      error.value = 'Failed to fetch intake links'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new intake link
   */
  async function createIntakeLink(data: CreateIntakeLinkRequest) {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch('/api/intake/links', {
        method: 'POST',
        body: data,
      })

      toast.add({
        title: 'Link Created',
        description: 'Intake link created successfully',
        color: 'green',
      })

      // Refresh the links list
      await fetchIntakeLinks()

      return response
    } catch (err) {
      console.error('Error creating intake link:', err)
      error.value = 'Failed to create intake link'
      toast.add({
        title: 'Error',
        description: 'Failed to create intake link',
        color: 'red',
      })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Revoke an intake link
   */
  async function revokeIntakeLink(linkId: string) {
    try {
      const { error: updateError } = await supabase
        .from('intake_links')
        .update({ status: 'revoked' })
        .eq('id', linkId)

      if (updateError) throw updateError

      toast.add({
        title: 'Link Revoked',
        description: 'The intake link has been revoked',
        color: 'green',
      })

      await fetchIntakeLinks()
    } catch (err) {
      console.error('Error revoking link:', err)
      toast.add({
        title: 'Error',
        description: 'Failed to revoke link',
        color: 'red',
      })
      throw err
    }
  }

  /**
   * Copy an intake link URL to clipboard
   */
  async function copyLinkToClipboard(link: IntakeLink) {
    try {
      await navigator.clipboard.writeText(link.url || '')
      toast.add({
        title: 'Copied!',
        description: 'Link copied to clipboard',
        color: 'green',
      })
    } catch (err) {
      console.error('Failed to copy:', err)
      toast.add({
        title: 'Error',
        description: 'Failed to copy link',
        color: 'red',
      })
    }
  }

  return {
    // State
    intakeLinks,
    submissions,
    loading,
    error,

    // Methods
    fetchIntakeLinks,
    createIntakeLink,
    revokeIntakeLink,
    copyLinkToClipboard,
  }
}
