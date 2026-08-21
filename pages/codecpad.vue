<script setup lang="ts">
/** Route wrapper for the Codecpad tool: sets the tab title and mounts <Codecpad />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.codecpad.name')}`,
  meta: [{ name: 'description', content: () => t('tools.codecpad.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.codecpad.tagline') }}</h1>
      <p class="lead">{{ t('tools.codecpad.description') }}</p>
    </header>

    <Codecpad />
  </section>
</template>
