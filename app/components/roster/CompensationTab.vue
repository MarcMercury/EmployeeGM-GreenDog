<template>
  <v-row>
    <!-- Pay Details Widget -->
    <v-col cols="12" md="6">
      <v-card class="bg-white shadow-sm rounded-xl h-100" elevation="0">
        <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
          <v-icon start size="20" color="success">mdi-cash</v-icon>
          Pay Details
          <v-spacer />
          <v-btn 
            v-if="isAdmin" 
            icon="mdi-pencil" 
            size="x-small" 
            variant="text"
            @click="emit('open-compensation-dialog')"
          />
        </v-card-title>
        <v-card-text>
          <div v-if="compensation">
            <!-- Pay Rate Display -->
            <div class="pay-rate-display text-center py-4 mb-4 bg-grey-lighten-4 rounded-lg">
              <div class="text-h3 font-weight-bold text-success">
                ${{ formatPayRate(compensation.pay_rate) }}
              </div>
              <div class="text-body-2 text-grey">
                {{ compensation.pay_type === 'Hourly' ? 'per hour' : 'per year' }}
              </div>
            </div>

            <!-- Details List -->
            <v-list density="compact" class="bg-transparent">
              <v-list-item class="px-0">
                <template #prepend>
                  <v-icon size="18" color="grey">mdi-briefcase-variant</v-icon>
                </template>
                <v-list-item-title class="text-body-2">Pay Type</v-list-item-title>
                <template #append>
                  <span class="text-body-2 font-weight-medium">{{ compensation.pay_type || 'Not Set' }}</span>
                </template>
              </v-list-item>
              <v-list-item class="px-0">
                <template #prepend>
                  <v-icon size="18" color="grey">mdi-account-group</v-icon>
                </template>
                <v-list-item-title class="text-body-2">Employment Status</v-list-item-title>
                <template #append>
                  <v-chip size="x-small" variant="tonal" color="primary">
                    {{ compensation.employment_status || 'Not Set' }}
                  </v-chip>
                </template>
              </v-list-item>
              <v-list-item class="px-0">
                <template #prepend>
                  <v-icon size="18" color="grey">mdi-calendar-check</v-icon>
                </template>
                <v-list-item-title class="text-body-2">Effective Date</v-list-item-title>
                <template #append>
                  <span class="text-body-2">{{ formatDate(compensation.effective_date) }}</span>
                </template>
              </v-list-item>
            </v-list>
          </div>
          <div v-else class="text-center py-6">
            <v-icon size="48" color="grey-lighten-2">mdi-cash-remove</v-icon>
            <p class="text-body-2 text-grey mt-2">No compensation data</p>
            <v-btn 
              v-if="isAdmin" 
              variant="tonal" 
              color="primary" 
              size="small" 
              class="mt-2"
              @click="emit('open-compensation-dialog')"
            >
              <v-icon start>mdi-plus</v-icon>
              Add Compensation
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <!-- CE Budget Tracker Widget -->
    <v-col cols="12" md="6">
      <v-card class="bg-white shadow-sm rounded-xl h-100" elevation="0">
        <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
          <v-icon start size="20" color="info">mdi-school</v-icon>
          CE Budget ({{ currentYear }})
        </v-card-title>
        <v-card-text>
          <div v-if="compensation && compensation.ce_budget_total > 0">
            <!-- Progress Display -->
            <div class="ce-progress mb-4">
              <div class="d-flex justify-space-between mb-2">
                <span class="text-body-2">Budget Used</span>
                <span class="text-body-2 font-weight-bold">
                  ${{ (compensation.ce_budget_used || 0).toFixed(2) }} / ${{ compensation.ce_budget_total.toFixed(2) }}
                </span>
              </div>
              <v-progress-linear
                :model-value="ceUsagePercent"
                :color="ceUsagePercent > 80 ? 'warning' : 'success'"
                height="12"
                rounded
              />
              <div class="d-flex justify-space-between mt-2">
                <span class="text-caption text-grey">
                  {{ ceUsagePercent.toFixed(0) }}% used
                </span>
                <span :class="ceRemaining < 100 ? 'text-warning' : 'text-success'" class="text-caption font-weight-bold">
                  ${{ ceRemaining.toFixed(2) }} remaining
                </span>
              </div>
            </div>

            <!-- Quick Stats -->
            <v-divider class="my-3" />
            <div class="d-flex justify-space-around text-center">
              <div>
                <div class="text-h6 font-weight-bold text-success">${{ compensation.ce_budget_total.toFixed(0) }}</div>
                <div class="text-caption text-grey">Total Budget</div>
              </div>
              <div>
                <div class="text-h6 font-weight-bold text-warning">${{ (compensation.ce_budget_used || 0).toFixed(0) }}</div>
                <div class="text-caption text-grey">Spent</div>
              </div>
              <div>
                <div class="text-h6 font-weight-bold" :class="ceRemaining < 100 ? 'text-error' : 'text-info'">${{ ceRemaining.toFixed(0) }}</div>
                <div class="text-caption text-grey">Available</div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-6">
            <v-icon size="48" color="grey-lighten-2">mdi-school-outline</v-icon>
            <p class="text-body-2 text-grey mt-2">No CE budget set</p>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <!-- Benefits Widget -->
    <v-col cols="12" md="6">
      <v-card class="bg-white shadow-sm rounded-xl" elevation="0">
        <v-card-title class="text-subtitle-1 font-weight-bold">
          <v-icon start size="20" color="purple">mdi-heart-pulse</v-icon>
          Benefits
        </v-card-title>
        <v-card-text>
          <div class="d-flex align-center justify-space-between mb-4">
            <span class="text-body-1">Enrolled in Benefits</span>
            <v-chip 
              :color="compensation?.benefits_enrolled ? 'success' : 'grey'" 
              variant="flat"
              size="small"
            >
              <v-icon start size="14">{{ compensation?.benefits_enrolled ? 'mdi-check' : 'mdi-close' }}</v-icon>
              {{ compensation?.benefits_enrolled ? 'Yes' : 'No' }}
            </v-chip>
          </div>
          
          <v-divider class="my-3" />
          
          <div>
            <div class="text-overline text-grey mb-1">BONUS PLAN</div>
            <p v-if="compensation?.bonus_plan_details" class="text-body-2">
              {{ compensation.bonus_plan_details }}
            </p>
            <p v-else class="text-body-2 text-grey font-italic">
              No bonus plan on record
            </p>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <!-- Admin Actions Card -->
    <v-col v-if="isAdmin" cols="12" md="6">
      <v-card class="bg-white shadow-sm rounded-xl" elevation="0">
        <v-card-title class="text-subtitle-1 font-weight-bold">
          <v-icon start size="20" color="warning">mdi-shield-account</v-icon>
          Admin Actions
        </v-card-title>
        <v-card-text>
          <v-btn 
            block 
            variant="tonal" 
            color="primary" 
            class="mb-2"
            @click="emit('open-compensation-dialog')"
          >
            <v-icon start>mdi-pencil</v-icon>
            Edit Compensation
          </v-btn>
          <p class="text-caption text-grey text-center mt-2">
            Last updated: {{ compensation?.updated_at ? formatDate(compensation.updated_at) : 'Never' }}
          </p>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { formatDate, formatPayRate } from '~/utils/rosterFormatters'

const props = defineProps<{
  compensation: any | null
  isAdmin: boolean
  currentYear: number
}>()

const emit = defineEmits<{
  'open-compensation-dialog': []
}>()

const ceUsagePercent = computed(() => {
  if (!props.compensation || !props.compensation.ce_budget_total) return 0
  return ((props.compensation.ce_budget_used || 0) / props.compensation.ce_budget_total) * 100
})

const ceRemaining = computed(() => {
  if (!props.compensation) return 0
  return (props.compensation.ce_budget_total || 0) - (props.compensation.ce_budget_used || 0)
})
</script>
