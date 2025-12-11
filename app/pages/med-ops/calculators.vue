<template>
  <div class="drug-calculators-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Drug Calculators</h1>
        <p class="text-body-1 text-grey-darken-1">
          Veterinary drug dosage calculators and reference tools
        </p>
      </div>
    </div>

    <!-- Calculator Selection -->
    <v-row class="mb-6">
      <v-col cols="12" md="4">
        <v-select
          v-model="selectedCalculator"
          :items="calculators"
          label="Select Calculator"
          variant="outlined"
          prepend-inner-icon="mdi-calculator"
        />
      </v-col>
    </v-row>

    <!-- Dosage Calculator -->
    <v-card v-if="selectedCalculator === 'dosage'" rounded="lg" class="mb-6">
      <v-card-title class="d-flex align-center">
        <v-icon color="primary" class="mr-2">mdi-pill</v-icon>
        Drug Dosage Calculator
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-autocomplete
              v-model="dosageForm.drug"
              :items="commonDrugs"
              label="Drug Name"
              variant="outlined"
              prepend-inner-icon="mdi-medication"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model.number="dosageForm.weight"
              label="Patient Weight"
              type="number"
              variant="outlined"
              prepend-inner-icon="mdi-weight"
            >
              <template #append>
                <v-btn-toggle v-model="dosageForm.weightUnit" mandatory density="compact">
                  <v-btn value="kg" size="small">kg</v-btn>
                  <v-btn value="lb" size="small">lb</v-btn>
                </v-btn-toggle>
              </template>
            </v-text-field>
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model.number="dosageForm.dosePerKg"
              label="Dose per kg"
              type="number"
              variant="outlined"
              suffix="mg/kg"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model.number="dosageForm.concentration"
              label="Drug Concentration"
              type="number"
              variant="outlined"
              suffix="mg/ml"
            />
          </v-col>
        </v-row>

        <v-divider class="my-4" />

        <v-alert type="info" variant="tonal" class="mb-4">
          <div class="text-h6 mb-2">Calculated Dose</div>
          <v-row>
            <v-col cols="6" md="3">
              <div class="text-caption">Total Dose</div>
              <div class="text-h5 font-weight-bold">{{ calculatedDose.totalDose }} mg</div>
            </v-col>
            <v-col cols="6" md="3">
              <div class="text-caption">Volume to Administer</div>
              <div class="text-h5 font-weight-bold">{{ calculatedDose.volume }} ml</div>
            </v-col>
          </v-row>
        </v-alert>

        <v-alert type="warning" variant="tonal">
          <v-icon start>mdi-alert</v-icon>
          Always verify calculations and consult product labeling before administration.
        </v-alert>
      </v-card-text>
    </v-card>

    <!-- Fluid Rate Calculator -->
    <v-card v-if="selectedCalculator === 'fluid'" rounded="lg" class="mb-6">
      <v-card-title class="d-flex align-center">
        <v-icon color="blue" class="mr-2">mdi-iv-bag</v-icon>
        Fluid Rate Calculator
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field
              v-model.number="fluidForm.weight"
              label="Patient Weight"
              type="number"
              variant="outlined"
              suffix="kg"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model.number="fluidForm.rate"
              label="Maintenance Rate"
              type="number"
              variant="outlined"
              suffix="ml/kg/hr"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model.number="fluidForm.dropsPerMl"
              label="Drops per ml"
              type="number"
              variant="outlined"
              suffix="drops/ml"
            />
          </v-col>
        </v-row>

        <v-divider class="my-4" />

        <v-alert type="info" variant="tonal">
          <div class="text-h6 mb-2">Calculated Fluid Rate</div>
          <v-row>
            <v-col cols="6" md="3">
              <div class="text-caption">ml per Hour</div>
              <div class="text-h5 font-weight-bold">{{ calculatedFluid.mlPerHour }} ml/hr</div>
            </v-col>
            <v-col cols="6" md="3">
              <div class="text-caption">Drops per Minute</div>
              <div class="text-h5 font-weight-bold">{{ calculatedFluid.dropsPerMin }} gtt/min</div>
            </v-col>
            <v-col cols="6" md="3">
              <div class="text-caption">Daily Volume</div>
              <div class="text-h5 font-weight-bold">{{ calculatedFluid.dailyVolume }} ml</div>
            </v-col>
          </v-row>
        </v-alert>
      </v-card-text>
    </v-card>

    <!-- CRI Calculator -->
    <v-card v-if="selectedCalculator === 'cri'" rounded="lg" class="mb-6">
      <v-card-title class="d-flex align-center">
        <v-icon color="purple" class="mr-2">mdi-timer</v-icon>
        Constant Rate Infusion (CRI) Calculator
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field
              v-model.number="criForm.weight"
              label="Patient Weight"
              type="number"
              variant="outlined"
              suffix="kg"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model.number="criForm.doseRate"
              label="Dose Rate"
              type="number"
              variant="outlined"
              suffix="mcg/kg/min"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model.number="criForm.concentration"
              label="Drug Concentration"
              type="number"
              variant="outlined"
              suffix="mg/ml"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model.number="criForm.fluidRate"
              label="Fluid Rate"
              type="number"
              variant="outlined"
              suffix="ml/hr"
            />
          </v-col>
        </v-row>

        <v-divider class="my-4" />

        <v-alert type="info" variant="tonal">
          <div class="text-h6 mb-2">CRI Calculation</div>
          <v-row>
            <v-col cols="6" md="4">
              <div class="text-caption">Drug to Add</div>
              <div class="text-h5 font-weight-bold">{{ calculatedCRI.drugToAdd }} mg</div>
            </v-col>
            <v-col cols="6" md="4">
              <div class="text-caption">Volume of Drug</div>
              <div class="text-h5 font-weight-bold">{{ calculatedCRI.volumeToAdd }} ml</div>
            </v-col>
          </v-row>
        </v-alert>
      </v-card-text>
    </v-card>

    <!-- BSA Calculator -->
    <v-card v-if="selectedCalculator === 'bsa'" rounded="lg" class="mb-6">
      <v-card-title class="d-flex align-center">
        <v-icon color="green" class="mr-2">mdi-chart-bubble</v-icon>
        Body Surface Area (BSA) Calculator
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model.number="bsaForm.weight"
              label="Patient Weight"
              type="number"
              variant="outlined"
              suffix="kg"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-select
              v-model="bsaForm.species"
              :items="['Dog', 'Cat']"
              label="Species"
              variant="outlined"
            />
          </v-col>
        </v-row>

        <v-divider class="my-4" />

        <v-alert type="info" variant="tonal">
          <div class="text-h6 mb-2">Body Surface Area</div>
          <div class="text-h4 font-weight-bold">{{ calculatedBSA }} m²</div>
          <div class="text-caption mt-2">
            Formula: BSA = {{ bsaForm.species === 'Dog' ? '10.1 × (weight in g)^0.734 / 10000' : '10.0 × (weight in g)^0.653 / 10000' }}
          </div>
        </v-alert>
      </v-card-text>
    </v-card>

    <!-- Common Drug Reference -->
    <v-card rounded="lg">
      <v-card-title>Quick Drug Reference</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="drugSearch"
          prepend-inner-icon="mdi-magnify"
          label="Search drugs..."
          variant="outlined"
          density="compact"
          clearable
          class="mb-4"
        />
        <v-data-table
          :headers="drugHeaders"
          :items="filteredDrugReference"
          :search="drugSearch"
          density="compact"
        >
          <template #item.route="{ item }">
            <v-chip size="x-small" variant="outlined">{{ item.route }}</v-chip>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

