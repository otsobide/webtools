<script setup lang="ts">
/** Route wrapper for the Basey tool: sets the tab title and mounts <Basey />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.basey.name')}`,
  meta: [{ name: 'description', content: () => t('tools.basey.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.basey.tagline') }}</h1>
      <p class="lead">{{ t('tools.basey.description') }}</p>
    </header>

    <Basey />
  </section>
</template>
