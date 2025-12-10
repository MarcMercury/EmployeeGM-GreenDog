<template>
  <v-app>
    <v-main class="auth-main">
      <v-container class="fill-height" fluid>
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="6" lg="4">
            <slot />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.auth-main {
  background: linear-gradient(135deg, #2E7D32 0%, #1B5E20 50%, #0D3D12 100%);
  min-height: 100vh;
}
</style>
