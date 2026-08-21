<script setup lang="ts">
/** Route wrapper for the Combiny tool: sets the tab title and mounts <Combiny />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.combiny.name')}`,
  meta: [{ name: 'description', content: () => t('tools.combiny.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.combiny.tagline') }}</h1>
      <p class="lead">{{ t('tools.combiny.description') }}</p>
    </header>

    <Combiny />
  </section>
</template>
