<template>
  <v-card variant="outlined">
    <v-card-title class="d-flex align-center justify-space-between py-3">
      <div class="d-flex align-center">
        <v-icon start color="primary">mdi-package-variant</v-icon>
        <span>Event Supplies</span>
      </div>
      <v-btn
        color="primary"
        size="small"
        variant="tonal"
        prepend-icon="mdi-plus"
        @click="openAddSupplyDialog"
      >
        Add Supply
      </v-btn>
    </v-card-title>

    <v-divider />

    <!-- Budget Summary -->
    <v-card-text class="pb-0">
      <v-row dense>
        <v-col cols="4">
          <div class="text-center">
            <div class="text-caption text-grey">Total Budget</div>
            <div class="text-h6 font-weight-bold">${{ formatCurrency(eventBudget) }}</div>
          </div>
        </v-col>
        <v-col cols="4">
          <div class="text-center">
            <div class="text-caption text-grey">Supplies Used</div>
            <div class="text-h6 font-weight-bold text-warning">${{ formatCurrency(totalSuppliesCost) }}</div>
          </div>
        </v-col>
        <v-col cols="4">
          <div class="text-center">
            <div class="text-caption text-grey">Remaining</div>
            <div class="text-h6 font-weight-bold" :class="remainingBudget < 0 ? 'text-error' : 'text-success'">
              ${{ formatCurrency(remainingBudget) }}
            </div>
          </div>
        </v-col>
      </v-row>
      <v-progress-linear
        :model-value="budgetUsagePercent"
        :color="budgetUsagePercent > 100 ? 'error' : budgetUsagePercent > 80 ? 'warning' : 'success'"
        height="6"
        rounded
        class="mt-3"
      />
    </v-card-text>

    <!-- Assigned Supplies List -->
    <v-card-text>
      <v-list v-if="eventSupplies.length > 0" density="compact" class="bg-transparent">
        <v-list-item
          v-for="item in eventSupplies"
          :key="item.id"
          class="px-0"
        >
          <template #prepend>
            <v-avatar size="32" :color="getCategoryColor(item.supply?.category)" variant="tonal">
              <v-icon size="16">{{ getCategoryIcon(item.supply?.category) }}</v-icon>
            </v-avatar>
          </template>

          <v-list-item-title class="text-body-2 font-weight-medium">
            {{ item.supply?.name || 'Unknown' }}
          </v-list-item-title>
          <v-list-item-subtitle class="text-caption">
            {{ item.quantity_allocated }} × ${{ formatCurrency(item.unit_cost_at_time) }} = ${{ formatCurrency(item.total_cost) }}
          </v-list-item-subtitle>

          <template #append>
            <div class="d-flex align-center">
              <v-text-field
                :model-value="item.quantity_used ?? item.quantity_allocated"
                type="number"
                density="compact"
                variant="outlined"
                hide-details
                style="width: 70px"
                class="mr-2"
                label="Used"
                @update:model-value="updateQuantityUsed(item, $event)"
              />
              <v-btn
                icon="mdi-delete"
                size="x-small"
                variant="text"
                color="error"
                @click="removeSupply(item)"
              />
            </div>
          </template>
        </v-list-item>
      </v-list>

      <div v-else class="text-center py-4 text-grey">
        <v-icon size="40" class="mb-2">mdi-package-variant-closed</v-icon>
        <div>No supplies assigned to this event</div>
      </div>
    </v-card-text>

    <!-- Add Supply Dialog -->
    <v-dialog v-model="addSupplyDialog" max-width="500">
      <v-card>
        <v-card-title class="bg-primary text-white py-4">
          <v-icon start>mdi-plus</v-icon>
          Add Supply to Event
        </v-card-title>

        <v-card-text class="pt-6">
          <v-autocomplete
            v-model="selectedSupply"
            :items="availableSupplies"
            item-title="name"
            item-value="id"
            label="Select Supply"
            variant="outlined"
            density="compact"
            return-object
            class="mb-3"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props">
                <template #subtitle>
                  {{ item.raw.category }} • ${{ formatCurrency(item.raw.unit_cost) }} each • {{ item.raw.quantity_on_hand }} in stock
                </template>
              </v-list-item>
            </template>
          </v-autocomplete>

          <v-text-field
            v-model.number="quantityToAdd"
            type="number"
            label="Quantity"
            variant="outlined"
            density="compact"
            min="1"
            :max="selectedSupply?.quantity_on_hand || 999"
            class="mb-3"
          />

          <v-alert
            v-if="selectedSupply"
            type="info"
            variant="tonal"
            density="compact"
            class="mb-0"
          >
            Cost: ${{ formatCurrency((selectedSupply?.unit_cost || 0) * quantityToAdd) }}
            <br />
            Stock available: {{ selectedSupply?.quantity_on_hand || 0 }}
          </v-alert>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="addSupplyDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :disabled="!selectedSupply || quantityToAdd < 1"
            :loading="saving"
            @click="addSupply"
          >
            Add Supply
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
interface Supply {
  id: string
  name: string
  category: string
  unit_cost: number
  quantity_on_hand: number
}

