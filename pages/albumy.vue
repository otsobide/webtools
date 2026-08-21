<script setup lang="ts">
/** Route wrapper for the Albumy tool: sets the tab title and mounts <Albumy />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.albumy.name')}`,
  meta: [{ name: 'description', content: () => t('tools.albumy.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.albumy.tagline') }}</h1>
      <p class="lead">{{ t('tools.albumy.description') }}</p>
    </header>

    <Albumy />
  </section>
</template>
