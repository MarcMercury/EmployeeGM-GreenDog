<script setup lang="ts">
import type { InventoryItem } from '~/types/marketing.types'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'marketing-admin']
})

const supabase = useSupabaseClient()
const route = useRoute()

// Filter state
const searchQuery = ref('')
const selectedCategory = ref<string | null>(null)
const showLowStockOnly = ref(false)

// Track collapsed category sections
const collapsedCategories = ref<Set<string>>(new Set())

function toggleCategory(category: string) {
  const newSet = new Set(collapsedCategories.value)
  if (newSet.has(category)) {
    newSet.delete(category)
  } else {
    newSet.add(category)
  }
  collapsedCategories.value = newSet
}

function isCategoryCollapsed(category: string): boolean {
  return collapsedCategories.value.has(category)
}

// Check URL for filter
onMounted(() => {
  if (route.query.filter === 'low_stock') {
    showLowStockOnly.value = true
  }
  if (route.query.action === 'add') {
    openAddDialog()
  }
})

const categoryOptions = [
  { title: 'All Categories', value: null },
  { title: 'Apparel', value: 'apparel' },
  { title: 'EMP Apparel', value: 'emp_apparel' },
  { title: 'Print', value: 'print' },
  { title: 'Prize', value: 'prize' },
  { title: 'Product', value: 'product' },
  { title: 'Supply', value: 'supply' },
  { title: 'Other', value: 'other' }
]

// Group inventory by category
const inventoryByCategory = computed(() => {
  const groups: Record<string, InventoryItem[]> = {}
  const items = filteredInventory.value || []
  
  // Define category order
  const categoryOrder = ['apparel', 'emp_apparel', 'print', 'prize', 'product', 'supply', 'other']
  
  items.forEach(item => {
    const cat = item.category || 'other'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(item)
  })
  
  // Sort by defined order
  const sorted: { category: string; items: InventoryItem[] }[] = []
  categoryOrder.forEach(cat => {
    if (groups[cat]?.length) {
      sorted.push({ category: cat, items: groups[cat] })
    }
  })
  
  // Add any remaining categories not in predefined order
  Object.keys(groups).forEach(cat => {
    if (!categoryOrder.includes(cat) && groups[cat]?.length) {
      sorted.push({ category: cat, items: groups[cat] })
    }
  })
  
  return sorted
})

// Fetch inventory
const { data: inventory, pending, refresh, error: inventoryError } = await useAsyncData('inventory', async () => {
  const { data, error } = await supabase
    .from('marketing_inventory')
    .select('*')
    .order('item_name')
  
  if (error) throw error
  return data as InventoryItem[]
})

// Filtered inventory
const filteredInventory = computed(() => {
  let result = inventory.value || []
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(i => 
      i.item_name.toLowerCase().includes(query) ||
      i.notes?.toLowerCase().includes(query)
    )
  }
  
  if (selectedCategory.value) {
    result = result.filter(i => i.category === selectedCategory.value)
  }
  
  if (showLowStockOnly.value) {
    result = result.filter(i => i.is_low_stock)
  }
  
  return result
})

// Stats
const stats = computed(() => ({
  total: inventory.value?.length || 0,
  lowStock: inventory.value?.filter(i => i.is_low_stock).length || 0,
  totalValue: inventory.value?.reduce((sum, i) => sum + (i.total_quantity * (i.unit_cost || 0)), 0) || 0,
  byCategory: categoryOptions.slice(1).map(cat => ({
    category: cat.title,
    count: inventory.value?.filter(i => i.category === cat.value).length || 0
  }))
}))

// Dialog state
const dialogOpen = ref(false)
const editingItem = ref<InventoryItem | null>(null)
const formData = ref({
  item_name: '',
  category: 'other',
  description: '',
  quantity_venice: 0,
  quantity_sherman_oaks: 0,
  quantity_valley: 0,
  quantity_mpmv: 0,
  quantity_offsite: 0,
  boxes_on_hand: null as number | null,
  units_per_box: null as number | null,
  reorder_point: 100,
  last_ordered: '',
  order_quantity: null as number | null,
  supplier: '',
  unit_cost: null as number | null,
  notes: ''
})

