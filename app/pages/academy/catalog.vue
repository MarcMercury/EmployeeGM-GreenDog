<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Course Catalog</h1>
        <p class="text-body-1 text-grey-darken-1">
          Browse available training courses and enroll in new learning opportunities
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn variant="outlined" to="/academy/my-training" prepend-icon="mdi-school">
          My Training
        </v-btn>
        <v-btn v-if="isAdmin" color="primary" to="/academy/course-manager" prepend-icon="mdi-cog">
          Manage Courses
        </v-btn>
      </div>
    </div>

    <!-- Course Catalog Component -->
    <AcademyCourseCatalog />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const { isAdmin } = useAppData()

useHead({
  title: 'Course Catalog'
})
</script>
