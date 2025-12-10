<template>
  <div class="skill-rating-container">
    <div class="d-flex align-center justify-space-between mb-2">
      <div class="d-flex align-center gap-2">
        <span class="text-body-1 font-weight-medium">{{ skill.name }}</span>
        <span :class="['skill-badge', category]">
          {{ categoryLabel }}
        </span>
      </div>
      <span class="text-h6 font-weight-bold" :style="{ color: levelColor }">
        {{ level }}
      </span>
    </div>

    <!-- Skill Dots -->
    <div class="skill-rating">
      <button
        v-for="dot in 5"
        :key="dot"
        :class="['skill-dot', category, { filled: dot <= level }]"
        :disabled="!editable"
        @click="editable && updateLevel(dot as SkillLevel)"
      />
    </div>

    <!-- Progress Bar Alternative -->
    <v-progress-linear
      v-if="showProgress"
      :model-value="(level / 5) * 100"
      :color="levelColor"
      height="8"
      rounded
      class="mt-2"
    />

    <!-- Description -->
    <p v-if="skill.description && showDescription" class="text-body-2 text-grey mt-2">
      {{ skill.description }}
    </p>

    <!-- Notes -->
    <div v-if="notes && showNotes" class="mt-2">
      <v-chip size="x-small" variant="outlined" color="grey" prepend-icon="mdi-note">
        {{ notes }}
      </v-chip>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Skill, SkillLevel } from '~/types/database.types'
import { getSkillCategory } from '~/types/database.types'

interface Props {
  skill: Skill
  level: SkillLevel
  notes?: string | null
  editable?: boolean
  showProgress?: boolean
  showDescription?: boolean
  showNotes?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  editable: false,
  showProgress: false,
  showDescription: false,
  showNotes: true
})

const emit = defineEmits<{
  'update:level': [level: SkillLevel]
}>()

const category = computed(() => getSkillCategory(props.level))

const categoryLabel = computed(() => {
  switch (category.value) {
    case 'learning': return 'Learning'
    case 'competent': return 'Competent'
    case 'mentor': return 'Mentor'
  }
})

const levelColor = computed(() => {
  switch (category.value) {
    case 'learning': return '#FF9800'
    case 'competent': return '#2196F3'
    case 'mentor': return '#4CAF50'
  }
})

function updateLevel(newLevel: SkillLevel) {
  emit('update:level', newLevel)
}
</script>

<style scoped>
.skill-rating-container {
  padding: 12px 0;
}

.skill-rating {
  display: flex;
  gap: 8px;
}

.skill-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 3px solid currentColor;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}

.skill-dot:disabled {
  cursor: default;
}

.skill-dot:not(:disabled):hover {
  transform: scale(1.1);
}

.skill-dot.filled {
  background-color: currentColor;
}

.skill-dot.learning {
  color: #FF9800;
}

.skill-dot.competent {
  color: #2196F3;
}

.skill-dot.mentor {
  color: #4CAF50;
}
</style>
