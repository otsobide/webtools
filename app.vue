<script setup lang="ts">
/**
 * app.vue — root SPA shell.
 *
 * Renders the persistent chrome around every page: the Cervantic · WebTools
 * brand link, the language switcher (driven by `useI18n().locales`) and
 * the `<NuxtPage />` slot where every route mounts. The locale switcher
 * triggers `setLocale`, which routes the user to the equivalent localised
 * URL and persists the choice via the i18n cookie configured in
 * `nuxt.config.ts`.
 */
const { locale, locales, setLocale, t } = useI18n()
const localePath = useLocalePath()

type LocaleOption = { code: string; name: string }

const allLocales = computed(() => locales.value as LocaleOption[])

const onChangeLocale = (event: Event) => {
  const target = event.target as HTMLSelectElement
  setLocale(target.value as never)
}
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <NuxtLink :to="localePath('/')" class="brand">
        <span class="brand-mark">Cervantic</span>
        <span class="brand-sep" aria-hidden="true">·</span>
        <span class="brand-sub">WebTools</span>
      </NuxtLink>

      <label class="lang-switcher" :aria-label="t('nav.languageSwitcher')">
        <span class="lang-icon" aria-hidden="true">🌐</span>
        <select
          class="lang-select"
          :value="locale"
          @change="onChangeLocale"
        >
          <option v-for="l in allLocales" :key="l.code" :value="l.code">
            {{ l.name }}
          </option>
        </select>
      </label>
    </header>

    <main class="app-main">
      <NuxtPage />
    </main>

    <footer class="app-footer">
      <small class="footer-tagline">{{ t('footer.tagline') }}</small>
      <nav class="footer-links" :aria-label="t('footer.legalLinks')">
        <NuxtLink :to="useLocalePath()('/privacy')">{{ t('footer.privacy') }}</NuxtLink>
        <NuxtLink :to="useLocalePath()('/terms')">{{ t('footer.terms') }}</NuxtLink>
        <NuxtLink :to="useLocalePath()('/cookies')">{{ t('footer.cookies') }}</NuxtLink>
      </nav>
    </footer>
  </div>
</template>