function openAddDialog() {
  editingItem.value = null
  formData.value = {
    item_name: '',
    category: 'other',
    description: '',
    quantity_venice: 0,
    quantity_sherman_oaks: 0,
    quantity_valley: 0,
    quantity_mpmv: 0,
    quantity_offsite: 0,
    boxes_on_hand: null,
    units_per_box: null,
    reorder_point: 100,
    last_ordered: '',
    order_quantity: null,
    supplier: '',
    unit_cost: null,
    notes: ''
  }
  dialogOpen.value = true
}

function openEditDialog(item: InventoryItem) {
  editingItem.value = item
  formData.value = {
    item_name: item.item_name,
    category: item.category,
    description: item.description || '',
    quantity_venice: item.quantity_venice,
    quantity_sherman_oaks: item.quantity_sherman_oaks,
    quantity_valley: item.quantity_valley,
    quantity_mpmv: item.quantity_mpmv,
    quantity_offsite: item.quantity_offsite,
    boxes_on_hand: item.boxes_on_hand,
    units_per_box: item.units_per_box,
    reorder_point: item.reorder_point,
    last_ordered: item.last_ordered || '',
    order_quantity: item.order_quantity,
    supplier: item.supplier || '',
    unit_cost: item.unit_cost,
    notes: item.notes || ''
  }
  dialogOpen.value = true
}

async function saveItem() {
  const payload = {
    item_name: formData.value.item_name,
    category: formData.value.category,
    description: formData.value.description || null,
    quantity_venice: formData.value.quantity_venice,
    quantity_sherman_oaks: formData.value.quantity_sherman_oaks,
    quantity_valley: formData.value.quantity_valley,
    quantity_mpmv: formData.value.quantity_mpmv,
    quantity_offsite: formData.value.quantity_offsite,
    boxes_on_hand: formData.value.boxes_on_hand,
    units_per_box: formData.value.units_per_box,
    reorder_point: formData.value.reorder_point,
    last_ordered: formData.value.last_ordered || null,
    order_quantity: formData.value.order_quantity,
    supplier: formData.value.supplier || null,
    unit_cost: formData.value.unit_cost,
    notes: formData.value.notes || null
  }
  
  if (editingItem.value) {
    await supabase
      .from('marketing_inventory')
      .update(payload)
      .eq('id', editingItem.value.id)
  } else {
    await supabase
      .from('marketing_inventory')
      .insert(payload)
  }
  
  dialogOpen.value = false
  refresh()
}

async function deleteItem(id: string) {
  if (!confirm('Are you sure you want to delete this item?')) return
  
  await supabase
    .from('marketing_inventory')
    .delete()
    .eq('id', id)
  
  refresh()
}

// Quick update quantity
async function updateQuantity(item: InventoryItem, location: 'venice' | 'sherman_oaks' | 'valley' | 'mpmv' | 'offsite', delta: number) {
  const field = `quantity_${location}` as keyof InventoryItem
  const currentValue = item[field] as number
  const newValue = Math.max(0, currentValue + delta)
  
  await supabase
    .from('marketing_inventory')
    .update({ [field]: newValue })
    .eq('id', item.id)
  
  refresh()
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    apparel: 'pink',
    emp_apparel: 'deep-purple',
    print: 'blue',
    prize: 'amber',
    product: 'green',
    supply: 'teal',
    other: 'grey'
  }
  return colors[category] || 'grey'
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    apparel: 'mdi-tshirt-crew',
    emp_apparel: 'mdi-account-hard-hat',
    print: 'mdi-file-document-multiple',
    prize: 'mdi-gift',
    product: 'mdi-package-variant-closed',
    supply: 'mdi-package-variant',
    other: 'mdi-dots-horizontal'
  }
  return icons[category] || 'mdi-package-variant'
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    apparel: 'Apparel',
    emp_apparel: 'Employee Apparel',
    print: 'Print Materials',
    prize: 'Prize Items',
    product: 'Products',
    supply: 'Supplies',
    other: 'Other'
  }
  return labels[category] || category
}

function getStockLevel(item: InventoryItem): { color: string; text: string } {
  const ratio = item.total_quantity / item.reorder_point
  if (ratio <= 0.5) return { color: 'error', text: 'Critical' }
  if (ratio <= 1) return { color: 'warning', text: 'Low' }
  if (ratio <= 2) return { color: 'info', text: 'Adequate' }
  return { color: 'success', text: 'Good' }
}
</script>

