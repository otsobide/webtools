<script setup lang="ts">
/** Route wrapper for the Wordy tool: sets the tab title and mounts <WordyCounter />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.wordy.name')}`,
  meta: [{ name: 'description', content: () => t('tools.wordy.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.wordy.tagline') }}</h1>
      <p class="lead">{{ t('tools.wordy.description') }}</p>
    </header>

    <WordyCounter />
  </section>
</template>
