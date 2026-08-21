<script setup lang="ts">
/** Route wrapper for the Shadowy tool: sets the tab title and mounts <Shadowy />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.shadowy.name')}`,
  meta: [{ name: 'description', content: () => t('tools.shadowy.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.shadowy.tagline') }}</h1>
      <p class="lead">{{ t('tools.shadowy.description') }}</p>
    </header>

    <Shadowy />
  </section>
</template>
