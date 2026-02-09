<template>
  <v-row>
    <!-- Active Assets -->
    <v-col cols="12">
      <v-card class="bg-white shadow-sm rounded-xl" elevation="0">
        <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
          <v-icon start size="20" color="warning">mdi-toolbox</v-icon>
          Assigned Assets
          <v-spacer />
          <v-chip size="x-small" variant="tonal" color="warning" class="mr-2">
            {{ activeAssets.length }} active
          </v-chip>
          <v-btn 
            v-if="isAdmin" 
            icon="mdi-plus" 
            size="x-small" 
            variant="tonal"
            color="primary"
            @click="emit('open-asset-dialog')"
          />
        </v-card-title>
        <v-card-text v-if="activeAssets.length > 0">
          <v-table density="compact" hover>
            <thead>
              <tr>
                <th class="text-left">Asset</th>
                <th class="text-left">Type</th>
                <th class="text-left">Serial #</th>
                <th class="text-left">Checked Out</th>
                <th class="text-left">Return By</th>
                <th v-if="isAdmin" class="text-center" style="width: 100px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="asset in activeAssets" :key="asset.id">
                <td>
                  <div class="d-flex align-center">
                    <v-avatar size="32" :color="getAssetTypeColor(asset.asset_type)" variant="tonal" class="mr-2">
                      <v-icon size="16">{{ getAssetTypeIcon(asset.asset_type) }}</v-icon>
                    </v-avatar>
                    <div>
                      <div class="text-body-2 font-weight-medium">{{ asset.asset_name }}</div>
                      <div v-if="asset.notes" class="text-caption text-grey">{{ asset.notes }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <v-chip :color="getAssetTypeColor(asset.asset_type)" size="x-small" variant="tonal">
                    {{ asset.asset_type }}
                  </v-chip>
                </td>
                <td class="text-caption text-grey">{{ asset.serial_number || '—' }}</td>
                <td class="text-caption text-grey">{{ formatDate(asset.checked_out_at) }}</td>
                <td>
                  <span v-if="asset.expected_return_date" class="text-caption text-grey">
                    {{ formatDate(asset.expected_return_date) }}
                  </span>
                  <span v-else class="text-caption text-grey">—</span>
                </td>
                <td v-if="isAdmin" class="text-center">
                  <v-btn 
                    variant="tonal"
                    color="success"
                    size="x-small"
                    @click="emit('return-asset', asset.id)"
                  >
                    <v-icon start size="14">mdi-keyboard-return</v-icon>
                    Return
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
        <v-card-text v-else class="text-center py-8">
          <v-icon size="48" color="grey-lighten-2">mdi-toolbox-outline</v-icon>
          <p class="text-body-2 text-grey mt-2">No assets currently assigned</p>
          <v-btn 
            v-if="isAdmin" 
            variant="tonal" 
            color="primary" 
            size="small" 
            class="mt-2"
            @click="emit('open-asset-dialog')"
          >
            <v-icon start>mdi-plus</v-icon>
            Assign Asset
          </v-btn>
        </v-card-text>
      </v-card>
    </v-col>

    <!-- Returned Assets History -->
    <v-col v-if="returnedAssets.length > 0" cols="12" md="6">
      <v-card class="bg-white shadow-sm rounded-xl" elevation="0">
        <v-card-title class="text-subtitle-1 font-weight-bold">
          <v-icon start size="20" color="success">mdi-check-circle</v-icon>
          Return History
          <v-spacer />
          <v-chip size="x-small" variant="tonal" color="success">
            {{ returnedAssets.length }} returned
          </v-chip>
        </v-card-title>
        <v-card-text>
          <v-list density="compact" class="bg-transparent">
            <v-list-item
              v-for="asset in returnedAssets"
              :key="asset.id"
              class="px-0"
            >
              <template #prepend>
                <v-avatar size="28" :color="getAssetTypeColor(asset.asset_type)" variant="tonal">
                  <v-icon size="14">{{ getAssetTypeIcon(asset.asset_type) }}</v-icon>
                </v-avatar>
              </template>
              <v-list-item-title class="text-body-2">{{ asset.asset_name }}</v-list-item-title>
              <v-list-item-subtitle class="text-caption text-grey">
                Returned {{ formatDate(asset.returned_at) }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-col>

    <!-- Asset Summary by Type -->
    <v-col cols="12" :md="returnedAssets.length > 0 ? 6 : 4">
      <v-card class="bg-white shadow-sm rounded-xl" elevation="0">
        <v-card-title class="text-subtitle-1 font-weight-bold">
          <v-icon start size="20" color="grey">mdi-chart-bar</v-icon>
          By Type
        </v-card-title>
        <v-card-text>
          <v-list density="compact" class="bg-transparent">
            <v-list-item 
              v-for="type in assetTypes" 
              :key="type"
              class="px-0"
            >
              <template #prepend>
                <v-icon :color="getAssetTypeColor(type)" size="18">{{ getAssetTypeIcon(type) }}</v-icon>
              </template>
              <v-list-item-title class="text-body-2">{{ type }}</v-list-item-title>
              <template #append>
                <v-chip size="x-small" variant="text">
                  {{ assets.filter(a => a.asset_type === type && !a.returned_at).length }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { formatDate } from '~/utils/rosterFormatters'

const props = defineProps<{
  assets: any[]
  isAdmin: boolean
}>()

const emit = defineEmits<{
  'open-asset-dialog': []
  'return-asset': [assetId: string]
}>()

const assetTypes = ['Key', 'Badge', 'Device', 'Equipment', 'Uniform', 'Other']

const activeAssets = computed(() => props.assets.filter(a => !a.returned_at))
const returnedAssets = computed(() => props.assets.filter(a => a.returned_at))

function getAssetTypeColor(type: string): string {
  const colors: Record<string, string> = {
    'Key': 'amber', 'Badge': 'primary', 'Device': 'info',
    'Equipment': 'teal', 'Uniform': 'purple', 'Other': 'grey'
  }
  return colors[type] || 'grey'
}

function getAssetTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    'Key': 'mdi-key', 'Badge': 'mdi-badge-account', 'Device': 'mdi-cellphone',
    'Equipment': 'mdi-wrench', 'Uniform': 'mdi-tshirt-crew', 'Other': 'mdi-package-variant'
  }
  return icons[type] || 'mdi-package-variant'
}
</script>
