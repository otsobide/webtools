<script setup lang="ts">
/** Route wrapper for the Convy tool: sets the tab title and mounts <Convy />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.convy.name')}`,
  meta: [{ name: 'description', content: () => t('tools.convy.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.convy.tagline') }}</h1>
      <p class="lead">{{ t('tools.convy.description') }}</p>
    </header>

    <Convy />
  </section>
</template>
