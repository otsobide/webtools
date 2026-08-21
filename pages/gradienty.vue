<script setup lang="ts">
/** Route wrapper for the Gradienty tool: sets the tab title and mounts <Gradienty />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.gradienty.name')}`,
  meta: [{ name: 'description', content: () => t('tools.gradienty.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.gradienty.tagline') }}</h1>
      <p class="lead">{{ t('tools.gradienty.description') }}</p>
    </header>

    <Gradienty />
  </section>
</template>
