<script setup lang="ts">
/** Route wrapper for the Cronpad tool: sets the tab title and mounts <Cronpad />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.cronpad.name')}`,
  meta: [{ name: 'description', content: () => t('tools.cronpad.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.cronpad.tagline') }}</h1>
      <p class="lead">{{ t('tools.cronpad.description') }}</p>
    </header>

    <Cronpad />
  </section>
</template>
