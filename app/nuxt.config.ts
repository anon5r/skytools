// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from 'nuxt/config'

export default {
  app: {
    ssr: true,
    head: {
      title: 'SkyTools',
      meta: [
        { charset: 'utf-8' },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
          description: 'SkyTools is a tools for the Bluesky',
        },
        {
          name: 'theme-color',
          content: '#ccf2ff',
        },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        {
          rel: 'apple-touch-icon',
          type: 'image/png',
          sizes: '180x180',
          href: '/icons/apple-touch-icon.png',
        },
        {
          rel: 'apple-touch-icon',
          type: 'image/png',
          sizes: '144x144',
          href: '/icons/apple-touch-icon-144x144.png',
        },
        {
          rel: 'apple-touch-icon',
          type: 'image/png',
          sizes: '96x96',
          href: '/icons/apple-touch-icon-96x96.png',
        },
        {
          rel: 'apple-touch-icon',
          type: 'image/png',
          sizes: '72x72',
          href: '/icons/apple-touch-icon-72x72.png',
        },
        {
          rel: 'apple-touch-icon',
          type: 'image/png',
          sizes: '57x57',
          href: '/icons/apple-touch-icon-57x57.png',
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '180x180',
          href: '/icons/icon.png',
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '144x144',
          href: '/icons/icon-144x144.png',
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '96x96',
          href: '/icons/icon-96x96.png',
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '72x72',
          href: '/icons/icon-72x72.png',
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '57x57',
          href: '/icons/icon-57x57.png',
        },
      ],
      script: [
        {
          src: 'https://static.cloudflareinsights.com/beacon.min.js',
          defer: true,
          data_cf_beacon: process.env.CLOUDFLARE_BEACON_KEY ?? '{"token":""}',
        },
      ],
    },
  },
  appConfig: {
    pages: true,
    productionTip: false,
    title: 'SkyTools' as string,
    defaultSuffix: '.bsky.social' as string,
    bskyService: 'https://bsky.social' as string,
    bskyAppURL: 'https://bsky.app' as string,
    adminDID: 'did:plc:c22jdrqhoajyj5ca7e56a3ke' as string,
    inviteCodeFreq: { weeks: 2 } as object,
  },
  modules: ['@nuxtjs/tailwindcss'],
  css: [
    'flowbite/dist/flowbite.css',
    '@fortawesome/fontawesome-svg-core/styles.css',
    '~/assets/css/main.css',
  ],
  plugins: [
    '@/plugins/fontawesome.client.ts',
    '@/plugins/vue-gtm.client.ts',
    { src: '~/plugins/vercel.ts', mode: 'client' },
  ],
}
