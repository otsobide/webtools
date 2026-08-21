<script setup lang="ts">
/** Route wrapper for the Urlpad tool: sets the tab title and mounts <Urlpad />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.urlpad.name')}`,
  meta: [{ name: 'description', content: () => t('tools.urlpad.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.urlpad.tagline') }}</h1>
      <p class="lead">{{ t('tools.urlpad.description') }}</p>
    </header>

    <Urlpad />
  </section>
</template>
