<script setup lang="ts">
/** Route wrapper for the Yieldy tool: sets the tab title and mounts <Yieldy />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.yieldy.name')}`,
  meta: [{ name: 'description', content: () => t('tools.yieldy.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.yieldy.tagline') }}</h1>
      <p class="lead">{{ t('tools.yieldy.description') }}</p>
    </header>

    <Yieldy />
  </section>
</template>
