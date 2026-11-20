<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import BackupModal from '@/components/common/BackupModal.vue'
import SearchModal from '@/components/common/SearchModal.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import { useHotkeys } from '@/composables/useHotkeys'
import { useTheme } from '@/composables/useTheme'
import { getDomainManifest } from '@/domains/registry'

const route = useRoute()
const { resolvedTheme } = useTheme()

const searchOpen = ref(false)
const backupOpen = ref(false)

const activeDomain = computed(() => {
  const param = route.params.domain
  return typeof param === 'string' && param.length > 0 ? param : 'android'
})

const activeDomainConfig = computed(() => getDomainManifest(activeDomain.value)?.config)

function hexToSoftRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = Number.parseInt(clean.slice(0, 2), 16)
  const g = Number.parseInt(clean.slice(2, 4), 16)
  const b = Number.parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

watchEffect(() => {
  if (typeof document === 'undefined' || !activeDomainConfig.value) return
  const isDark = resolvedTheme.value === 'dark'
  const accent = isDark
    ? activeDomainConfig.value.accent.dark
    : activeDomainConfig.value.accent.light
  const root = document.documentElement.style
  root.setProperty('--domain-accent', accent)
  root.setProperty('--domain-accent-soft', hexToSoftRgba(accent, isDark ? 0.14 : 0.11))
  root.setProperty('--domain-accent-fg', isDark ? '#06281A' : '#FFFFFF')
})

useHotkeys({
  onOpenSearch: () => {
    searchOpen.value = true
  },
  onEscape: () => {
    searchOpen.value = false
    backupOpen.value = false
  },
})
</script>

<template>
  <div class="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)]">
    <AppHeader
      :active-domain="activeDomain"
      @open-search="searchOpen = true"
      @open-backup="backupOpen = true"
    />

    <RouterView />

    <SearchModal v-model:open="searchOpen" :active-domain="activeDomain" />
    <BackupModal v-model:open="backupOpen" />
  </div>
</template>
