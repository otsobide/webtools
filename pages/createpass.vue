<script setup lang="ts">
/** Route wrapper for the Createpass tool: sets the tab title and mounts <PasswordGenerator />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.createpass.name')}`,
  meta: [
    { name: 'description', content: () => t('tools.createpass.description') },
  ],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.createpass.tagline') }}</h1>
      <p class="lead">{{ t('tools.createpass.description') }}</p>
    </header>

    <PasswordGenerator />
  </section>
</template>
