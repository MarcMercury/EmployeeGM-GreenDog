<script setup lang="ts">
// Redirect to combined Events page, leads tab
definePageMeta({
  middleware: [(to, from) => navigateTo('/growth/events?tab=leads', { replace: true })]
})
</script>

<template>
  <div class="d-flex justify-center align-center min-h-50vh">
    <v-progress-circular indeterminate color="primary" />
  </div>
</template>
}

const saveLead = async () => {
  saving.value = true
  try {
    // Get source from event if selected
    let source = leadFormData.event_id
      ? events.value.find(e => e.id === leadFormData.event_id)?.name
      : null

    if (editMode.value && editingLead.value) {
      const { error } = await client
        .from('marketing_leads')
        .update({
          lead_name: leadFormData.lead_name,
          email: leadFormData.email || null,
          phone: leadFormData.phone || null,
          event_id: leadFormData.event_id,
          source: source,
          status: leadFormData.status,
          notes: leadFormData.notes || null
        })
        .eq('id', editingLead.value.id)

      if (error) throw error
      showNotification('Lead updated successfully')
    } else {
      const { error } = await client
        .from('marketing_leads')
        .insert({
          lead_name: leadFormData.lead_name,
          email: leadFormData.email || null,
          phone: leadFormData.phone || null,
          event_id: leadFormData.event_id,
          source: source,
          status: leadFormData.status,
          notes: leadFormData.notes || null
        })

      if (error) throw error
      showNotification('Lead added successfully')
    }

    leadDialog.value = false
    await fetchData()
  } catch (error) {
    console.error('Error saving lead:', error)
    showNotification('Failed to save lead', 'error')
  } finally {
    saving.value = false
  }
}

const updateStatus = async (lead: Lead, status: string) => {
  try {
    await client
      .from('marketing_leads')
      .update({ status })
      .eq('id', lead.id)

    lead.status = status
    showNotification('Status updated')
  } catch (error) {
    console.error('Error updating status:', error)
    showNotification('Failed to update status', 'error')
  }
}

const confirmDelete = (lead: Lead) => {
  leadToDelete.value = lead
  deleteDialog.value = true
}

const deleteLead = async () => {
  if (!leadToDelete.value) return

  deleting.value = true
  try {
    await client
      .from('marketing_leads')
      .delete()
      .eq('id', leadToDelete.value.id)

    deleteDialog.value = false
    showNotification('Lead deleted')
    await fetchData()
  } catch (error) {
    console.error('Error deleting lead:', error)
    showNotification('Failed to delete lead', 'error')
  } finally {
    deleting.value = false
  }
}

const exportCSV = () => {
  const data = filteredLeads.value
  if (data.length === 0) {
    showNotification('No leads to export', 'warning')
    return
  }

  // CSV headers
  const headers = ['Name', 'Email', 'Phone', 'Source', 'Status', 'Notes', 'Created']
  
  // CSV rows
  const rows = data.map(lead => [
    lead.lead_name,
    lead.email || '',
    lead.phone || '',
    lead.source || '',
    lead.status,
    (lead.notes || '').replace(/"/g, '""'),
    formatDate(lead.created_at)
  ])

  // Build CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  // Download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(link.href)

  showNotification(`Exported ${data.length} leads to CSV`)
}

const fetchData = async () => {
  loading.value = true
  try {
    const [leadsRes, eventsRes] = await Promise.all([
      client.from('marketing_leads').select(`
        *,
        source_event:source_event_id(id, name),
        prize_item:prize_inventory_item_id(id, name)
      `).order('created_at', { ascending: false }),
      client.from('marketing_events').select('id, name').order('name')
    ])

    leads.value = leadsRes.data || []
    events.value = eventsRes.data || []
  } catch (error) {
    console.error('Error fetching data:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>