useHead({
  title: 'Drug Calculators'
})

// State
const selectedCalculator = ref('dosage')
const drugSearch = ref('')

const calculators = [
  { title: 'Drug Dosage Calculator', value: 'dosage' },
  { title: 'Fluid Rate Calculator', value: 'fluid' },
  { title: 'CRI Calculator', value: 'cri' },
  { title: 'BSA Calculator', value: 'bsa' }
]

const commonDrugs = [
  'Carprofen', 'Meloxicam', 'Tramadol', 'Gabapentin', 'Amoxicillin',
  'Clavamox', 'Cephalexin', 'Metronidazole', 'Enrofloxacin', 'Doxycycline',
  'Prednisone', 'Dexamethasone', 'Buprenorphine', 'Hydromorphone', 'Fentanyl',
  'Propofol', 'Ketamine', 'Dexmedetomidine', 'Acepromazine', 'Maropitant'
]

// Dosage Calculator
const dosageForm = reactive({
  drug: 'Carprofen',
  weight: 20,
  weightUnit: 'kg',
  dosePerKg: 4.4,
  concentration: 50
})

const calculatedDose = computed(() => {
  const weightKg = dosageForm.weightUnit === 'lb' 
    ? dosageForm.weight * 0.453592 
    : dosageForm.weight
  const totalDose = (weightKg * dosageForm.dosePerKg).toFixed(2)
  const volume = (parseFloat(totalDose) / dosageForm.concentration).toFixed(2)
  return { totalDose, volume }
})

