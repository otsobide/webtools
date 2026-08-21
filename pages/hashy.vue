<script setup lang="ts">
/** Route wrapper for the Hashy tool: sets the tab title and mounts <HashCalculator />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.hashy.name')}`,
  meta: [
    { name: 'description', content: () => t('tools.hashy.description') },
  ],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.hashy.tagline') }}</h1>
      <p class="lead">{{ t('tools.hashy.description') }}</p>
    </header>

    <HashCalculator />
  </section>
</template>
