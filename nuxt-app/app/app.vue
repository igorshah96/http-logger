<template>
  <UApp>
    <UMain class="h-screen overflow-hidden">
      <NuxtPage />
    </UMain>
  </UApp>
</template>

<script setup lang="ts">
import { useHead, useSeoMeta } from '#imports';
import { UApp, UMain } from '#components';

useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: {
    lang: 'en',
  },
});

const title = 'HTTP Logger';
const description = 'Proxy-DevTools for monitoring HTTP traffic.';

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
});
</script>

<style>
html, body, #__nuxt {
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>
