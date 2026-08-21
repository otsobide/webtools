<script setup lang="ts">
/** Route wrapper for the Mdtably tool: sets the tab title and mounts <Mdtably />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.mdtably.name')}`,
  meta: [{ name: 'description', content: () => t('tools.mdtably.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.mdtably.tagline') }}</h1>
      <p class="lead">{{ t('tools.mdtably.description') }}</p>
    </header>

    <Mdtably />
  </section>
</template>
