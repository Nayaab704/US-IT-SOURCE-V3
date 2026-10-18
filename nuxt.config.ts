// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/fonts'],

  css: ['~/assets/css/tokens.css', '~/assets/css/base.css'],

  typescript: {
    strict: true,
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'US IT Source',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    },
  },

  // Fonts are downloaded at build time and served from /_fonts — no runtime requests to Google.
  fonts: {
    defaults: {
      subsets: ['latin'],
    },
    families: [
      { name: 'Geist', provider: 'google', weights: [300, 400, 500, 600] },
      { name: 'Geist Mono', provider: 'google', weights: [400, 500] },
      { name: 'Instrument Serif', provider: 'google', weights: [400], styles: ['normal', 'italic'] },
    ],
  },

  // Lab experiments are dev-only: in production the files never enter the build.
  $production: {
    // Patterns resolve against the project root (not app/), hence the leading **.
    ignore: ['**/pages/lab/**'],
  },
})
