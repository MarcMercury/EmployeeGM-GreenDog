<script setup lang="ts">
import type { ExportColumn } from '~/types/ui.types'

/**
 * ExportMenu Component
 * 
 * One-click export dropdown for tables
 * Supports Excel, CSV, and PDF exports
 */

interface Props {
  data: any[]
  columns: ExportColumn[]
  filename?: string
  title?: string
  disabled?: boolean
  size?: 'x-small' | 'small' | 'default' | 'large'
  variant?: 'flat' | 'text' | 'elevated' | 'tonal' | 'outlined' | 'plain'
  color?: string
  iconOnly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  filename: 'export',
  title: 'Data Export',
  disabled: false,
  size: 'small',
  variant: 'tonal',
  color: 'primary',
  iconOnly: false
})

const { can } = usePermissions()
const { isExporting, exportToExcel, exportToCsv, exportToPdf } = useTableExport()

const canExport = computed(() => can('export:data'))

async function handleExport(type: 'excel' | 'csv' | 'pdf') {
  const options = {
    filename: props.filename,
    title: props.title,
    includeTimestamp: true
  }
  
  switch (type) {
    case 'excel':
      await exportToExcel(props.data, props.columns, options)
      break
    case 'csv':
      await exportToCsv(props.data, props.columns, options)
      break
    case 'pdf':
      await exportToPdf(props.data, props.columns, options)
      break
  }
}
</script>

<template>
  <v-menu location="bottom end">
    <template #activator="{ props: menuProps }">
      <v-btn
        v-if="iconOnly"
        v-bind="menuProps"
        icon="mdi-download"
        :size="size"
        :variant="variant"
        :color="color"
        :disabled="disabled || !canExport || data.length === 0"
        :loading="isExporting"
      />
      <v-btn
        v-else
        v-bind="menuProps"
        :size="size"
        :variant="variant"
        :color="color"
        :disabled="disabled || !canExport || data.length === 0"
        :loading="isExporting"
        prepend-icon="mdi-download"
      >
        Export
        <v-icon end size="small">mdi-chevron-down</v-icon>
      </v-btn>
    </template>
    
    <v-list density="compact" min-width="180">
      <v-list-subheader>Export {{ data.length }} rows</v-list-subheader>
      
      <v-list-item
        prepend-icon="mdi-file-excel"
        @click="handleExport('excel')"
      >
        <v-list-item-title>Excel (.xlsx)</v-list-item-title>
      </v-list-item>
      
      <v-list-item
        prepend-icon="mdi-file-delimited"
        @click="handleExport('csv')"
      >
        <v-list-item-title>CSV (.csv)</v-list-item-title>
      </v-list-item>
      
      <v-list-item
        prepend-icon="mdi-file-pdf-box"
        @click="handleExport('pdf')"
      >
        <v-list-item-title>PDF (Print)</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
  
  <!-- Show request access if user can't export -->
  <UiRequestAccess
    v-if="!canExport"
    permission="export:data"
    mode="inline"
  />
</template>
