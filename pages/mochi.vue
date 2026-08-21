<script setup lang="ts">
/** Route wrapper for the Mochi tool: sets the tab title and mounts <ImageResizer />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.mochi.name')}`,
  meta: [
    { name: 'description', content: () => t('tools.mochi.description') },
  ],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.mochi.tagline') }}</h1>
      <p class="lead">{{ t('tools.mochi.description') }}</p>
    </header>

    <ImageResizer />
  </section>
</template>