// Fluid Calculator
const fluidForm = reactive({
  weight: 10,
  rate: 2,
  dropsPerMl: 15
})

const calculatedFluid = computed(() => {
  const mlPerHour = (fluidForm.weight * fluidForm.rate).toFixed(1)
  const dropsPerMin = ((parseFloat(mlPerHour) * fluidForm.dropsPerMl) / 60).toFixed(1)
  const dailyVolume = (parseFloat(mlPerHour) * 24).toFixed(0)
  return { mlPerHour, dropsPerMin, dailyVolume }
})

// CRI Calculator
const criForm = reactive({
  weight: 10,
  doseRate: 2,
  concentration: 0.5,
  fluidRate: 50
})

const calculatedCRI = computed(() => {
  const dosePerHour = (criForm.weight * criForm.doseRate * 60) / 1000 // mcg to mg
  const drugToAdd = (dosePerHour * (1000 / criForm.fluidRate)).toFixed(3)
  const volumeToAdd = (parseFloat(drugToAdd) / criForm.concentration).toFixed(2)
  return { drugToAdd, volumeToAdd }
})

// BSA Calculator
const bsaForm = reactive({
  weight: 10,
  species: 'Dog'
})

const calculatedBSA = computed(() => {
  const weightInGrams = bsaForm.weight * 1000
  if (bsaForm.species === 'Dog') {
    return ((10.1 * Math.pow(weightInGrams, 0.734)) / 10000).toFixed(3)
  } else {
    return ((10.0 * Math.pow(weightInGrams, 0.653)) / 10000).toFixed(3)
  }
})

// Drug Reference
const drugHeaders = [
  { title: 'Drug', key: 'name' },
  { title: 'Class', key: 'class' },
  { title: 'Dose Range', key: 'dose' },
  { title: 'Route', key: 'route' },
  { title: 'Frequency', key: 'frequency' }
]

const drugReference = [
  { name: 'Carprofen', class: 'NSAID', dose: '2.2-4.4 mg/kg', route: 'PO/IV', frequency: 'q12-24h' },
  { name: 'Meloxicam', class: 'NSAID', dose: '0.1-0.2 mg/kg', route: 'PO/SC', frequency: 'q24h' },
  { name: 'Tramadol', class: 'Opioid', dose: '2-5 mg/kg', route: 'PO', frequency: 'q6-8h' },
  { name: 'Gabapentin', class: 'Anticonvulsant', dose: '5-10 mg/kg', route: 'PO', frequency: 'q8-12h' },
  { name: 'Amoxicillin', class: 'Antibiotic', dose: '10-20 mg/kg', route: 'PO', frequency: 'q8-12h' },
  { name: 'Cephalexin', class: 'Antibiotic', dose: '22-30 mg/kg', route: 'PO', frequency: 'q8-12h' },
  { name: 'Metronidazole', class: 'Antibiotic', dose: '10-15 mg/kg', route: 'PO', frequency: 'q12h' },
  { name: 'Enrofloxacin', class: 'Antibiotic', dose: '5-20 mg/kg', route: 'PO/IV', frequency: 'q24h' },
  { name: 'Prednisone', class: 'Corticosteroid', dose: '0.5-2 mg/kg', route: 'PO', frequency: 'q12-24h' },
  { name: 'Dexamethasone', class: 'Corticosteroid', dose: '0.1-0.5 mg/kg', route: 'IV/IM', frequency: 'q24h' },
  { name: 'Buprenorphine', class: 'Opioid', dose: '0.01-0.02 mg/kg', route: 'IV/IM', frequency: 'q6-8h' },
  { name: 'Maropitant', class: 'Antiemetic', dose: '1 mg/kg', route: 'PO/SC', frequency: 'q24h' }
]

const filteredDrugReference = computed(() => {
  if (!drugSearch.value) return drugReference
  const search = drugSearch.value.toLowerCase()
  return drugReference.filter(d => 
    d.name.toLowerCase().includes(search) || 
    d.class.toLowerCase().includes(search)
  )
})
</script>

<style scoped>
.drug-calculators-page {
  max-width: 1200px;
}
</style>
