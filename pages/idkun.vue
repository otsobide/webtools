<script setup lang="ts">
/** Route wrapper for the Idkun tool: sets the tab title and mounts <IdGenerator />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.idkun.name')}`,
  meta: [
    { name: 'description', content: () => t('tools.idkun.description') },
  ],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.idkun.tagline') }}</h1>
      <p class="lead">{{ t('tools.idkun.description') }}</p>
    </header>

    <IdGenerator />
  </section>
</template>
