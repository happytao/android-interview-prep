<script setup lang="ts">
import {
  BookOpen,
  BookOpenCheck,
  DatabaseBackup,
  Eye,
  EyeOff,
  Monitor,
  Moon,
  Search,
  Sun,
  Zap,
} from 'lucide-vue-next'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
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

const route = useRoute()
const { mode, cycleTheme } = useTheme()
const studyStore = useStudyStore()
const currentDomain = computed(() => getDomainManifest(props.activeDomain))
const isDrillMode = computed(() => route.path === '/mock' || route.name === 'mock')

const readHomeTarget = computed(() => {
  if (!currentDomain.value) return props.activeDomain ? `/${props.activeDomain}` : '/'
  return currentDomain.value.config.status === 'active'
    ? `/${currentDomain.value.config.id}`
    : `/${currentDomain.value.config.id}/planned`
})

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
    class="sticky top-0 z-30 h-14 border-b border-[var(--border-subtle)]"
    :class="isDrillMode ? 'bg-[var(--bg-surface)]' : 'apple-header'"
  >
    <div class="mx-auto flex h-full max-w-[1760px] items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
      <!-- Left: Brand & Pure Android Breadcrumb -->
      <div class="flex min-w-0 items-center gap-2.5">
        <RouterLink
          :to="readHomeTarget"
          class="flex shrink-0 items-center gap-2.5 rounded-[10px] py-1 text-[var(--text-primary)] transition hover:opacity-80"
        >
          <span
            class="flex h-7 w-7 items-center justify-center rounded-[9px] bg-[var(--brand-blue)] text-white shadow-[0_1px_4px_rgba(0,113,227,0.3)]"
          >
            <BookOpenCheck class="h-4 w-4" />
          </span>
          <span class="hidden whitespace-nowrap text-sm font-semibold tracking-tight sm:inline">
            技术面试复习站
          </span>
        </RouterLink>

        <template v-if="currentDomain">
          <span class="hidden text-xs text-[var(--border-strong)] xl:inline">/</span>
          <RouterLink
            :to="readHomeTarget"
            class="hidden shrink-0 whitespace-nowrap items-center gap-1.5 rounded-[8px] px-2 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] xl:inline-flex"
          >
            <span>{{ currentDomain.config.name }}</span>
            <span
              v-if="currentDomain.config.status === 'planned'"
              class="rounded-full bg-[var(--bg-surface-muted)] px-2 py-0.5 text-xs text-[var(--text-muted)]"
            >
              规划中
            </span>
          </RouterLink>
        </template>
      </div>

      <!-- Center: Dual-Mode Segmented Switch (知识精读 | 沉浸演练) -->
      <nav
        aria-label="学习模式切换"
        class="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-[10px] bg-[var(--bg-segmented)] p-0.5 text-xs"
      >
        <RouterLink
          :to="readHomeTarget"
          :aria-current="!isDrillMode ? 'page' : undefined"
          class="inline-flex h-full items-center gap-1.5 whitespace-nowrap rounded-[8px] px-2.5 font-medium transition sm:px-3"
          :class="
            !isDrillMode
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-pill)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          "
        >
          <BookOpen
            class="h-3.5 w-3.5 shrink-0"
            :class="!isDrillMode ? 'text-[var(--brand-blue)]' : ''"
          />
          <span class="sm:hidden">精读</span>
          <span class="hidden sm:inline">知识精读</span>
        </RouterLink>

        <RouterLink
          :to="{ path: '/mock', query: { domain: props.activeDomain } }"
          :aria-current="isDrillMode ? 'page' : undefined"
          class="inline-flex h-full items-center gap-1.5 whitespace-nowrap rounded-[8px] px-2.5 font-medium transition sm:px-3"
          :class="
            isDrillMode
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-pill)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          "
          title="沉浸式三阶口述演练舱"
        >
          <Zap
            class="h-3.5 w-3.5 shrink-0"
            :class="isDrillMode ? 'text-[var(--brand-blue)]' : ''"
          />
          <span class="sm:hidden">演练</span>
          <span class="hidden sm:inline">沉浸演练</span>
          <span
            v-if="studyStore.stats.dueCount > 0"
            class="inline-flex items-center rounded-full bg-[var(--brand-blue-soft)] px-2 py-0.5 text-xs leading-none font-semibold tabular-nums text-[var(--brand-blue-text)]"
          >
            <span class="sm:hidden">{{ studyStore.stats.dueCount }}</span>
            <span class="hidden sm:inline">待复习 {{ studyStore.stats.dueCount }}</span>
          </span>
        </RouterLink>
      </nav>

      <!-- Right: Capsule Search Trigger + Compact Controls -->
      <div class="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          class="inline-flex h-8 shrink-0 whitespace-nowrap items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] px-3 text-xs text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
          aria-label="搜索题目"
          @click="emit('openSearch')"
        >
          <Search class="h-3.5 w-3.5 shrink-0" />
          <span class="hidden md:inline lg:hidden">搜索</span>
          <span class="hidden lg:inline">搜索题目 / 关键词</span>
          <kbd
            class="hidden rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)] lg:inline"
          >
            ⌘K
          </kbd>
        </button>

        <button
          type="button"
          :aria-pressed="studyStore.state.selfTestMode"
          class="hidden h-8 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-[10px] border px-2.5 text-xs font-medium transition md:inline-flex"
          :class="
            studyStore.state.selfTestMode
              ? 'border-transparent bg-[var(--brand-blue)] text-white shadow-[0_1px_4px_rgba(0,113,227,0.3)]'
              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
          "
          title="切换阅读页自测遮罩模式"
          @click="studyStore.setSelfTestMode(!studyStore.state.selfTestMode)"
        >
          <EyeOff v-if="studyStore.state.selfTestMode" class="h-3.5 w-3.5" />
          <Eye v-else class="h-3.5 w-3.5" />
          <span>{{ studyStore.state.selfTestMode ? '自测中' : '自测' }}</span>
        </button>

        <button
          type="button"
          class="relative inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
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
          class="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
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
