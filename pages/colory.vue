<script setup lang="ts">
/** Route wrapper for the Colory tool: sets the tab title and mounts <Colory />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.colory.name')}`,
  meta: [{ name: 'description', content: () => t('tools.colory.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.colory.tagline') }}</h1>
      <p class="lead">{{ t('tools.colory.description') }}</p>
    </header>

    <Colory />
  </section>
</template>
