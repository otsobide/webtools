<script setup lang="ts">
/** Route wrapper for the Markpdf tool: sets the tab title and mounts <Markpdf />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.markpdf.name')}`,
  meta: [{ name: 'description', content: () => t('tools.markpdf.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.markpdf.tagline') }}</h1>
      <p class="lead">{{ t('tools.markpdf.description') }}</p>
    </header>

    <Markpdf />
  </section>
</template>
