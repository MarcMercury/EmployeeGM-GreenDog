import { ref, onMounted, onUnmounted } from 'vue'

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  description: string
  action: () => void
  category: 'navigation' | 'editing' | 'actions' | 'view'
}

export function useScheduleKeyboardShortcuts() {
  const isHelpVisible = ref(false)
  const shortcuts = ref<KeyboardShortcut[]>([])

  function registerShortcuts(newShortcuts: KeyboardShortcut[]) {
    shortcuts.value = newShortcuts
  }

  function getComboLabel(shortcut: KeyboardShortcut): string {
    const parts: string[] = []
    if (shortcut.ctrl) parts.push('Ctrl')
    if (shortcut.alt) parts.push('Alt')
    if (shortcut.shift) parts.push('Shift')
    parts.push(shortcut.key.toUpperCase())
    return parts.join(' + ')
  }

  function handleKeydown(e: KeyboardEvent) {
    // Don't capture when typing in inputs
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

    // Toggle help with ?
    if (e.key === '?' && !e.ctrlKey && !e.altKey) {
      e.preventDefault()
      isHelpVisible.value = !isHelpVisible.value
      return
    }

    // Escape closes help
    if (e.key === 'Escape' && isHelpVisible.value) {
      isHelpVisible.value = false
      return
    }

    for (const shortcut of shortcuts.value) {
      const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey)
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey
      const altMatch = shortcut.alt ? e.altKey : !e.altKey
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()

      if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
        e.preventDefault()
        shortcut.action()
        return
      }
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })

  return {
    shortcuts,
    isHelpVisible,
    registerShortcuts,
    getComboLabel
  }
}
