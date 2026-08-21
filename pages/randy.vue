<script setup lang="ts">
/** Route wrapper for the Randy tool: sets the tab title and mounts <Randy />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.randy.name')}`,
  meta: [{ name: 'description', content: () => t('tools.randy.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.randy.tagline') }}</h1>
      <p class="lead">{{ t('tools.randy.description') }}</p>
    </header>

    <Randy />
  </section>
</template>
