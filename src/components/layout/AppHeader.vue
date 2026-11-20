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
import { allDomains } from '@/domains/registry'
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
    class="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/92 backdrop-blur-md"
  >
    <div class="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-2 px-3 sm:px-5">
      <!-- Left: Brand + Domain Pills -->
      <div class="flex min-w-0 items-center gap-3">
        <RouterLink
          to="/"
          class="flex shrink-0 items-center gap-2 rounded-lg py-1 pr-1.5 text-[var(--text-primary)] hover:opacity-90"
        >
          <span
            class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--domain-accent)] text-[var(--domain-accent-fg)] shadow-xs"
          >
            <BookOpenCheck class="h-4.5 w-4.5" />
          </span>
          <span class="hidden whitespace-nowrap text-sm font-bold tracking-tight sm:inline">技术面试复习站</span>
        </RouterLink>

        <nav class="hidden items-center gap-1 md:flex" aria-label="技术领域切换">
          <RouterLink
            v-for="d in allDomains"
            :key="d.config.id"
            :to="d.config.status === 'active' ? `/${d.config.id}` : `/${d.config.id}/planned`"
            class="inline-flex shrink-0 whitespace-nowrap items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition xl:px-2.5"
            :class="
              props.activeDomain === d.config.id
                ? 'bg-[var(--domain-accent-soft)] text-[var(--domain-accent)] font-semibold'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] hover:text-[var(--text-primary)]'
            "
          >
            <span>{{ d.config.name }}</span>
            <span
              v-if="d.config.status === 'planned'"
              class="hidden rounded bg-[var(--bg-surface-muted)] px-1 py-0.5 text-[10px] text-[var(--text-muted)] xl:inline"
            >
              规划中
            </span>
          </RouterLink>
        </nav>
      </div>

      <!-- Right: Actions -->
      <div class="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          class="inline-flex h-9 shrink-0 whitespace-nowrap items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] px-2.5 text-xs text-[var(--text-secondary)] transition hover:border-[var(--domain-accent)] hover:text-[var(--text-primary)] sm:px-3"
          aria-label="搜索题目"
          @click="emit('openSearch')"
        >
          <Search class="h-4 w-4 shrink-0 text-[var(--domain-accent)]" />
          <span class="hidden xl:inline">搜索题目 / 关键词</span>
          <span class="hidden sm:inline xl:hidden">搜索</span>
          <kbd
            class="hidden rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)] xl:inline"
          >
            Ctrl K
          </kbd>
        </button>

        <RouterLink
          :to="{ path: '/mock', query: { domain: props.activeDomain } }"
          class="inline-flex h-9 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-xs font-medium text-[var(--text-primary)] transition hover:border-[var(--domain-accent)]"
          title="模拟抽题与今日待复习"
        >
          <Shuffle class="h-3.5 w-3.5 shrink-0 text-[var(--domain-accent)]" />
          <span class="hidden sm:inline">抽题演练</span>
          <span
            v-if="studyStore.stats.dueCount > 0"
            class="rounded-full bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-orange-600 dark:text-orange-300"
          >
            {{ studyStore.stats.dueCount }}
          </span>
        </RouterLink>

        <button
          type="button"
          class="hidden h-9 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium transition md:inline-flex"
          :class="
            studyStore.state.selfTestMode
              ? 'border-[var(--domain-accent)] bg-[var(--domain-accent-soft)] text-[var(--domain-accent)]'
              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          "
          title="切换面试自测遮罩模式"
          @click="studyStore.setSelfTestMode(!studyStore.state.selfTestMode)"
        >
          <EyeOff v-if="studyStore.state.selfTestMode" class="h-3.5 w-3.5" />
          <Eye v-else class="h-3.5 w-3.5" />
          <span>{{ studyStore.state.selfTestMode ? '自测中' : '自测模式' }}</span>
        </button>

        <button
          type="button"
          class="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--domain-accent)] hover:text-[var(--text-primary)]"
          title="学习记录备份与设置"
          aria-label="学习记录备份与设置"
          @click="emit('openBackup')"
        >
          <DatabaseBackup class="h-4 w-4" />
          <span
            v-if="needBackupAlert"
            class="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500"
            title="建议导出本地备份"
          />
        </button>

        <button
          type="button"
          class="inline-flex h-9 items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--domain-accent)] hover:text-[var(--text-primary)]"
          :title="`切换主题（当前：${themeLabel}）`"
          :aria-label="`切换主题，当前为${themeLabel}`"
          @click="cycleTheme"
        >
          <Sun v-if="mode === 'light'" class="h-4 w-4 text-amber-500" />
          <Moon v-else-if="mode === 'dark'" class="h-4 w-4 text-sky-400" />
          <Monitor v-else class="h-4 w-4 text-[var(--domain-accent)]" />
          <span class="hidden xl:inline">{{ themeLabel }}</span>
        </button>
      </div>
    </div>
  </header>
</template>
