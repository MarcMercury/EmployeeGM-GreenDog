<script setup lang="ts">
// Redirect to Activity Hub - the new main landing page
definePageMeta({
  middleware: [
    function () {
      return navigateTo('/activity', { redirectCode: 301 })
    }
  ]
})
</script>
