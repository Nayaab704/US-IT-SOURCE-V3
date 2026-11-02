// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/fonts'],

  // Only .vue files are components: plain .ts modules live beside them (e.g. contact/handwriting.ts).
  components: [{ path: '~/components', extensions: ['vue'] }],

  css: ['~/assets/css/tokens.css', '~/assets/css/base.css'],

  vite: {
    build: {
      // three.js is one ~550 KB chunk; it is lazy-loaded with the stage (LazyStage), not in the entry.
      chunkSizeWarningLimit: 800,
    },
  },

  typescript: {
    strict: true,
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'US IT Source — Custom software built around the way you work',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'US IT Source designs and builds custom software, AI and computer vision around the way each business actually runs.' },
        { name: 'theme-color', content: '#020306' },
      ],
      // PLACEHOLDER favicon (docs/PLACEHOLDERS.md) until the logotype exists.
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
      ],
    },
  },

  // Fonts are downloaded at build time and served from /_fonts — no runtime requests to Google.
  fonts: {
    defaults: {
      subsets: ['latin'],
    },
    families: [
      // Upright only: italics are set in the display serif. Faces are fetched only when text uses them;
      // 600 serves <strong> (bold in the case studies).
      { name: 'Geist', provider: 'google', weights: [300, 400, 500, 600], styles: ['normal'] },
      { name: 'Geist Mono', provider: 'google', weights: [400, 500], styles: ['normal'] },
      // v2 display serif (ART_DIRECTION v2 §2): headlines, statements, project titles.
      // Preloaded: the opening's first (server-rendered) frame is set in it.
      { name: 'Newsreader', provider: 'google', weights: [300], styles: ['normal', 'italic'], preload: true },
    ],
  },

  // Pre-baked ribbon environments: the name changes with their inputs, so they never change in place.
  routeRules: {
    '/ribbon/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
  },

  hooks: {
    // No <link rel="prefetch"> for lazy chunks: by default every page would fetch three.js and the
    // WebGL scenes (~0.7 MB) in the background — even a case study, which never uses them — competing
    // with what is on screen. They still load on demand (the stage, each scene as its section nears).
    'build:manifest': (manifest) => {
      for (const chunk of Object.values(manifest)) chunk.prefetch = false
    },
  },

  // Lab experiments are dev-only: in production the files never enter the build.
  $production: {
    // Patterns resolve against the project root (not app/), hence the leading **.
    ignore: ['**/pages/lab/**'],
  },
})
