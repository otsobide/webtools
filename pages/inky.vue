<script setup lang="ts">
/** Route wrapper for the Inky tool: sets the tab title and mounts <Inky />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.inky.name')}`,
  meta: [{ name: 'description', content: () => t('tools.inky.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.inky.tagline') }}</h1>
      <p class="lead">{{ t('tools.inky.description') }}</p>
    </header>

    <Inky />
  </section>
</template>
