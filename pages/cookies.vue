<script setup lang="ts">
/**
 * pages/cookies.vue — cookies policy.
 *
 * Renders the localized cookies policy by iterating `sectionKeys` and
 * pulling each `legal.cookies.<section>` block from the i18n catalog.
 * Robots are explicitly allowed to index this page.
 */
const { t } = useI18n()

const sectionKeys = ['what', 'used', 'thirdParty', 'manage', 'changes'] as const

useHead({
  title: () => `Cervantic · ${t('legal.cookies.title')}`,
  meta: [{ name: 'robots', content: 'index, follow' }],
})
</script>

<template>
  <article class="legal">
    <header class="page-header">
      <h1>{{ t('legal.cookies.title') }}</h1>
      <p class="last-updated">{{ t('legal.lastUpdated') }}</p>
    </header>

    <p class="lead" v-html="t('legal.cookies.intro')" />

    <section v-for="key in sectionKeys" :key="key" class="legal-section">
      <h2>{{ t(`legal.cookies.sections.${key}.title`) }}</h2>
      <div class="prose" v-html="t(`legal.cookies.sections.${key}.body`)" />
    </section>
  </article>
</template>
