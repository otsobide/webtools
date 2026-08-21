/**
 * nuxt.config.ts — global Nuxt configuration.
 *
 * Configures the project as a fully static SPA (`ssr: false`,
 * `nitro.output.publicDir: 'dist'`) with `@nuxtjs/i18n` set to 25 locales
 * lazy-loaded from `i18n/locales/*.json`. The default locale is `es` and
 * `en` is the fallback; route prefixes are added for every locale except
 * the default (`prefix_except_default`). The 📦 favicon is embedded as an
 * inline SVG data URI so no extra binary asset is required.
 *
 * See https://nuxt.com/docs/api/configuration/nuxt-config for the full
 * option reference.
 */
export default defineNuxtConfig({
  compatibilityDate: '2025-05-01',

  ssr: false,

  devtools: { enabled: true },

  modules: ['@nuxtjs/i18n'],

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'es' },
      title: 'Cervantic · WebTools',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Colección de utilidades web que se ejecutan en tu navegador. Sin servidor, sin subidas.',
        },
      ],
      link: [
        {
          rel: 'icon',
          type: 'image/svg+xml',
          href: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📦</text></svg>",
        },
      ],
    },
  },

  nitro: {
    output: {
      publicDir: 'dist',
    },
  },

  i18n: {
    defaultLocale: 'es',
    fallbackLocale: 'en',
    strategy: 'prefix_except_default',
    lazy: true,
    compilation: {
      strictMessage: false,
      escapeHtml: false,
    },
    locales: [
      { code: 'cs', name: 'Čeština', file: 'cs.json' },
      { code: 'da', name: 'Dansk', file: 'da.json' },
      { code: 'de', name: 'Deutsch', file: 'de.json' },
      { code: 'el', name: 'Ελληνικά', file: 'el.json' },
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'es', name: 'Español', file: 'es.json' },
      { code: 'fi', name: 'Suomi', file: 'fi.json' },
      { code: 'fr', name: 'Français', file: 'fr.json' },
      { code: 'hi', name: 'हिन्दी', file: 'hi.json' },
      { code: 'hu', name: 'Magyar', file: 'hu.json' },
      { code: 'id', name: 'Bahasa Indonesia', file: 'id.json' },
      { code: 'it', name: 'Italiano', file: 'it.json' },
      { code: 'ja', name: '日本語', file: 'ja.json' },
      { code: 'ko', name: '한국어', file: 'ko.json' },
      { code: 'nl', name: 'Nederlands', file: 'nl.json' },
      { code: 'no', name: 'Norsk', file: 'no.json' },
      { code: 'pl', name: 'Polski', file: 'pl.json' },
      { code: 'pt', name: 'Português', file: 'pt.json' },
      { code: 'ro', name: 'Română', file: 'ro.json' },
      { code: 'ru', name: 'Русский', file: 'ru.json' },
      { code: 'sv', name: 'Svenska', file: 'sv.json' },
      { code: 'th', name: 'ไทย', file: 'th.json' },
      { code: 'tr', name: 'Türkçe', file: 'tr.json' },
      { code: 'vi', name: 'Tiếng Việt', file: 'vi.json' },
      { code: 'zh', name: '中文', file: 'zh.json' },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'cervantic_lang',
      redirectOn: 'root',
    },
  },
})
