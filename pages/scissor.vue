<script setup lang="ts">
/** Route wrapper for the Scissor tool: sets the tab title and mounts <PdfScissor />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.scissor.name')}`,
  meta: [{ name: 'description', content: () => t('tools.scissor.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.scissor.tagline') }}</h1>
      <p class="lead">{{ t('tools.scissor.description') }}</p>
    </header>

    <PdfScissor />
  </section>
</template>
