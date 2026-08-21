<script setup lang="ts">
/** Route wrapper for the PdfSpinner tool: sets the tab title and mounts <PdfSpinner />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.pdfspinner.name')}`,
  meta: [{ name: 'description', content: () => t('tools.pdfspinner.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.pdfspinner.tagline') }}</h1>
      <p class="lead">{{ t('tools.pdfspinner.description') }}</p>
    </header>

    <PdfSpinner />
  </section>
</template>
