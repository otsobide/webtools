<script setup lang="ts">
/** Route wrapper for the Metapdf tool: sets the tab title and mounts <Metapdf />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.metapdf.name')}`,
  meta: [{ name: 'description', content: () => t('tools.metapdf.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.metapdf.tagline') }}</h1>
      <p class="lead">{{ t('tools.metapdf.description') }}</p>
    </header>

    <Metapdf />
  </section>
</template>
