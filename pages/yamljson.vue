<script setup lang="ts">
/** Route wrapper for the YamlJson tool: sets the tab title and mounts <YamlJson />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.yamljson.name')}`,
  meta: [{ name: 'description', content: () => t('tools.yamljson.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.yamljson.tagline') }}</h1>
      <p class="lead">{{ t('tools.yamljson.description') }}</p>
    </header>

    <YamlJson />
  </section>
</template>