interface EventSupply {
  id: string
  event_id: string
  supply_id: string
  quantity_allocated: number
  quantity_used: number | null
  unit_cost_at_time: number
  total_cost: number
  supply?: Supply
}

const props = defineProps<{
  eventId: string
  eventBudget: number
}>()

const emit = defineEmits<{
  (e: 'update:budget-used', value: number): void
}>()

const client = useSupabaseClient()
const toast = useToast()

const eventSupplies = ref<EventSupply[]>([])
const availableSupplies = ref<Supply[]>([])
const loading = ref(false)
const saving = ref(false)
const addSupplyDialog = ref(false)
const selectedSupply = ref<Supply | null>(null)
const quantityToAdd = ref(1)

const totalSuppliesCost = computed(() => {
  return eventSupplies.value.reduce((sum, item) => sum + (item.total_cost || 0), 0)
})

const remainingBudget = computed(() => {
  return (props.eventBudget || 0) - totalSuppliesCost.value
})

const budgetUsagePercent = computed(() => {
  if (!props.eventBudget) return 0
  return (totalSuppliesCost.value / props.eventBudget) * 100
})

const formatCurrency = (value: number | null) => {
  return (value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const getCategoryColor = (category: string | undefined) => {
  const colors: Record<string, string> = {
    print: 'blue',
    swag: 'purple',
    display: 'orange',
    treats: 'green',
    general: 'grey'
  }
  return colors[category || 'general'] || 'grey'
}

const getCategoryIcon = (category: string | undefined) => {
  const icons: Record<string, string> = {
    print: 'mdi-printer',
    swag: 'mdi-gift',
    display: 'mdi-presentation',
    treats: 'mdi-cookie',
    general: 'mdi-package-variant'
  }
  return icons[category || 'general'] || 'mdi-package-variant'
}

const fetchEventSupplies = async () => {
  loading.value = true
  try {
    const { data, error } = await client
      .from('event_supplies')
      .select(`
        *,
        supply:marketing_supplies(id, name, category, unit_cost, quantity_on_hand)
      `)
      .eq('event_id', props.eventId)

    if (error) throw error
    eventSupplies.value = data || []
    emit('update:budget-used', totalSuppliesCost.value)
  } catch (err) {
    console.error('Error fetching event supplies:', err)
  } finally {
    loading.value = false
  }
}

const fetchAvailableSupplies = async () => {
  try {
    const { data, error } = await client
      .from('marketing_supplies')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) throw error
    availableSupplies.value = data || []
  } catch (err) {
    console.error('Error fetching supplies:', err)
  }
}

const openAddSupplyDialog = () => {
  selectedSupply.value = null
  quantityToAdd.value = 1
  addSupplyDialog.value = true
}

const addSupply = async () => {
  if (!selectedSupply.value) return

  saving.value = true
  try {
    const { error } = await client
      .from('event_supplies')
      .insert({
        event_id: props.eventId,
        supply_id: selectedSupply.value.id,
        quantity_allocated: quantityToAdd.value,
        unit_cost_at_time: selectedSupply.value.unit_cost
      })

    if (error) throw error

    toast.success('Supply added to event')
    addSupplyDialog.value = false
    await fetchEventSupplies()
  } catch (err) {
    console.error('Error adding supply:', err)
    toast.error('Failed to add supply')
  } finally {
    saving.value = false
  }
}

const updateQuantityUsed = async (item: EventSupply, value: number | string) => {
  const qty = typeof value === 'string' ? parseInt(value) : value
  try {
    const { error } = await client
      .from('event_supplies')
      .update({ quantity_used: qty })
      .eq('id', item.id)

    if (error) throw error
    
    item.quantity_used = qty
    await fetchEventSupplies() // Refresh to get updated total_cost
  } catch (err) {
    console.error('Error updating quantity:', err)
  }
}

const removeSupply = async (item: EventSupply) => {
  try {
    const { error } = await client
      .from('event_supplies')
      .delete()
      .eq('id', item.id)

    if (error) throw error

    toast.success('Supply removed')
    await fetchEventSupplies()
  } catch (err) {
    console.error('Error removing supply:', err)
    toast.error('Failed to remove supply')
  }
}

onMounted(() => {
  fetchEventSupplies()
  fetchAvailableSupplies()
})

watch(() => props.eventId, () => {
  fetchEventSupplies()
})
</script>
