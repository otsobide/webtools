<script setup lang="ts">
/** Route wrapper for the Timely tool: sets the tab title and mounts <Timely />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.timely.name')}`,
  meta: [{ name: 'description', content: () => t('tools.timely.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.timely.tagline') }}</h1>
      <p class="lead">{{ t('tools.timely.description') }}</p>
    </header>

    <Timely />
  </section>
</template>
