<script setup lang="ts">
/** Route wrapper for the Qrgen tool: sets the tab title and mounts <Qrgen />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.qrgen.name')}`,
  meta: [{ name: 'description', content: () => t('tools.qrgen.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.qrgen.tagline') }}</h1>
      <p class="lead">{{ t('tools.qrgen.description') }}</p>
    </header>

    <Qrgen />
  </section>
</template>
