import { ref, computed } from 'vue'

interface UndoAction {
  type: 'assign' | 'remove' | 'bulk_assign' | 'bulk_remove'
  description: string
  data: any
  undo: () => Promise<void>
  redo: () => Promise<void>
}

const MAX_HISTORY = 30

export function useScheduleUndoRedo() {
  const undoStack = ref<UndoAction[]>([])
  const redoStack = ref<UndoAction[]>([])
  const isUndoing = ref(false)
  const isRedoing = ref(false)
  const lastActionLabel = ref('')

  const canUndo = computed(() => undoStack.value.length > 0 && !isUndoing.value && !isRedoing.value)
  const canRedo = computed(() => redoStack.value.length > 0 && !isUndoing.value && !isRedoing.value)

  function pushAction(action: UndoAction) {
    undoStack.value.push(action)
    if (undoStack.value.length > MAX_HISTORY) {
      undoStack.value.shift()
    }
    // Clear redo stack on new action
    redoStack.value = []
    lastActionLabel.value = action.description
  }

  async function undo() {
    if (!canUndo.value) return
    const action = undoStack.value.pop()
    if (!action) return

    isUndoing.value = true
    try {
      await action.undo()
      redoStack.value.push(action)
      lastActionLabel.value = `Undid: ${action.description}`
    } catch (err) {
      console.error('Undo failed:', err)
      // Put it back
      undoStack.value.push(action)
    } finally {
      isUndoing.value = false
    }
  }

  async function redo() {
    if (!canRedo.value) return
    const action = redoStack.value.pop()
    if (!action) return

    isRedoing.value = true
    try {
      await action.redo()
      undoStack.value.push(action)
      lastActionLabel.value = `Redid: ${action.description}`
    } catch (err) {
      console.error('Redo failed:', err)
      redoStack.value.push(action)
    } finally {
      isRedoing.value = false
    }
  }

  function clearHistory() {
    undoStack.value = []
    redoStack.value = []
    lastActionLabel.value = ''
  }

  return {
    undoStack,
    redoStack,
    isUndoing,
    isRedoing,
    canUndo,
    canRedo,
    lastActionLabel,
    pushAction,
    undo,
    redo,
    clearHistory
  }
}
