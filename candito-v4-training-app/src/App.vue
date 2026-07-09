<template>
  <div class="min-h-screen" style="background: var(--color-surface); color: var(--color-primary);">
    <router-view />
    <AppTabBar v-if="route.meta.showTabBar" />
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import AppTabBar from '@/components/AppTabBar.vue'

const route = useRoute()
</script>
