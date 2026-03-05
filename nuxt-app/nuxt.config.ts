// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@vueuse/nuxt'],

  build: {
    transpile: ['vue']
  },

  imports: {
    // autoImport: false,
  },

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/': { ssr: true }
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    experimental: {
      websocket: true
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
