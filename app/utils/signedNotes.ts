/**
 * Signed Notes Utility
 * 
 * Global utility for formatting notes with timestamps and user initials.
 * This is a standard applied across all notes in the application.
 * 
 * Format: [Note Content]\n-- [User Initials] @ [MM/DD/YYYY HH:MM AM/PM]
 */

export interface SignedNoteUser {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
}

export interface SignedNoteOptions {
  includeDate?: boolean
  includeTime?: boolean
  dateFormat?: 'short' | 'long' | 'iso'
  separator?: string
}

const defaultOptions: SignedNoteOptions = {
  includeDate: true,
  includeTime: true,
  dateFormat: 'short',
  separator: '--'
}

/**
 * Get user initials from a user object
 * @param user - User object with first_name and last_name
 * @returns Uppercase initials (e.g., "JD" for "John Doe")
 */
export function getUserInitials(user: SignedNoteUser | null | undefined): string {
  if (!user) return 'SY' // System
  
  const first = user.first_name?.trim()?.[0] || ''
  const last = user.last_name?.trim()?.[0] || ''
  
  const initials = (first + last).toUpperCase()
  
  // If no initials, try to extract from email
  if (!initials && user.email) {
    const emailName = user.email.split('@')[0]
    if (emailName && emailName.length >= 2) {
      return emailName.substring(0, 2).toUpperCase()
    }
  }
  
  return initials || 'SY'
}

/**
 * Format a timestamp for note display
 * @param date - Date to format
 * @param options - Formatting options
 * @returns Formatted date string
 */
export function formatNoteTimestamp(
  date: Date | string = new Date(),
  options: SignedNoteOptions = defaultOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(d.getTime())) {
    return 'Invalid Date'
  }
  
  const { dateFormat, includeDate, includeTime } = { ...defaultOptions, ...options }
  
  if (dateFormat === 'iso') {
    return d.toISOString()
  }
  
  const parts: string[] = []
  
  if (includeDate) {
    if (dateFormat === 'long') {
      parts.push(d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }))
    } else {
      parts.push(d.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      }))
    }
  }
  
  if (includeTime) {
    parts.push(d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }))
  }
  
  return parts.join(' ')
}

/**
 * Format a note with user signature (initials and timestamp)
 * This is the standard format for all saved notes in the application.
 * 
 * @param noteText - The note content
 * @param user - User object with name information
 * @param options - Formatting options
 * @returns Formatted note with signature
 * 
 * @example
 * formatSignedNote("Patient follow-up needed", { first_name: "John", last_name: "Doe" })
 * // Returns: "Patient follow-up needed\n-- JD @ 12/19/2024 2:30 PM"
 */
export function formatSignedNote(
  noteText: string,
  user: SignedNoteUser | null | undefined,
  options: SignedNoteOptions = defaultOptions
): string {
  const opts = { ...defaultOptions, ...options }
  const initials = getUserInitials(user)
  const timestamp = formatNoteTimestamp(new Date(), opts)
  
  const trimmedNote = noteText.trim()
  
  return `${trimmedNote}\n${opts.separator} ${initials} @ ${timestamp}`
}

/**
 * Parse a signed note to extract the content and signature
 * @param signedNote - Full note with signature
 * @returns Object with content, initials, and timestamp
 */
export function parseSignedNote(signedNote: string): {
  content: string
  initials: string | null
  timestamp: string | null
  rawSignature: string | null
} {
  if (!signedNote) {
    return { content: '', initials: null, timestamp: null, rawSignature: null }
  }
  
  // Match pattern: content\n-- INITIALS @ timestamp
  const signaturePattern = /\n--\s*([A-Z]{2,4})\s*@\s*(.+)$/
  const match = signedNote.match(signaturePattern)
  
  if (match) {
    return {
      content: signedNote.replace(signaturePattern, '').trim(),
      initials: match[1],
      timestamp: match[2].trim(),
      rawSignature: match[0].trim()
    }
  }
  
  return {
    content: signedNote,
    initials: null,
    timestamp: null,
    rawSignature: null
  }
}

/**
 * Append a signed update to an existing note
 * Useful for adding follow-up comments to existing notes
 * 
 * @param existingNote - The existing note content
 * @param newContent - New content to append
 * @param user - User making the update
 * @returns Updated note with both entries
 */
export function appendSignedNote(
  existingNote: string,
  newContent: string,
  user: SignedNoteUser | null | undefined
): string {
  const separator = '\n\n---\n\n'
  const signedNew = formatSignedNote(newContent, user)
  
  return `${existingNote.trim()}${separator}${signedNew}`
}

/**
 * Check if a note already has a signature
 * @param note - Note to check
 * @returns true if note has signature pattern
 */
export function hasSignature(note: string): boolean {
  return /\n--\s*[A-Z]{2,4}\s*@\s*.+$/.test(note)
}

/**
 * Create a structured note object for database storage
 * Use this when storing notes in structured tables (e.g., partner_notes)
 */
export function createStructuredNote(
  content: string,
  user: SignedNoteUser | null | undefined,
  noteType: string = 'general'
): {
  content: string
  author_initials: string
  note_type: string
  created_at: string
} {
  return {
    content: content.trim(),
    author_initials: getUserInitials(user),
    note_type: noteType,
    created_at: new Date().toISOString()
  }
}

/**
 * Format note display for UI with styled signature
 * Returns an object suitable for rendering with different styles
 */
export function formatNoteForDisplay(
  content: string,
  authorInitials: string | null,
  createdAt: string | Date,
  editedAt?: string | Date | null,
  editedByInitials?: string | null
): {
  content: string
  signature: string
  isEdited: boolean
  editSignature: string | null
} {
  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt
  const timestamp = formatNoteTimestamp(created)
  
  let editSignature: string | null = null
  if (editedAt) {
    const edited = typeof editedAt === 'string' ? new Date(editedAt) : editedAt
    const editTimestamp = formatNoteTimestamp(edited)
    editSignature = `Edited by ${editedByInitials || 'Unknown'} @ ${editTimestamp}`
  }
  
  return {
    content,
    signature: `${authorInitials || 'SY'} @ ${timestamp}`,
    isEdited: !!editedAt,
    editSignature
  }
}

// Composable for Vue components
export function useSignedNotes() {
  // Note: useUserStore must be called within Vue component context
  // This composable should be used in setup() or <script setup>
  
  const getCurrentUser = () => {
    try {
      const userStore = useUserStore()
      const profile = userStore.profile
      return {
        first_name: profile?.first_name,
        last_name: profile?.last_name,
        email: profile?.email
      }
    } catch {
      return { first_name: null, last_name: null, email: null }
    }
  }
  
  const currentInitials = computed(() => getUserInitials(getCurrentUser()))
  
  const signNote = (noteText: string, options?: SignedNoteOptions) => {
    return formatSignedNote(noteText, getCurrentUser(), options)
  }
  
  const createNote = (content: string, noteType?: string) => {
    return createStructuredNote(content, getCurrentUser(), noteType)
  }
  
  return {
    currentUser: computed(() => getCurrentUser()),
    currentInitials,
    signNote,
    createNote,
    formatNoteTimestamp,
    parseSignedNote,
    appendSignedNote,
    hasSignature,
    formatNoteForDisplay,
    getUserInitials
  }
}
