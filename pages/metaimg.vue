<script setup lang="ts">
/** Route wrapper for the Metaimg tool: sets the tab title and mounts <MetaimgEditor />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.metaimg.name')}`,
  meta: [
    { name: 'description', content: () => t('tools.metaimg.description') },
  ],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.metaimg.tagline') }}</h1>
      <p class="lead">{{ t('tools.metaimg.description') }}</p>
    </header>

    <MetaimgEditor />
  </section>
</template>
