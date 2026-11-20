<script setup lang="ts">
import {
  BookOpenCheck,
  DatabaseBackup,
  Eye,
  EyeOff,
  Monitor,
  Moon,
  Search,
  Shuffle,
  Sun,
} from 'lucide-vue-next'
import { computed } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { getDomainManifest } from '@/domains/registry'
import { useStudyStore } from '@/stores/studyStore'

const props = defineProps<{
  activeDomain: string
}>()

const emit = defineEmits<{
  (e: 'openSearch'): void
  (e: 'openBackup'): void
}>()

const { mode, cycleTheme } = useTheme()
const studyStore = useStudyStore()
const currentDomain = computed(() => getDomainManifest(props.activeDomain))

const needBackupAlert = computed(
  () =>
    studyStore.hasProgress &&
    (studyStore.daysSinceBackup === null || studyStore.daysSinceBackup >= 7),
)

const themeLabel = computed(() => {
  if (mode.value === 'light') return '浅色'
  if (mode.value === 'dark') return '深色'
  return '跟随系统'
})
</script>

<template>
  <header
    class="sticky top-0 z-30 h-14 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/85 backdrop-blur-md"
  >
    <div class="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6">
      <!-- Left: Minimalist Brand & Domain Context -->
      <div class="flex min-w-0 items-center gap-2.5">
        <RouterLink
          :to="currentDomain && currentDomain.config.status === 'active' ? `/${currentDomain.config.id}` : '/'"
          class="flex shrink-0 items-center gap-2 rounded-md py-1 text-[var(--text-primary)] transition hover:opacity-80"
        >
          <span
            class="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]"
          >
            <BookOpenCheck class="h-4 w-4" />
          </span>
          <span class="hidden whitespace-nowrap text-sm font-semibold tracking-tight sm:inline">
            技术面试复习站
          </span>
        </RouterLink>

        <template v-if="currentDomain">
          <span class="hidden text-xs text-[var(--border-strong)] md:inline">/</span>
          <RouterLink
            :to="currentDomain.config.status === 'active' ? `/${currentDomain.config.id}` : `/${currentDomain.config.id}/planned`"
            class="hidden shrink-0 whitespace-nowrap items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] md:inline-flex"
          >
            <span>{{ currentDomain.config.name }}</span>
            <span
              v-if="currentDomain.config.status === 'planned'"
              class="rounded border border-[var(--border-subtle)] px-1 py-0.5 font-mono text-[10px] text-[var(--text-muted)]"
            >
              规划中
            </span>
          </RouterLink>
        </template>
      </div>

      <!-- Right: Search Trigger + Compact Core Modes + Theme -->
      <div class="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          class="inline-flex h-8 shrink-0 whitespace-nowrap items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] px-2.5 text-xs text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          aria-label="搜索题目"
          @click="emit('openSearch')"
        >
          <Search class="h-3.5 w-3.5 shrink-0" />
          <span class="hidden sm:inline">搜索题目 / 关键词</span>
          <kbd
            class="hidden rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)] lg:inline"
          >
            Ctrl K
          </kbd>
        </button>

        <RouterLink
          :to="{ path: '/mock', query: { domain: props.activeDomain } }"
          class="inline-flex h-8 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          title="模拟抽题与今日待复习"
        >
          <Shuffle class="h-3.5 w-3.5 shrink-0" />
          <span class="hidden sm:inline">抽题</span>
          <span
            v-if="studyStore.stats.dueCount > 0"
            class="font-mono text-[11px] font-semibold text-[var(--domain-accent)]"
          >
            {{ studyStore.stats.dueCount }}
          </span>
        </RouterLink>

        <button
          type="button"
          class="hidden h-8 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition md:inline-flex"
          :class="
            studyStore.state.selfTestMode
              ? 'border-[var(--btn-primary-bg)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]'
              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
          "
          title="切换面试自测遮罩模式"
          @click="studyStore.setSelfTestMode(!studyStore.state.selfTestMode)"
        >
          <EyeOff v-if="studyStore.state.selfTestMode" class="h-3.5 w-3.5" />
          <Eye v-else class="h-3.5 w-3.5" />
          <span>{{ studyStore.state.selfTestMode ? '自测中' : '自测' }}</span>
        </button>

        <button
          type="button"
          class="relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          title="学习记录备份与设置"
          aria-label="学习记录备份与设置"
          @click="emit('openBackup')"
        >
          <DatabaseBackup class="h-3.5 w-3.5" />
          <span
            v-if="needBackupAlert"
            class="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-amber-500"
            title="建议导出本地备份"
          />
        </button>

        <button
          type="button"
          class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          :title="`切换主题（当前：${themeLabel}）`"
          :aria-label="`切换主题，当前为${themeLabel}`"
          @click="cycleTheme"
        >
          <Sun v-if="mode === 'light'" class="h-3.5 w-3.5" />
          <Moon v-else-if="mode === 'dark'" class="h-3.5 w-3.5" />
          <Monitor v-else class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  </header>
</template>
