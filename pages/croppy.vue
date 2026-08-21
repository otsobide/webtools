<script setup lang="ts">
/** Route wrapper for the Croppy tool: sets the tab title and mounts <Croppy />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.croppy.name')}`,
  meta: [{ name: 'description', content: () => t('tools.croppy.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.croppy.tagline') }}</h1>
      <p class="lead">{{ t('tools.croppy.description') }}</p>
    </header>

    <Croppy />
  </section>
</template>
