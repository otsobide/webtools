<script setup lang="ts">
/** Route wrapper for the Regexpad tool: sets the tab title and mounts <Regexpad />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.regexpad.name')}`,
  meta: [{ name: 'description', content: () => t('tools.regexpad.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.regexpad.tagline') }}</h1>
      <p class="lead">{{ t('tools.regexpad.description') }}</p>
    </header>

    <Regexpad />
  </section>
</template>
