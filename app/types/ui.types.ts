/**
 * UI Component Type Definitions
 *
 * Consolidated interfaces for reusable UI components.
 *
 * Source files:
 *   - app/components/ui/StatsRow.vue (StatItem)
 *   - app/components/ui/BulkActions.vue (BulkAction)
 *   - app/components/ui/ContactNotes.vue (ContactNote)
 *   - app/components/ui/MasterListLayout.vue (StatCard, TabItem)
 *   - app/components/ui/MasterListTable.vue (Column, ActionButton)
 *   - app/components/ui/ResponsiveTable.vue (Header)
 *   - app/components/ui/InlineEditCell.vue (SelectOption)
 *   - app/components/ui/ExportDialog.vue (ExportColumn)
 *   - app/components/ui/ExportMenu.vue (ExportColumn — duplicate)
 *   - app/composables/useTableExport.ts (ExportColumn — duplicate)
 *   - app/components/shared/CrmExportDialog.vue (ExportColumn — duplicate)
 */

/* ------------------------------------------------------------------ */
/** @section Stats & Metrics */
/* ------------------------------------------------------------------ */

export interface StatItem {
  id?: string
  value: number | string
  label: string
  color?: string
  icon?: string
  subtitle?: string
  subtitleColor?: string
  trend?: number
  format?: 'number' | 'currency' | 'percent' | 'compact' | 'none'
  onClick?: () => void
}

export interface StatCard {
  label: string
  value: string | number
  color?: string
  icon?: string
  variant?: 'default' | 'warning' | 'success' | 'error'
}

/* ------------------------------------------------------------------ */
/** @section Tables */
/* ------------------------------------------------------------------ */

export interface Column {
  key: string
  title: string
  sortable?: boolean
  width?: string
  align?: 'start' | 'center' | 'end'
}

export interface Header {
  title: string
  key: string
  sortable?: boolean
  width?: string | number
  align?: 'start' | 'center' | 'end'
}

export interface ActionButton {
  icon: string
  color?: string
  tooltip?: string
  action: string
  show?: (item: any) => boolean
}

export interface SelectOption {
  value: string | number
  title: string
  color?: string
}

/* ------------------------------------------------------------------ */
/** @section Bulk Operations */
/* ------------------------------------------------------------------ */

export interface BulkAction {
  id: string
  label: string
  icon: string
  color?: string
  permission?: string
  confirm?: boolean
  confirmMessage?: string
}

/* ------------------------------------------------------------------ */
/** @section Notes */
/* ------------------------------------------------------------------ */

export interface ContactNote {
  id: string
  contact_type: string
  contact_id: string
  enrollment_id?: string
  note: string
  note_type: string
  author_id?: string
  author_initials?: string
  author_name?: string
  visibility: string
  is_pinned: boolean
  created_at: string
  edited_at?: string
  edited_by_initials?: string
  transferred_from?: string
}

/* ------------------------------------------------------------------ */
/** @section Navigation */
/* ------------------------------------------------------------------ */

export interface TabItem {
  key: string
  label: string
  icon?: string
  count?: number
}

/* ------------------------------------------------------------------ */
/** @section Export */
/* ------------------------------------------------------------------ */

export interface ExportColumn {
  key: string
  title: string
  format?: (value: any, row: any) => string
}
