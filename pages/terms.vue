<script setup lang="ts">
/**
 * pages/terms.vue — terms of service.
 *
 * Renders the localized ToS by iterating `sectionKeys` and pulling each
 * `legal.terms.<section>` block from the i18n catalog. Robots are
 * explicitly allowed to index this page.
 */
const { t } = useI18n()

const sectionKeys = ['acceptance', 'service', 'use', 'responsibility', 'ip', 'liability', 'changes', 'jurisdiction'] as const

useHead({
  title: () => `Cervantic · ${t('legal.terms.title')}`,
  meta: [{ name: 'robots', content: 'index, follow' }],
})
</script>

<template>
  <article class="legal">
    <header class="page-header">
      <h1>{{ t('legal.terms.title') }}</h1>
      <p class="last-updated">{{ t('legal.lastUpdated') }}</p>
    </header>

    <p class="lead" v-html="t('legal.terms.intro')" />

    <section v-for="key in sectionKeys" :key="key" class="legal-section">
      <h2>{{ t(`legal.terms.sections.${key}.title`) }}</h2>
      <div class="prose" v-html="t(`legal.terms.sections.${key}.body`)" />
    </section>
  </article>
</template>
