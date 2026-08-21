<script setup lang="ts">
/** Route wrapper for the Jsonpad tool: sets the tab title and mounts <Jsonpad />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.jsonpad.name')}`,
  meta: [{ name: 'description', content: () => t('tools.jsonpad.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.jsonpad.tagline') }}</h1>
      <p class="lead">{{ t('tools.jsonpad.description') }}</p>
    </header>

    <Jsonpad />
  </section>
</template>
