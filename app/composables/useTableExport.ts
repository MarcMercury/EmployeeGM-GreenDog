import type { ExportColumn } from '~/types/ui.types'

/**
 * useTableExport Composable
 * 
 * Provides one-click PDF/Excel export for any table
 * 
 * Usage:
 * const { exportToExcel, exportToPdf, exportToCsv, isExporting } = useTableExport()
 * 
 * exportToExcel(data, columns, 'roster-export')
 * exportToPdf(data, columns, 'Team Roster', 'roster-export')
 */

interface ExportOptions {
  filename?: string
  title?: string
  subtitle?: string
  includeTimestamp?: boolean
  orientation?: 'portrait' | 'landscape'
}

export function useTableExport() {
  const isExporting = ref(false)
  const toast = useToast()
  
  // Format value for export (handles dates, arrays, objects)
  function formatValue(value: unknown, format?: (v: unknown, r: unknown) => string, row?: unknown): string {
    if (format) {
      return format(value, row)
    }
    
    if (value === null || value === undefined) {
      return ''
    }
    
    if (Array.isArray(value)) {
      return value.join(', ')
    }
    
    if (typeof value === 'object') {
      // Handle common nested objects
      const obj = value as Record<string, unknown>
      if (obj.name) return String(obj.name)
      if (obj.title) return String(obj.title)
      if (obj.label) return String(obj.label)
      return JSON.stringify(value)
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }
    
    // Date detection and formatting
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }
    }
    
    return String(value)
  }
  
  // Generate CSV content
  function generateCsv(data: Record<string, unknown>[], columns: ExportColumn[]): string {
    // Header row
    const headers = columns.map(col => `"${col.title.replace(/"/g, '""')}"`).join(',')
    
    // Data rows
    const rows = data.map(row => {
      return columns.map(col => {
        const value = formatValue(row[col.key], col.format, row)
        // Escape quotes and wrap in quotes
        return `"${value.replace(/"/g, '""')}"`
      }).join(',')
    })
    
    return [headers, ...rows].join('\n')
  }
  
  // Export to CSV
  async function exportToCsv(
    data: Record<string, unknown>[], 
    columns: ExportColumn[], 
    options: ExportOptions = {}
  ): Promise<boolean> {
    isExporting.value = true
    
    try {
      const csv = generateCsv(data, columns)
      const timestamp = options.includeTimestamp !== false 
        ? `_${new Date().toISOString().split('T')[0]}` 
        : ''
      const filename = `${options.filename || 'export'}${timestamp}.csv`
      
      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      downloadBlob(blob, filename)
      
      toast.success(`Exported ${data.length} rows to CSV`)
      return true
    } catch (err) {
      console.error('[TableExport] CSV export failed:', err)
      toast.error('Failed to export CSV')
      return false
    } finally {
      isExporting.value = false
    }
  }
  
  // Export to Excel (using CSV format that Excel can open)
  async function exportToExcel(
    data: Record<string, unknown>[], 
    columns: ExportColumn[], 
    options: ExportOptions = {}
  ): Promise<boolean> {
    isExporting.value = true
    
    try {
      // Generate CSV content (Excel-compatible)
      const csv = generateCsv(data, columns)
      
      // Add BOM for proper UTF-8 encoding in Excel
      const bom = '\uFEFF'
      const timestamp = options.includeTimestamp !== false 
        ? `_${new Date().toISOString().split('T')[0]}` 
        : ''
      const filename = `${options.filename || 'export'}${timestamp}.xlsx`
      
      // Create blob with BOM
      const blob = new Blob([bom + csv], { type: 'application/vnd.ms-excel;charset=utf-8;' })
      downloadBlob(blob, filename)
      
      toast.success(`Exported ${data.length} rows to Excel`)
      return true
    } catch (err) {
      console.error('[TableExport] Excel export failed:', err)
      toast.error('Failed to export Excel')
      return false
    } finally {
      isExporting.value = false
    }
  }
  
  // Export to PDF (using browser print)
  async function exportToPdf(
    data: Record<string, unknown>[], 
    columns: ExportColumn[], 
    options: ExportOptions = {}
  ): Promise<boolean> {
    isExporting.value = true
    
    try {
      const title = options.title || 'Export'
      const subtitle = options.subtitle || `Generated on ${new Date().toLocaleDateString()}`
      const orientation = options.orientation || 'landscape'
      
      // Build HTML table
      const tableHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title}</title>
          <style>
            @page { size: ${orientation}; margin: 1cm; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 20px;
              color: #333;
            }
            h1 { 
              font-size: 24px; 
              margin-bottom: 4px;
              color: #1e293b;
            }
            .subtitle {
              font-size: 12px;
              color: #64748b;
              margin-bottom: 20px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              font-size: 11px;
            }
            th { 
              background: #f1f5f9; 
              padding: 10px 8px;
              text-align: left;
              font-weight: 600;
              border-bottom: 2px solid #e2e8f0;
              color: #475569;
            }
            td { 
              padding: 8px;
              border-bottom: 1px solid #e2e8f0;
              vertical-align: top;
            }
            tr:nth-child(even) { background: #f8fafc; }
            tr:hover { background: #f1f5f9; }
            .footer {
              margin-top: 20px;
              font-size: 10px;
              color: #94a3b8;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="subtitle">${subtitle} • ${data.length} records</div>
          <table>
            <thead>
              <tr>
                ${columns.map(col => `<th>${col.title}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  ${columns.map(col => `<td>${formatValue(row[col.key], col.format, row)}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            Green Dog Dental • Exported from Employee Management System
          </div>
        </body>
        </html>
      `
      
      // Open print window
      const printWindow = window.open('', '_blank', 'width=800,height=600')
      if (printWindow) {
        printWindow.document.write(tableHtml)
        printWindow.document.close()
        
        // Wait for content to load then print
        printWindow.onload = () => {
          printWindow.print()
        }
        
        // Fallback: print after short delay
        setTimeout(() => {
          printWindow.print()
        }, 500)
      }
      
      toast.success('PDF export opened in new window')
      return true
    } catch (err) {
      console.error('[TableExport] PDF export failed:', err)
      toast.error('Failed to export PDF')
      return false
    } finally {
      isExporting.value = false
    }
  }
  
  // Helper to trigger file download
  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
  
  // Quick export menu options
  const exportOptions = [
    { title: 'Export to Excel', icon: 'mdi-file-excel', action: 'excel', color: 'success' },
    { title: 'Export to CSV', icon: 'mdi-file-delimited', action: 'csv', color: 'info' },
    { title: 'Export to PDF', icon: 'mdi-file-pdf-box', action: 'pdf', color: 'error' }
  ]
  
  return {
    isExporting,
    exportToExcel,
    exportToCsv,
    exportToPdf,
    exportOptions,
    formatValue
  }
}
