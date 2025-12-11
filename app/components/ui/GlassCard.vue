<template>
  <div 
    ref="cardRef"
    class="glass-card"
    :class="[`glass-${variant}`, { 'glass-hover': hover, 'glass-glow': glow }]"
    :style="cardStyle"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  >
    <!-- Shimmer effect -->
    <div v-if="shimmer" class="glass-shimmer" />
    
    <!-- Glow orb that follows mouse -->
    <div 
      v-if="glow" 
      class="glass-glow-orb"
      :style="glowStyle"
    />
    
    <!-- Content -->
    <div class="glass-content">
      <slot />
    </div>

    <!-- Border gradient -->
    <div class="glass-border" />
  </div>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'default' | 'dark' | 'light' | 'primary' | 'success'
  hover?: boolean
  glow?: boolean
  shimmer?: boolean
  tiltIntensity?: number
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  hover: true,
  glow: true,
  shimmer: false,
  tiltIntensity: 10,
  rounded: 'lg'
})

const cardRef = ref<HTMLElement | null>(null)
const mouseX = ref(0)
const mouseY = ref(0)
const isHovering = ref(false)

const rotateX = ref(0)
const rotateY = ref(0)

const handleMouseMove = (e: MouseEvent) => {
  if (!cardRef.value || !props.hover) return
  
  const rect = cardRef.value.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  
  // Calculate mouse position relative to center (-1 to 1)
  const relX = (e.clientX - centerX) / (rect.width / 2)
  const relY = (e.clientY - centerY) / (rect.height / 2)
  
  // Apply tilt (inverted for natural feel)
  rotateX.value = -relY * props.tiltIntensity
  rotateY.value = relX * props.tiltIntensity
  
  // Track mouse for glow
  mouseX.value = e.clientX - rect.left
  mouseY.value = e.clientY - rect.top
  isHovering.value = true
}

const handleMouseLeave = () => {
  rotateX.value = 0
  rotateY.value = 0
  isHovering.value = false
}

const cardStyle = computed(() => ({
  transform: isHovering.value 
    ? `perspective(1000px) rotateX(${rotateX.value}deg) rotateY(${rotateY.value}deg) scale(1.02)`
    : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)',
  '--rounded': props.rounded === 'sm' ? '8px' 
    : props.rounded === 'md' ? '12px'
    : props.rounded === 'lg' ? '16px'
    : props.rounded === 'xl' ? '24px'
    : '9999px'
}))

const glowStyle = computed(() => ({
  left: `${mouseX.value}px`,
  top: `${mouseY.value}px`,
  opacity: isHovering.value ? 1 : 0
}))
</script>

<style scoped>
.glass-card {
  position: relative;
  border-radius: var(--rounded, 16px);
  transition: transform 0.15s ease-out, box-shadow 0.3s ease;
  transform-style: preserve-3d;
  will-change: transform;
  overflow: hidden;
}

/* Variants */
.glass-default {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.glass-dark {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.glass-light {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.glass-primary {
  background: rgba(46, 125, 50, 0.15);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 
    0 8px 32px rgba(46, 125, 50, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.glass-success {
  background: rgba(76, 175, 80, 0.15);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 
    0 8px 32px rgba(76, 175, 80, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* Hover lift effect */
.glass-hover:hover {
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.15),
    0 8px 25px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

/* Content layer */
.glass-content {
  position: relative;
  z-index: 2;
}

/* Animated border */
.glass-border {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.3) 0%,
    rgba(255, 255, 255, 0.05) 50%,
    rgba(255, 255, 255, 0.1) 100%
  );
  -webkit-mask: 
    linear-gradient(#fff 0 0) content-box, 
    linear-gradient(#fff 0 0);
  mask: 
    linear-gradient(#fff 0 0) content-box, 
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

/* Glow orb */
.glass-glow-orb {
  position: absolute;
  width: 200px;
  height: 200px;
  background: radial-gradient(
    circle,
    rgba(76, 175, 80, 0.4) 0%,
    transparent 70%
  );
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 1;
  transition: opacity 0.3s ease;
  filter: blur(30px);
}

/* Shimmer animation */
.glass-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.1) 50%,
    transparent 100%
  );
  transform: translateX(-100%);
  animation: shimmer 2s infinite;
  pointer-events: none;
  z-index: 3;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .glass-light {
    background: rgba(255, 255, 255, 0.1);
  }
}
</style>
