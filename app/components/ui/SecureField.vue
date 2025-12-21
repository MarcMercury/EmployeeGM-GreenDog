<template>
  <div class="secure-field d-flex align-center gap-2">
    <!-- Masked/Revealed Value -->
    <div class="field-content flex-grow-1">
      <template v-if="isRevealed">
        <span class="revealed-text">{{ modelValue || '—' }}</span>
      </template>
      <template v-else>
        <span class="masked-text text-grey-darken-1">{{ maskedValue }}</span>
      </template>
    </div>

    <!-- Action Buttons -->
    <div class="field-actions d-flex gap-1">
      <!-- Toggle Visibility -->
      <v-btn
        v-if="modelValue"
        icon
        size="x-small"
        variant="text"
        :color="isRevealed ? 'primary' : 'grey'"
        @click="toggleVisibility"
        :title="isRevealed ? 'Hide' : 'Show'"
      >
        <v-icon size="16">{{ isRevealed ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
      </v-btn>

      <!-- Copy to Clipboard -->
      <v-btn
        v-if="modelValue && copyable"
        icon
        size="x-small"
        variant="text"
        :color="copied ? 'success' : 'grey'"
        @click="copyToClipboard"
        :title="copied ? 'Copied!' : 'Copy'"
      >
        <v-icon size="16">{{ copied ? 'mdi-check' : 'mdi-content-copy' }}</v-icon>
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string | null | undefined
  maskChar?: string
  visibleChars?: number
  copyable?: boolean
  type?: 'password' | 'account' | 'partial'
}

const props = withDefaults(defineProps<Props>(), {
  maskChar: '•',
  visibleChars: 4,
  copyable: true,
  type: 'password'
})

const isRevealed = ref(false)
const copied = ref(false)

const maskedValue = computed(() => {
  if (!props.modelValue) return '—'
  
  switch (props.type) {
    case 'password':
      return props.maskChar.repeat(8)
    case 'account':
      // Show last 4 digits
      if (props.modelValue.length > props.visibleChars) {
        return props.maskChar.repeat(props.modelValue.length - props.visibleChars) + 
               props.modelValue.slice(-props.visibleChars)
      }
      return props.maskChar.repeat(props.modelValue.length)
    case 'partial':
      // Show first 2 and last 2
      if (props.modelValue.length > 4) {
        return props.modelValue.slice(0, 2) + 
               props.maskChar.repeat(props.modelValue.length - 4) + 
               props.modelValue.slice(-2)
      }
      return props.maskChar.repeat(props.modelValue.length)
    default:
      return props.maskChar.repeat(8)
  }
})

const toggleVisibility = () => {
  isRevealed.value = !isRevealed.value
  
  // Auto-hide after 10 seconds for security
  if (isRevealed.value) {
    setTimeout(() => {
      isRevealed.value = false
    }, 10000)
  }
}

const copyToClipboard = async () => {
  if (!props.modelValue) return
  
  try {
    await navigator.clipboard.writeText(props.modelValue)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}
</script>

<style scoped>
.secure-field {
  font-family: 'Roboto Mono', monospace;
  font-size: 0.875rem;
}

.masked-text {
  letter-spacing: 2px;
}

.revealed-text {
  font-weight: 500;
  color: #1a1a1a;
}

.field-actions {
  opacity: 0.7;
  transition: opacity 0.2s;
}

.secure-field:hover .field-actions {
  opacity: 1;
}
</style>