<template>
  <div>
    <!-- Data loading error -->
    <v-alert v-if="inventoryError" type="error" variant="tonal" class="mb-4" closable>
      Failed to load inventory data. Please try refreshing.
    </v-alert>

    <!-- Header -->
    <div class="d-flex align-center mb-4">
      <v-btn icon variant="text" aria-label="Go back" to="/marketing/command-center" class="mr-2">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <div>
        <h1 class="text-h4 font-weight-bold">Marketing Inventory Hub</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Track swag, materials, and supplies across locations
        </p>
      </div>
      <v-spacer />
      <v-btn
        color="warning"
        prepend-icon="mdi-package-variant-plus"
        @click="openAddDialog"
      >
        Add Item
      </v-btn>
    </div>

    <!-- Stats Row -->
    <v-row class="mb-4">
      <v-col cols="6" sm="6" md="3">
        <UiStatTile
          :value="stats.total"
          label="Total Items"
          color="primary"
          icon="mdi-package-variant"
        />
      </v-col>
      <v-col cols="6" sm="6" md="3">
        <UiStatTile
          :value="stats.lowStock"
          label="Low Stock Items"
          :color="stats.lowStock > 0 ? 'error' : 'success'"
          :icon="stats.lowStock > 0 ? 'mdi-alert' : 'mdi-check-circle'"
          :variant="stats.lowStock > 0 ? 'elevated' : 'tonal'"
        />
      </v-col>
      <v-col cols="12" sm="12" md="6">
        <v-card variant="outlined" class="h-100">
          <v-card-text class="d-flex flex-column justify-center">
            <div class="text-subtitle-2 mb-2">Items by Category</div>
            <div class="d-flex flex-wrap gap-1">
              <v-chip
                v-for="cat in stats.byCategory.filter(c => c.count > 0)"
                :key="cat.category"
                size="small"
                :color="getCategoryColor(cat.category.toLowerCase().replace(/ /g, '_'))"
                variant="tonal"
              >
                {{ cat.category }}: {{ cat.count }}
              </v-chip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filters -->
    <v-card class="mb-4" variant="outlined">
      <v-card-text class="py-3">
        <v-row dense align="center">
          <v-col cols="12" md="5">
            <v-text-field
              v-model="searchQuery"
              label="Search items..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="6" md="3">
            <v-select
              v-model="selectedCategory"
              :items="categoryOptions"
              label="Category"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="6" md="2">
            <v-switch
              v-model="showLowStockOnly"
              label="Low Stock Only"
              color="error"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="2" class="text-right">
            <v-chip :color="showLowStockOnly ? 'error' : 'primary'" variant="tonal">
              {{ filteredInventory.length }} Items
            </v-chip>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Inventory Table with Sticky Headers and Category Groups -->
    <v-card>
      <v-progress-linear v-if="pending" indeterminate color="warning" />
      
      <div v-if="filteredInventory.length > 0" class="inventory-table-container">
        <v-table hover class="inventory-table">
          <thead class="sticky-header">
            <tr>
              <th class="sticky-cell bg-grey-lighten-4">Item</th>
              <th class="text-center sticky-cell bg-grey-lighten-4">Venice</th>
              <th class="text-center sticky-cell bg-grey-lighten-4">Sherman Oaks</th>
              <th class="text-center sticky-cell bg-grey-lighten-4">Valley</th>
              <th class="text-center sticky-cell bg-grey-lighten-4">MPMV</th>
              <th class="text-center sticky-cell bg-grey-lighten-4">Off-Site</th>
              <th class="text-center sticky-cell bg-grey-lighten-4">Total</th>
              <th class="text-center sticky-cell bg-grey-lighten-4">Reorder</th>
              <th class="text-center sticky-cell bg-grey-lighten-4">Status</th>
              <th class="text-center sticky-cell bg-grey-lighten-4">Ordered</th>
              <th class="sticky-cell bg-grey-lighten-4"></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="group in inventoryByCategory" :key="group.category">
              <!-- Category Header Row -->
              <tr class="category-header" style="cursor: pointer;" @click="toggleCategory(group.category)">
                <td colspan="11" class="py-2 px-4 bg-grey-lighten-3">
                  <div class="d-flex align-center">
                    <v-icon size="20" class="mr-2">
                      {{ isCategoryCollapsed(group.category) ? 'mdi-chevron-right' : 'mdi-chevron-down' }}
                    </v-icon>
                    <v-avatar :color="getCategoryColor(group.category)" size="28" class="mr-3">
                      <v-icon size="16" color="white">{{ getCategoryIcon(group.category) }}</v-icon>
                    </v-avatar>
                    <span class="text-subtitle-1 font-weight-bold">{{ getCategoryLabel(group.category) }}</span>
                    <v-chip size="x-small" class="ml-2" variant="tonal">{{ group.items.length }}</v-chip>
                    <v-chip v-if="isCategoryCollapsed(group.category)" size="x-small" class="ml-2" color="info" variant="tonal">
                      Total: {{ group.items.reduce((sum, i) => sum + i.total_quantity, 0) }}
                    </v-chip>
                  </div>
                </td>
              </tr>
              <!-- Items in this category -->
              <tr
                v-for="item in group.items"
                v-show="!isCategoryCollapsed(group.category)"
                :key="item.id"
                :class="{ 'bg-error-lighten-5': item.is_low_stock }"
                style="cursor: pointer;"
                @click="openEditDialog(item)"
              >
                <td>
                  <div class="d-flex align-center py-2 pl-6">
                    <div>
                      <div class="font-weight-medium">{{ item.item_name }}</div>
                    </div>
                  </div>
                </td>
            <td class="text-center">
              <div class="d-flex align-center justify-center">
                <v-btn
                  icon
                  variant="text"
                  size="x-small"
                  @click.stop="updateQuantity(item, 'venice', -10)"
                >
                  <v-icon>mdi-minus</v-icon>
                </v-btn>
                <span class="mx-2 font-weight-medium" style="min-width: 40px;">
                  {{ item.quantity_venice }}
                </span>
                <v-btn
                  icon
                  variant="text"
                  size="x-small"
                  @click.stop="updateQuantity(item, 'venice', 10)"
                >
                  <v-icon>mdi-plus</v-icon>
                </v-btn>
              </div>
            </td>
            
            <!-- Sherman Oaks -->
            <td class="text-center">
              <div class="d-flex align-center justify-center">
                <v-btn
                  icon
                  variant="text"
                  size="x-small"
                  @click.stop="updateQuantity(item, 'sherman_oaks', -10)"
                >
                  <v-icon>mdi-minus</v-icon>
                </v-btn>
                <span class="mx-2 font-weight-medium" style="min-width: 40px;">
                  {{ item.quantity_sherman_oaks }}
                </span>
                <v-btn
                  icon
                  variant="text"
                  size="x-small"
                  @click.stop="updateQuantity(item, 'sherman_oaks', 10)"
                >
                  <v-icon>mdi-plus</v-icon>
                </v-btn>
              </div>
            </td>
            
            <!-- Valley -->
            <td class="text-center">
              <div class="d-flex align-center justify-center">
                <v-btn
                  icon
                  variant="text"
                  size="x-small"
                  @click.stop="updateQuantity(item, 'valley', -10)"
                >
                  <v-icon>mdi-minus</v-icon>
                </v-btn>
                <span class="mx-2 font-weight-medium" style="min-width: 40px;">
                  {{ item.quantity_valley }}
                </span>
                <v-btn
                  icon
                  variant="text"
                  size="x-small"
                  @click.stop="updateQuantity(item, 'valley', 10)"
                >
                  <v-icon>mdi-plus</v-icon>
                </v-btn>
              </div>
            </td>
            
            <!-- MPMV (Mobile) -->
            <td class="text-center">
              <div class="d-flex align-center justify-center">
                <v-btn
                  icon
                  variant="text"
                  size="x-small"
                  @click.stop="updateQuantity(item, 'mpmv', -10)"
                >
                  <v-icon>mdi-minus</v-icon>
                </v-btn>
                <span class="mx-2 font-weight-medium" style="min-width: 40px;">
                  {{ item.quantity_mpmv }}
                </span>
                <v-btn
                  icon
                  variant="text"
                  size="x-small"
                  @click.stop="updateQuantity(item, 'mpmv', 10)"
                >
                  <v-icon>mdi-plus</v-icon>
                </v-btn>
              </div>
            </td>
            
            <!-- Off-Site -->
            <td class="text-center">
              <div class="d-flex align-center justify-center">
                <v-btn
                  icon
                  variant="text"
                  size="x-small"
                  @click.stop="updateQuantity(item, 'offsite', -10)"
                >
                  <v-icon>mdi-minus</v-icon>
                </v-btn>
                <span class="mx-2 font-weight-medium" style="min-width: 40px;">
                  {{ item.quantity_offsite }}
                </span>
                <v-btn
                  icon
                  variant="text"
                  size="x-small"
                  @click.stop="updateQuantity(item, 'offsite', 10)"
                >
                  <v-icon>mdi-plus</v-icon>
                </v-btn>
              </div>
            </td>
            
            <!-- Total -->
            <td class="text-center">
              <span
                class="font-weight-bold"
                :class="{
                  'text-error': item.is_low_stock,
                  'text-success': !item.is_low_stock
                }"
              >
                {{ item.total_quantity }}
              </span>
            </td>
            
            <!-- Reorder Point -->
            <td class="text-center text-medium-emphasis">
              {{ item.reorder_point }}
            </td>
            
            <!-- Status -->
            <td class="text-center">
              <v-chip
                size="small"
                :color="getStockLevel(item).color"
                variant="flat"
              >
                <v-icon v-if="item.is_low_stock" start size="small">mdi-alert</v-icon>
                {{ getStockLevel(item).text }}
              </v-chip>
            </td>
            
            <!-- Last Ordered -->
            <td class="text-center text-caption">
              {{ item.last_ordered ? new Date(item.last_ordered).toLocaleDateString() : '—' }}
            </td>
            
            <td>
              <v-btn
                icon
                variant="text"
                size="small"
                color="error"
                @click.stop="deleteItem(item.id)"
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </td>
          </tr>
            </template>
        </tbody>
      </v-table>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-12">
        <v-icon size="64" color="grey-lighten-1">mdi-package-variant-closed</v-icon>
        <div class="text-h6 mt-4">No inventory items found</div>
        <div class="text-body-2 text-medium-emphasis">
          {{ searchQuery || selectedCategory || showLowStockOnly ? 'Try adjusting your filters' : 'Add your first item to get started' }}
        </div>
        <v-btn
          v-if="!searchQuery && !selectedCategory && !showLowStockOnly"
          color="warning"
          class="mt-4"
          @click="openAddDialog"
        >
          Add Item
        </v-btn>
      </div>
    </v-card>

    <!-- Add/Edit Dialog -->
    <v-dialog v-model="dialogOpen" max-width="700" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">{{ editingItem ? 'mdi-pencil' : 'mdi-package-variant-plus' }}</v-icon>
          {{ editingItem ? 'Edit Item' : 'Add Inventory Item' }}
          <v-spacer />
          <v-btn icon variant="text" aria-label="Close" @click="dialogOpen = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        
        <v-divider />
        
        <v-card-text>
          <v-row>
            <v-col cols="12" md="8">
              <v-text-field
                v-model="formData.item_name"
                label="Item Name *"
                variant="outlined"
                required
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-select
                v-model="formData.category"
                :items="categoryOptions.filter(c => c.value !== null)"
                label="Category *"
                variant="outlined"
              />
            </v-col>
            
            <v-col cols="12">
              <v-textarea
                v-model="formData.description"
                label="Description"
                variant="outlined"
                rows="2"
              />
            </v-col>
            
            <v-col cols="12">
              <v-divider class="my-2" />
              <div class="text-subtitle-2 text-medium-emphasis mb-2">Quantities by Location</div>
            </v-col>
            
            <v-col cols="4">
              <v-text-field
                v-model.number="formData.quantity_venice"
                label="Venice"
                variant="outlined"
                type="number"
                prepend-inner-icon="mdi-beach"
              />
            </v-col>
            <v-col cols="4">
              <v-text-field
                v-model.number="formData.quantity_sherman_oaks"
                label="Sherman Oaks"
                variant="outlined"
                type="number"
                prepend-inner-icon="mdi-tree"
              />
            </v-col>
            <v-col cols="4">
              <v-text-field
                v-model.number="formData.quantity_valley"
                label="Valley"
                variant="outlined"
                type="number"
                prepend-inner-icon="mdi-terrain"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="formData.quantity_mpmv"
                label="MPMV (Mobile)"
                variant="outlined"
                type="number"
                prepend-inner-icon="mdi-van-utility"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="formData.quantity_offsite"
                label="Off-Site"
                variant="outlined"
                type="number"
                prepend-inner-icon="mdi-map-marker-outline"
              />
            </v-col>
            
            <v-col cols="6" md="3">
              <v-text-field
                v-model.number="formData.boxes_on_hand"
                label="Boxes"
                variant="outlined"
                type="number"
                density="compact"
              />
            </v-col>
            <v-col cols="6" md="3">
              <v-text-field
                v-model.number="formData.units_per_box"
                label="Units/Box"
                variant="outlined"
                type="number"
                density="compact"
              />
            </v-col>
            <v-col cols="6" md="3">
              <v-text-field
                v-model.number="formData.reorder_point"
                label="Reorder Point *"
                variant="outlined"
                type="number"
                density="compact"
              />
            </v-col>
            <v-col cols="6" md="3">
              <v-text-field
                v-model.number="formData.unit_cost"
                label="Unit Cost ($)"
                variant="outlined"
                type="number"
                density="compact"
                prefix="$"
              />
            </v-col>
            
            <v-col cols="12">
              <v-divider class="my-2" />
              <div class="text-subtitle-2 text-medium-emphasis mb-2">Ordering Information</div>
            </v-col>
            
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.supplier"
                label="Supplier"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.last_ordered"
                label="Last Ordered"
                variant="outlined"
                density="compact"
                type="date"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model.number="formData.order_quantity"
                label="Order Quantity"
                variant="outlined"
                density="compact"
                type="number"
              />
            </v-col>
            
            <v-col cols="12">
              <v-textarea
                v-model="formData.notes"
                label="Notes"
                variant="outlined"
                rows="2"
              />
            </v-col>
          </v-row>
        </v-card-text>
        
        <v-divider />
        
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialogOpen = false">Cancel</v-btn>
          <v-btn color="warning" @click="saveItem">
            {{ editingItem ? 'Save Changes' : 'Add Item' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.pulse-alert {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.bg-error-lighten-5 {
  background-color: rgba(var(--v-theme-error), 0.05) !important;
}

/* Sticky header styles for inventory table */
.inventory-table-container {
  position: relative;
  max-height: calc(100vh - 300px);
  overflow: auto !important;
}

.inventory-table-container :deep(.v-table) {
  overflow: visible !important;
}

.inventory-table-container :deep(.v-table__wrapper) {
  overflow: visible !important;
}

.inventory-table-container :deep(table) {
  border-collapse: separate;
  border-spacing: 0;
}

.inventory-table-container :deep(thead) {
  position: sticky !important;
  top: 0 !important;
  z-index: 10 !important;
}

.inventory-table-container :deep(thead tr) {
  position: sticky !important;
  top: 0 !important;
  z-index: 10 !important;
}

.inventory-table-container :deep(thead th),
.inventory-table-container :deep(.sticky-header th),
.inventory-table-container :deep(.sticky-cell) {
  position: sticky !important;
  top: 0 !important;
  background: #f5f5f5 !important;
  border-bottom: 2px solid #e0e0e0 !important;
  font-weight: 600 !important;
  z-index: 10 !important;
}

.inventory-table .sticky-header {
  position: sticky !important;
  top: 0 !important;
  z-index: 10 !important;
}

.inventory-table .sticky-header th {
  position: sticky !important;
  top: 0 !important;
  background: #f5f5f5 !important;
  border-bottom: 2px solid #e0e0e0 !important;
  font-weight: 600 !important;
  z-index: 10 !important;
}

.inventory-table .sticky-cell {
  background: #f5f5f5 !important;
  border-bottom: 2px solid #e0e0e0 !important;
  font-weight: 600 !important;
}

.category-header {
  background: #eeeeee;
  user-select: none;
}

.category-header:hover {
  background: #e0e0e0;
}

.category-header td {
  font-weight: bold;
  border-top: 2px solid #bdbdbd;
}
</style>
