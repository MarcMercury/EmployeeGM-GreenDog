<template>
  <v-app>
    <v-main class="auth-main">
      <!-- Animated gradient background -->
      <div class="bg-gradient"></div>
      <div class="bg-pattern"></div>
      
      <v-container class="fill-height position-relative" fluid>
        <v-row align="center" justify="center">
          <v-col cols="12" sm="10" md="8" lg="5" xl="4">
            <slot />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.auth-main {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

.bg-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    linear-gradient(135deg, #1B5E20 0%, #2E7D32 25%, #388E3C 50%, #1B5E20 75%, #0D3D12 100%);
  background-size: 400% 400%;
  animation: gradient-shift 15s ease infinite;
}

.bg-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(circle at 20% 80%, rgba(76, 175, 80, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(129, 199, 132, 0.2) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(46, 125, 50, 0.2) 0%, transparent 40%),
    radial-gradient(circle at 90% 90%, rgba(27, 94, 32, 0.3) 0%, transparent 50%);
  animation: pattern-float 20s ease-in-out infinite;
}

@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes pattern-float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-20px) scale(1.02); }
}

.position-relative {
  position: relative;
  z-index: 1;
}
</style>
