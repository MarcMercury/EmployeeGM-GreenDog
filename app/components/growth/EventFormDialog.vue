<template>
  <v-dialog v-model="showDialog" max-width="800" scrollable>
    <v-card rounded="lg">
      <v-card-title class="bg-primary text-white py-4">
        <v-icon start>mdi-calendar-star</v-icon>
        {{ editMode ? 'Edit Event' : 'Create Event' }}
      </v-card-title>
      <v-card-text class="pt-6 scrollable-70vh">
        <v-form ref="eventForm" v-model="formValid">
          <!-- Basic Info Section -->
          <p class="text-overline text-grey mb-2">BASIC INFORMATION</p>
          <v-row>
            <v-col cols="12" sm="8">
              <v-text-field
                v-model="eventFormData.name"
                label="Event Name *"
                :rules="[v => !!v || 'Required']"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-select
                v-model="eventFormData.event_type"
                :items="eventTypes"
                item-title="title"
                item-value="value"
                label="Event Type"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="eventFormData.description"
                label="Description"
                variant="outlined"
                density="compact"
                rows="2"
              />
            </v-col>
          </v-row>

          <!-- Date & Time Section -->
          <v-divider class="my-4" />
          <p class="text-overline text-grey mb-2">DATE & LOCATION</p>
          <v-row>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="eventFormData.event_date"
                label="Event Date *"
                type="date"
                :rules="[v => !!v || 'Required']"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="6" sm="4">
              <v-text-field
                v-model="eventFormData.start_time"
                label="Start Time"
                type="time"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="6" sm="4">
              <v-text-field
                v-model="eventFormData.end_time"
                label="End Time"
                type="time"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="eventFormData.location"
                label="Location / Address"
                prepend-inner-icon="mdi-map-marker"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>

          <!-- Venue Contact Section -->
          <v-divider class="my-4" />
          <p class="text-overline text-grey mb-2">VENUE / ORGANIZER CONTACT</p>
          <v-row>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="eventFormData.contact_name"
                label="Contact Name"
                prepend-inner-icon="mdi-account"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="eventFormData.contact_phone"
                label="Contact Phone"
                prepend-inner-icon="mdi-phone"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="eventFormData.contact_email"
                label="Contact Email"
                prepend-inner-icon="mdi-email"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>

          <!-- Staffing & Logistics Section -->
          <v-divider class="my-4" />
          <p class="text-overline text-grey mb-2">STAFFING & LOGISTICS</p>
          <v-row>
            <v-col cols="12" sm="6">
              <v-textarea
                v-model="eventFormData.staffing_needs"
                label="Staffing Needs"
                placeholder="e.g., 2 technicians, 1 receptionist"
                variant="outlined"
                density="compact"
                rows="2"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-textarea
                v-model="eventFormData.supplies_needed"
                label="Supplies & Materials"
                placeholder="e.g., Brochures, banners, giveaways, dental models"
                variant="outlined"
                density="compact"
                rows="2"
              />
            </v-col>
            <v-col cols="6" sm="3">
              <v-text-field
                v-model.number="eventFormData.budget"
                label="Anticipated Spend ($)"
                type="number"
                prepend-inner-icon="mdi-currency-usd"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="6" sm="3">
              <v-text-field
                v-model.number="eventFormData.expected_attendance"
                label="Expected Attendance"
                type="number"
                prepend-inner-icon="mdi-account-group"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="6" sm="3">
              <v-select
                v-model="eventFormData.staffing_status"
                :items="[{ title: 'Planning', value: 'planned' }, { title: 'Confirmed', value: 'confirmed' }]"
                item-title="title"
                item-value="value"
                label="Staffing Status"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="6" sm="3">
              <v-select
                v-model="eventFormData.status"
                :items="statusOptions"
                item-title="title"
                item-value="value"
                label="Event Status"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>

          <!-- Event Host & Cost Section -->
          <v-divider class="my-4" />
          <p class="text-overline text-grey mb-2">EVENT HOST & COST</p>
          <v-row>
            <v-col cols="12" sm="8">
              <v-text-field
                v-model="eventFormData.hosted_by"
                label="Hosted By / Organizer"
                placeholder="e.g., Main Street Association, Chamber of Commerce"
                prepend-inner-icon="mdi-domain"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model.number="eventFormData.event_cost"
                label="Event Cost ($)"
                type="number"
                prepend-inner-icon="mdi-cash"
                hint="Booth fee, registration cost, etc."
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>

          <!-- Payment Section -->
          <v-divider class="my-4" />
          <p class="text-overline text-grey mb-2">PAYMENT DETAILS</p>
          <v-row>
            <v-col cols="12" sm="4">
              <v-select
                v-model="eventFormData.payment_status"
                :items="[
                  { title: 'Pending', value: 'pending' },
                  { title: 'Paid', value: 'paid' },
                  { title: 'Refunded', value: 'refunded' },
                  { title: 'Waived', value: 'waived' }
                ]"
                item-title="title"
                item-value="value"
                label="Payment Status"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="eventFormData.payment_date"
                label="Payment Date"
                type="date"
                variant="outlined"
                density="compact"
                :disabled="eventFormData.payment_status === 'pending'"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="eventFormData.vendor_status"
                label="Vendor Status"
                placeholder="e.g., Registration open, Waitlist"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>

          <!-- Expectations & Setup Section -->
          <v-divider class="my-4" />
          <p class="text-overline text-grey mb-2">EXPECTATIONS & PHYSICAL SETUP</p>
          <v-row>
            <v-col cols="12" sm="6">
              <v-textarea
                v-model="eventFormData.expectations"
                label="Expectations / Our Involvement"
                placeholder="What's our role? (sponsor, vendor, services, judges, etc.)"
                variant="outlined"
                density="compact"
                rows="3"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-textarea
                v-model="eventFormData.physical_setup"
                label="Physical Setup Details"
                placeholder="What we bring vs what's provided (tent, tables, chairs, lighting, etc.)"
                variant="outlined"
                density="compact"
                rows="3"
              />
            </v-col>
          </v-row>

          <!-- Communication Log Section -->
          <v-divider class="my-4" />
          <div class="d-flex align-center justify-space-between mb-2">
            <p class="text-overline text-grey mb-0">COMMUNICATION LOG</p>
            <v-btn 
              variant="tonal" 
              color="primary" 
              size="small" 
              prepend-icon="mdi-plus" 
              @click="addCommunicationEntry"
            >
              Add Entry
            </v-btn>
          </div>
          <v-row v-if="eventFormData.communication_log.length > 0">
            <v-col cols="12">
              <v-card 
                v-for="(entry, idx) in eventFormData.communication_log" 
                :key="idx" 
                variant="outlined" 
                class="mb-2 pa-3"
              >
                <v-row dense>
                  <v-col cols="12" sm="3">
                    <v-text-field
                      v-model="entry.date"
                      label="Date"
                      type="date"
                      variant="outlined"
                      density="compact"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12" sm="3">
                    <v-select
                      v-model="entry.type"
                      :items="['Email', 'Phone Call', 'Meeting', 'Payment', 'Other']"
                      label="Type"
                      variant="outlined"
                      density="compact"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-text-field
                      v-model="entry.contact"
                      label="Contact Person"
                      variant="outlined"
                      density="compact"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12" sm="2" class="d-flex align-center justify-end">
                    <v-btn icon="mdi-delete" color="error" variant="text" size="small" @click="removeCommunicationEntry(idx)" />
                  </v-col>
                  <v-col cols="12">
                    <v-text-field
                      v-model="entry.summary"
                      label="Summary"
                      placeholder="Brief description of communication"
                      variant="outlined"
                      density="compact"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12">
                    <v-textarea
                      v-model="entry.notes"
                      label="Notes"
                      placeholder="Additional details..."
                      variant="outlined"
                      density="compact"
                      rows="2"
                      hide-details
                    />
                  </v-col>
                </v-row>
              </v-card>
            </v-col>
          </v-row>
          <v-row v-else>
            <v-col cols="12">
              <div class="text-center text-grey py-3">
                <v-icon size="28" color="grey-lighten-2">mdi-message-text-outline</v-icon>
                <div class="text-caption mt-1">No communication entries. Click "Add Entry" to log communications.</div>
              </div>
            </v-col>
          </v-row>

          <!-- Registration Section -->
          <v-divider class="my-4" />
          <p class="text-overline text-grey mb-2">REGISTRATION</p>
          <v-row>
            <v-col cols="12" sm="4" class="d-flex align-center">
              <v-switch
                v-model="eventFormData.registration_required"
                label="Registration Required"
                color="primary"
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="8">
              <v-text-field
                v-model="eventFormData.registration_link"
                label="Registration URL"
                placeholder="https://..."
                prepend-inner-icon="mdi-link"
                variant="outlined"
                density="compact"
                :disabled="!eventFormData.registration_required"
              />
            </v-col>
          </v-row>

          <!-- Notes Section -->
          <v-divider class="my-4" />
          <p class="text-overline text-grey mb-2">NOTES & INSTRUCTIONS</p>
          <v-row>
            <v-col cols="12">
              <v-textarea
                v-model="eventFormData.notes"
                label="Planning Notes / Special Instructions"
                placeholder="Any special instructions, setup requirements, or important details..."
                variant="outlined"
                density="compact"
                rows="3"
              />
            </v-col>
          </v-row>

          <!-- Inventory Section -->
          <v-divider class="my-4" />
          <div class="d-flex align-center justify-space-between mb-2">
            <p class="text-overline text-grey mb-0">INVENTORY ITEMS</p>
            <v-btn 
              variant="tonal" 
              color="primary" 
              size="small" 
              prepend-icon="mdi-plus" 
              @click="addPlannedInventoryItem"
            >
              Add Item
            </v-btn>
          </div>
          <v-row v-if="eventFormData.planned_inventory.length > 0">
            <v-col cols="12">
              <v-card 
                v-for="(item, idx) in eventFormData.planned_inventory" 
                :key="idx" 
                variant="outlined" 
                class="mb-2 pa-3"
              >
                <div class="d-flex gap-2 align-center flex-wrap">
                  <v-autocomplete
                    v-model="item.inventory_item_id"
                    :items="inventoryItems"
                    item-title="item_name"
                    item-value="id"
                    label="Item"
                    variant="outlined"
                    density="compact"
                    style="flex: 2; min-width: 200px;"
                    hide-details
                    :loading="inventoryLoading"
                    @update:model-value="onPlannedInventorySelect(idx, $event)"
                  >
                    <template #item="{ props, item: invItem }">
                      <v-list-item v-bind="props">
                        <template #subtitle>{{ invItem.raw.category }} • Total: {{ invItem.raw.total_quantity }}</template>
                      </v-list-item>
                    </template>
                  </v-autocomplete>
                  <v-select
                    v-model="item.location"
                    :items="locationOptions"
                    label="Location"
                    variant="outlined"
                    density="compact"
                    style="flex: 1; min-width: 130px;"
                    hide-details
                  />
                  <v-text-field
                    v-model.number="item.quantity"
                    label="Qty"
                    type="number"
                    variant="outlined"
                    density="compact"
                    min="1"
                    style="flex: 0; min-width: 100px; max-width: 120px;"
                    hide-details
                  />
                  <div v-if="item.inventory_item_id" class="text-caption text-grey" style="min-width: 80px;">
                    Avail: {{ getPlannedItemAvailableQty(idx) }}
                  </div>
                  <v-btn icon="mdi-delete" color="error" variant="text" size="small" aria-label="Delete" @click="removePlannedInventoryItem(idx)" />
                </div>
              </v-card>
            </v-col>
          </v-row>
          <v-row v-else>
            <v-col cols="12">
              <div class="text-center text-grey py-4">
                <v-icon size="32" color="grey-lighten-2">mdi-package-variant-closed</v-icon>
                <div class="text-caption mt-1">No inventory items planned. Click "Add Item" to assign inventory.</div>
              </div>
            </v-col>
          </v-row>

          <!-- External Links Section -->
          <v-divider class="my-4" />
          <p class="text-overline text-grey mb-2">EXTERNAL LINKS</p>
          <v-row>
            <v-col cols="12">
              <div v-for="(link, idx) in eventFormData.external_links" :key="idx" class="d-flex gap-2 mb-2">
                <v-text-field
                  v-model="link.title"
                  label="Link Title"
                  variant="outlined"
                  density="compact"
                  style="flex: 1;"
                  hide-details
                />
                <v-text-field
                  v-model="link.url"
                  label="URL"
                  placeholder="https://..."
                  prepend-inner-icon="mdi-link"
                  variant="outlined"
                  density="compact"
                  style="flex: 2;"
                  hide-details
                />
                <v-btn icon="mdi-delete" color="error" variant="text" aria-label="Delete" @click="removeExternalLink(idx)" />
              </div>
              <v-btn variant="tonal" color="primary" size="small" prepend-icon="mdi-plus" @click="addExternalLink">
                Add Link
              </v-btn>
            </v-col>
          </v-row>

          <!-- Attachments Section -->
          <v-divider class="my-4" />
          <p class="text-overline text-grey mb-2">ATTACHMENTS</p>
          <v-row>
            <v-col cols="12">
              <!-- Existing Attachments -->
              <div v-if="eventFormData.attachments.length > 0" class="mb-3">
                <v-chip
                  v-for="(att, idx) in eventFormData.attachments"
                  :key="idx"
                  closable
                  class="mr-2 mb-2"
                  color="primary"
                  variant="tonal"
                  @click:close="removeAttachment(idx)"
                >
                  <v-icon start size="16">mdi-file-document</v-icon>
                  {{ att.name }}
                </v-chip>
              </div>
              
              <!-- File Upload -->
              <v-file-input
                v-model="newAttachments"
                label="Upload Documents"
                variant="outlined"
                density="compact"
                multiple
                chips
                show-size
                prepend-icon=""
                prepend-inner-icon="mdi-paperclip"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
                hint="Supported: PDF, Word, Excel, PowerPoint, Images"
                persistent-hint
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-card-actions class="px-6 pb-4">
        <v-spacer />
        <v-btn variant="text" @click="showDialog = false">Cancel</v-btn>
        <v-btn color="primary" :loading="saving" :disabled="!formValid" @click="saveEvent">
          {{ editMode ? 'Update' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { EventAttachment, ExternalLink, InventoryItem, InventoryUsedItem, MarketingEvent } from '~/types/marketing.types'

const client = useSupabaseClient()
const user = useSupabaseUser()

// ── Emits ────────────────────────────────────────────
const emit = defineEmits<{
  saved: []
  notify: [payload: { message: string; color: string }]
}>()

// ── Dialog state ─────────────────────────────────────
const showDialog = ref(false)
const editMode = ref(false)
const saving = ref(false)
const formValid = ref(false)
const editingEventId = ref<string | null>(null)

// ── Options ──────────────────────────────────────────
const eventTypes = [
  { title: 'General', value: 'general' },
  { title: 'CE Event', value: 'ce_event' },
  { title: 'Street Fair', value: 'street_fair' },
  { title: 'Open House', value: 'open_house' },
  { title: 'Adoption Event', value: 'adoption_event' },
  { title: 'Community Outreach', value: 'community_outreach' },
  { title: 'Health Fair', value: 'health_fair' },
  { title: 'School Visit', value: 'school_visit' },
  { title: 'Pet Expo', value: 'pet_expo' },
  { title: 'Fundraiser', value: 'fundraiser' },
  { title: 'Other', value: 'other' }
]

const statusOptions = [
  { title: 'Planned', value: 'planned' },
  { title: 'Confirmed', value: 'confirmed' },
  { title: 'Completed', value: 'completed' },
  { title: 'Cancelled', value: 'cancelled' }
]

const locationOptions = [
  { title: 'Venice', value: 'venice' },
  { title: 'Sherman Oaks', value: 'sherman_oaks' },
  { title: 'Valley', value: 'valley' },
  { title: 'MPMV (Mobile)', value: 'mpmv' },
  { title: 'Off-Site', value: 'offsite' }
]

// ── Form data ────────────────────────────────────────
const eventFormData = reactive({
  name: '',
  description: '',
  event_type: 'general',
  event_date: '',
  start_time: '',
  end_time: '',
  location: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  staffing_needs: '',
  supplies_needed: '',
  budget: null as number | null,
  expected_attendance: null as number | null,
  staffing_status: 'planned',
  status: 'planned',
  registration_required: false,
  registration_link: '',
  notes: '',
  hosted_by: '',
  event_cost: null as number | null,
  expectations: '',
  physical_setup: '',
  communication_log: [] as { date: string; type: string; contact: string; summary: string; notes?: string }[],
  vendor_status: '',
  payment_date: '',
  payment_status: 'pending',
  attachments: [] as EventAttachment[],
  external_links: [] as ExternalLink[],
  planned_inventory: [] as { inventory_item_id: string; item_name: string; quantity: number; location: string }[]
})

const newAttachments = ref<File[]>([])

// ── Inventory state ──────────────────────────────────
const inventoryItems = ref<InventoryItem[]>([])
const inventoryLoading = ref(false)

const fetchInventoryItems = async () => {
  inventoryLoading.value = true
  try {
    const { data, error } = await client
      .from('marketing_inventory')
      .select('id, item_name, category, quantity_venice, quantity_sherman_oaks, quantity_valley, quantity_mpmv, quantity_offsite, total_quantity')
      .order('item_name')

    if (error) throw error
    inventoryItems.value = data || []
  } catch (err) {
    console.error('Error fetching inventory:', err)
  } finally {
    inventoryLoading.value = false
  }
}

const getAvailableQuantity = (itemId: string, location: string): number => {
  const item = inventoryItems.value.find(i => i.id === itemId)
  if (!item) return 0
  const locationKey = `quantity_${location}` as keyof InventoryItem
  return (item[locationKey] as number) || 0
}

// ── Planned inventory helpers ────────────────────────
const addPlannedInventoryItem = () => {
  eventFormData.planned_inventory.push({
    inventory_item_id: '',
    item_name: '',
    quantity: 1,
    location: 'venice'
  })
}

const removePlannedInventoryItem = (index: number) => {
  eventFormData.planned_inventory.splice(index, 1)
}

const onPlannedInventorySelect = (index: number, itemId: string) => {
  const item = inventoryItems.value.find(i => i.id === itemId)
  if (item) {
    eventFormData.planned_inventory[index].item_name = item.item_name
  }
}

const getPlannedItemAvailableQty = (index: number): number => {
  const planned = eventFormData.planned_inventory[index]
  if (!planned || !planned.inventory_item_id || !planned.location) return 0
  return getAvailableQuantity(planned.inventory_item_id, planned.location)
}

// ── External links helpers ───────────────────────────
const addExternalLink = () => {
  eventFormData.external_links.push({ title: '', url: '', description: '' })
}

const removeExternalLink = (index: number) => {
  eventFormData.external_links.splice(index, 1)
}

// ── Communication log helpers ────────────────────────
const addCommunicationEntry = () => {
  eventFormData.communication_log.push({
    date: new Date().toISOString().split('T')[0],
    type: 'Email',
    contact: '',
    summary: '',
    notes: ''
  })
}

const removeCommunicationEntry = (index: number) => {
  eventFormData.communication_log.splice(index, 1)
}

// ── Attachment helpers ───────────────────────────────
const removeAttachment = (index: number) => {
  eventFormData.attachments.splice(index, 1)
}

// ── Reset form to defaults ───────────────────────────
const resetForm = () => {
  Object.assign(eventFormData, {
    name: '',
    description: '',
    event_type: 'general',
    event_date: '',
    start_time: '',
    end_time: '',
    location: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    staffing_needs: '',
    supplies_needed: '',
    budget: null,
    expected_attendance: null,
    staffing_status: 'planned',
    status: 'planned',
    registration_required: false,
    registration_link: '',
    notes: '',
    hosted_by: '',
    event_cost: null,
    expectations: '',
    physical_setup: '',
    communication_log: [],
    vendor_status: '',
    payment_date: '',
    payment_status: 'pending',
    attachments: [],
    external_links: [],
    planned_inventory: []
  })
  newAttachments.value = []
  editingEventId.value = null
}

// ── Public methods ───────────────────────────────────
const openCreate = async () => {
  editMode.value = false
  resetForm()

  if (inventoryItems.value.length === 0) {
    await fetchInventoryItems()
  }

  showDialog.value = true
}

const openEdit = async (event: MarketingEvent) => {
  editMode.value = true
  newAttachments.value = []
  editingEventId.value = event.id

  Object.assign(eventFormData, {
    name: event.name,
    description: event.description || '',
    event_type: event.event_type || 'general',
    event_date: event.event_date,
    start_time: event.start_time || '',
    end_time: event.end_time || '',
    location: event.location || '',
    contact_name: event.contact_name || '',
    contact_phone: event.contact_phone || '',
    contact_email: event.contact_email || '',
    staffing_needs: event.staffing_needs || '',
    supplies_needed: event.supplies_needed || '',
    budget: event.budget,
    expected_attendance: event.expected_attendance,
    staffing_status: event.staffing_status,
    status: event.status,
    registration_required: event.registration_required || false,
    registration_link: event.registration_link || '',
    notes: event.notes || '',
    hosted_by: event.hosted_by || '',
    event_cost: event.event_cost,
    expectations: event.expectations || '',
    physical_setup: event.physical_setup || '',
    communication_log: event.communication_log || [],
    vendor_status: event.vendor_status || '',
    payment_date: event.payment_date || '',
    payment_status: event.payment_status || 'pending',
    attachments: event.attachments || [],
    external_links: event.external_links || [],
    planned_inventory: []
  })

  if (inventoryItems.value.length === 0) {
    await fetchInventoryItems()
  }

  showDialog.value = true
}

// ── Save event ───────────────────────────────────────
const saveEvent = async () => {
  saving.value = true
  try {
    // Upload any new attachments first
    const uploadedAttachments: EventAttachment[] = [...eventFormData.attachments]

    if (newAttachments.value && newAttachments.value.length > 0) {
      for (const file of newAttachments.value) {
        const timestamp = Date.now()
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const filePath = `events/${timestamp}_${safeName}`

        console.log(`[Event] Uploading file: ${file.name} to path: ${filePath}`)

        const { data: uploadData, error: uploadError } = await client.storage
          .from('marketing-events')
          .upload(filePath, file)

        if (uploadError) {
          console.error('[Event] Upload error:', uploadError)
          emit('notify', { message: `Failed to upload ${file.name}: ${uploadError.message}`, color: 'error' })
          continue
        }

        console.log('[Event] File uploaded successfully:', uploadData)

        const { data: urlData } = client.storage
          .from('marketing-events')
          .getPublicUrl(filePath)

        console.log('[Event] Public URL:', urlData.publicUrl)

        uploadedAttachments.push({
          name: file.name,
          url: urlData.publicUrl,
          file_type: file.type,
          uploaded_at: new Date().toISOString()
        })
      }
    }

    // Filter out empty links
    const validLinks = eventFormData.external_links.filter(
      link => link.title && link.url
    )

    console.log('[Event] Saving with attachments:', uploadedAttachments)
    console.log('[Event] Saving with links:', validLinks)

    const eventPayload = {
      name: eventFormData.name,
      description: eventFormData.description || null,
      event_type: eventFormData.event_type,
      event_date: eventFormData.event_date,
      start_time: eventFormData.start_time || null,
      end_time: eventFormData.end_time || null,
      location: eventFormData.location || null,
      contact_name: eventFormData.contact_name || null,
      contact_phone: eventFormData.contact_phone || null,
      contact_email: eventFormData.contact_email || null,
      staffing_needs: eventFormData.staffing_needs || null,
      supplies_needed: eventFormData.supplies_needed || null,
      budget: eventFormData.budget,
      expected_attendance: eventFormData.expected_attendance,
      staffing_status: eventFormData.staffing_status,
      status: eventFormData.status,
      registration_required: eventFormData.registration_required,
      registration_link: eventFormData.registration_link || null,
      notes: eventFormData.notes || null,
      hosted_by: eventFormData.hosted_by || null,
      event_cost: eventFormData.event_cost,
      expectations: eventFormData.expectations || null,
      physical_setup: eventFormData.physical_setup || null,
      communication_log: eventFormData.communication_log,
      vendor_status: eventFormData.vendor_status || null,
      payment_date: eventFormData.payment_date || null,
      payment_status: eventFormData.payment_status,
      attachments: uploadedAttachments,
      external_links: validLinks
    }

    if (editMode.value && editingEventId.value) {
      const { error } = await client
        .from('marketing_events')
        .update(eventPayload)
        .eq('id', editingEventId.value)

      if (error) throw error
      emit('notify', { message: 'Event updated successfully', color: 'success' })
    } else {
      // Create new event
      const { data: newEvent, error } = await client
        .from('marketing_events')
        .insert(eventPayload)
        .select('id')
        .single()

      if (error) throw error

      // If there are planned inventory items, deduct them from stock
      if (newEvent && eventFormData.planned_inventory.length > 0) {
        const inventoryUsedList: InventoryUsedItem[] = []

        for (const item of eventFormData.planned_inventory) {
          if (item.inventory_item_id && item.quantity > 0) {
            try {
              const { data: usageId, error: deductError } = await client.rpc('deduct_inventory_for_event', {
                p_event_id: newEvent.id,
                p_inventory_item_id: item.inventory_item_id,
                p_quantity: item.quantity,
                p_location: item.location,
                p_notes: 'Added during event creation'
              })

              if (deductError) {
                console.error('Inventory deduction error:', deductError)
                emit('notify', { message: `Warning: Could not deduct ${item.item_name}`, color: 'warning' })
              } else {
                inventoryUsedList.push({
                  item_id: usageId || crypto.randomUUID(),
                  item_name: item.item_name,
                  quantity_used: item.quantity,
                  location: item.location,
                  inventory_item_id: item.inventory_item_id
                })
              }
            } catch (err) {
              console.error('Error deducting inventory:', err)
            }
          }
        }

        // Update event with inventory_used JSONB
        if (inventoryUsedList.length > 0) {
          await client
            .from('marketing_events')
            .update({ inventory_used: inventoryUsedList })
            .eq('id', newEvent.id)
        }
      }

      emit('notify', { message: 'Event created successfully', color: 'success' })
    }

    showDialog.value = false
    newAttachments.value = []
    emit('saved')
  } catch (error) {
    console.error('Error saving event:', error)
    emit('notify', { message: 'Failed to save event', color: 'error' })
  } finally {
    saving.value = false
  }
}

// ── Expose for parent ref ────────────────────────────
defineExpose({ openCreate, openEdit })
</script>
