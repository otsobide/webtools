<script setup lang="ts">
/** Route wrapper for the JwtDecoder tool: sets the tab title and mounts <JwtDecoder />. */
const { t } = useI18n()

useHead({
  title: () => `Cervantic · ${t('tools.jwtdecoder.name')}`,
  meta: [{ name: 'description', content: () => t('tools.jwtdecoder.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.jwtdecoder.tagline') }}</h1>
      <p class="lead">{{ t('tools.jwtdecoder.description') }}</p>
    </header>

    <JwtDecoder />
  </section>
</template>
