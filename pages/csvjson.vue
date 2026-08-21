<script setup lang="ts">
/** Route wrapper for the CsvJson tool: sets the tab title and mounts <CsvJson />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.csvjson.name')}`,
  meta: [{ name: 'description', content: () => t('tools.csvjson.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.csvjson.tagline') }}</h1>
      <p class="lead">{{ t('tools.csvjson.description') }}</p>
    </header>

    <CsvJson />
  </section>
</template>
