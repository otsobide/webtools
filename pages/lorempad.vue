<script setup lang="ts">
/** Route wrapper for the Lorempad tool: sets the tab title and mounts <Lorempad />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.lorempad.name')}`,
  meta: [{ name: 'description', content: () => t('tools.lorempad.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.lorempad.tagline') }}</h1>
      <p class="lead">{{ t('tools.lorempad.description') }}</p>
    </header>

    <Lorempad />
  </section>
</template>
