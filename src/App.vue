<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import SearchModal from '@/components/common/SearchModal.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import { useHotkeys } from '@/composables/useHotkeys'
import { useTheme } from '@/composables/useTheme'
import { allDomains, getDomainManifest } from '@/domains/registry'

const BackupModal = defineAsyncComponent(() => import('@/components/common/BackupModal.vue'))

const route = useRoute()
const { resolvedTheme } = useTheme()

const searchOpen = ref(false)
const backupOpen = ref(false)

const defaultActiveDomain = computed(
  () => allDomains.find((d) => d.config.status === 'active')?.config.id ?? allDomains[0]?.config.id ?? '',
)

const activeDomain = computed(() => {
  const param = route.params.domain
  if (typeof param === 'string' && param.length > 0) return param
  const queryDomain = route.query.domain
  if (typeof queryDomain === 'string' && getDomainManifest(queryDomain)) return queryDomain
  return defaultActiveDomain.value
})

const activeDomainConfig = computed(() => getDomainManifest(activeDomain.value)?.config)

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  return [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16),
  ]
}

function hexToSoftRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function getContrastForeground(hex: string): string {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }) as [number, number, number]
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.35 ? '#0B0F14' : '#FFFFFF'
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
  root.setProperty('--domain-accent-fg', getContrastForeground(accent))
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
