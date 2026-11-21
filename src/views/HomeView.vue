<script setup lang="ts">
import {
  ArrowRight,
  AudioWaveform,
  Binary,
  Bookmark,
  Boxes,
  Clock,
  Cpu,
  Flame,
  Gauge,
  Layers,
  Network,
  Play,
  Shuffle,
  SlidersHorizontal,
  Workflow,
  Wrench,
  X,
} from 'lucide-vue-next'
import type { Component } from 'vue'
import { computed, nextTick, ref, useId, watch } from 'vue'
import { allDomains, getDomainFlatQuestions, getDomainManifest, getQuestionById } from '@/domains/registry'
import { useStudyStore } from '@/stores/studyStore'
import type { CategoryNode, QuestionSummary } from '@/types/interview'

const props = defineProps<{
  domainId: string
}>()

const studyStore = useStudyStore()
const quickFilter = ref<'all' | 'must-know' | 'due' | 'bookmarked'>('all')
const selectedCategoryId = ref<string | null>(null)
const detailPanelRef = ref<HTMLElement | null>(null)
const ringGradId = `progress-ring-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

const domainManifest = computed(() => getDomainManifest(props.domainId) ?? allDomains[0]!)
const allQuestions = computed(() => getDomainFlatQuestions(domainManifest.value.config.id))

const iconMap: Record<string, Component> = {
  Cpu,
  Layers,
  Workflow,
  Sparkles: SlidersHorizontal,
  SlidersHorizontal,
  Boxes,
  Network,
  Gauge,
  Wrench,
  Binary,
  AudioWaveform,
}

function getCategoryIcon(iconName?: string): Component {
  return (iconName && iconMap[iconName]) || Layers
}

watch(
  () => domainManifest.value.config.id,
  () => {
    quickFilter.value = 'all'
    selectedCategoryId.value = null
  },
  { immediate: true },
)

const lastVisitedQuestion = computed(() => {
  const id = studyStore.state.lastVisitedId
  if (!id) return null
  const q = getQuestionById(id)
  return q && q.domain === domainManifest.value.config.id ? q : null
})

const firstQuestion = computed(() => allQuestions.value[0] ?? null)

const dueSet = computed(() => new Set(studyStore.dueReviewIds))

const domainStats = computed(() => {
  let mastered = 0
  let reviewing = 0
  let mustKnow = 0
  let due = 0
  let bookmarks = 0
  let notes = 0

  for (const q of allQuestions.value) {
    const s = studyStore.getStatus(q.id)
    if (s === 'mastered') mastered += 1
    else if (s === 'reviewing') reviewing += 1
    if (q.priority === 'must-know') mustKnow += 1
    if (dueSet.value.has(q.id)) due += 1
    if (studyStore.isBookmarked(q.id)) bookmarks += 1
    if (studyStore.getNote(q.id).trim().length > 0) notes += 1
  }

  return {
    total: allQuestions.value.length,
    mastered,
    reviewing,
    mustKnow,
    due,
    bookmarks,
    notes,
    percent: allQuestions.value.length ? Math.round((mastered / allQuestions.value.length) * 100) : 0,
  }
})

// Circular progress ring geometry (r=40 -> circumference = 251.33)
const ringRadius = 40
const ringCircumference = 2 * Math.PI * ringRadius
const ringOffset = computed(() => {
  const pct = Math.max(0, Math.min(100, domainStats.value.percent))
  return ringCircumference * (1 - pct / 100)
})

function filterQuestions(list: QuestionSummary[]): QuestionSummary[] {
  if (quickFilter.value === 'all') return list
  if (quickFilter.value === 'must-know') return list.filter((q) => q.priority === 'must-know')
  if (quickFilter.value === 'due') return list.filter((q) => dueSet.value.has(q.id))
  return list.filter((q) => studyStore.isBookmarked(q.id))
}

function categoryProgress(cat: CategoryNode) {
  let total = 0
  let mastered = 0
  let matched = 0
  for (const sub of cat.subcategories) {
    for (const q of sub.questions) {
      total += 1
      if (studyStore.getStatus(q.id) === 'mastered') mastered += 1
      if (filterQuestions([q]).length > 0) matched += 1
    }
  }
  return { total, mastered, matched, percent: total ? Math.round((mastered / total) * 100) : 0 }
}

const visibleCategories = computed(() =>
  domainManifest.value.categories.filter((cat) => categoryProgress(cat).matched > 0),
)

const selectedCategory = computed<CategoryNode | null>(() => {
  if (!selectedCategoryId.value) return null
  return visibleCategories.value.find((cat) => cat.id === selectedCategoryId.value) ?? null
})

// Auto-select first matching module when switching to a non-'all' filter
watch(quickFilter, (val) => {
  if (val !== 'all') {
    const first = visibleCategories.value[0]
    selectedCategoryId.value = first ? first.id : null
  }
})

async function selectCategory(cat: CategoryNode) {
  if (selectedCategoryId.value === cat.id) {
    selectedCategoryId.value = null
    return
  }
  selectedCategoryId.value = cat.id
  await nextTick()
  detailPanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

function statusDotClass(id: string) {
  const s = studyStore.getStatus(id)
  if (s === 'mastered') return 'bg-[var(--status-mastered)]'
  if (s === 'reviewing') return 'bg-[var(--status-reviewing)]'
  return 'bg-black/15 dark:bg-white/20'
}

function priorityLabel(p: QuestionSummary['priority']) {
  if (p === 'must-know') return '必考'
  if (p === 'core') return '常考'
  return '加分'
}
</script>

<template>
  <main class="pb-20">
    <!-- Hero Section: 7:5 Split with Subtle Apple/Android Blue-Cyan Ambient Glow -->
    <section class="hero-ambient border-b border-[var(--border-subtle)]">
      <div class="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 sm:py-14">
        <div class="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-10">
          <!-- Left 7 cols: Brand Message & Capsule CTAs -->
          <div class="lg:col-span-7">
            <div
              class="inline-flex items-center gap-2 rounded-full bg-[var(--brand-blue-soft)] px-3 py-1 font-mono text-[11px] font-semibold tracking-wider text-[var(--brand-blue-text)] uppercase"
            >
              <span>{{ domainManifest.config.id }} engineering</span>
              <span class="opacity-40">·</span>
              <span>{{ domainManifest.categories.length }} modules / {{ domainStats.total }} topics</span>
            </div>

            <h1
              class="mt-4 text-balance text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl lg:text-[40px] lg:leading-[1.16]"
            >
              原理驱动的 {{ domainManifest.config.name }} 知识图谱
            </h1>

            <p class="mt-4 max-w-[540px] text-pretty text-sm leading-relaxed text-[var(--text-secondary)] sm:text-[15px]">
              {{ domainManifest.config.tagline }}。每道题按「答题思路 → 原理解析 → 图解流程 → 追问与关键词 → 权威参考」编排，支持自测遮罩与间隔复习。
            </p>

            <div class="mt-7 flex flex-wrap items-center gap-3">
              <RouterLink
                v-if="lastVisitedQuestion"
                :to="`/${lastVisitedQuestion.domain}/${lastVisitedQuestion.slug}`"
                class="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--btn-primary-bg)] px-5 text-sm font-medium text-[var(--btn-primary-fg)] shadow-[0_2px_10px_rgba(0,113,227,0.28)] transition hover:bg-[var(--btn-primary-hover)]"
              >
                <Play class="h-3.5 w-3.5 fill-current" />
                <span>继续学习：{{ lastVisitedQuestion.title.length > 16 ? `${lastVisitedQuestion.title.slice(0, 16)}…` : lastVisitedQuestion.title }}</span>
              </RouterLink>
              <RouterLink
                v-else-if="firstQuestion"
                :to="`/${firstQuestion.domain}/${firstQuestion.slug}`"
                class="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--btn-primary-bg)] px-5 text-sm font-medium text-[var(--btn-primary-fg)] shadow-[0_2px_10px_rgba(0,113,227,0.28)] transition hover:bg-[var(--btn-primary-hover)]"
              >
                <Play class="h-3.5 w-3.5 fill-current" />
                <span>开始系统复习</span>
              </RouterLink>

              <RouterLink
                :to="{ path: '/mock', query: { domain: domainManifest.config.id } }"
                class="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] px-5 text-sm font-medium text-[var(--text-primary)] shadow-[var(--shadow-pill)] transition hover:bg-[var(--bg-hover)]"
              >
                <Shuffle class="h-3.5 w-3.5 text-[var(--brand-blue)]" />
                <span>随机模拟抽题</span>
              </RouterLink>
            </div>
          </div>

          <!-- Right 5 cols: Learning Dashboard Bento Card -->
          <div class="lg:col-span-5">
            <div class="bento-card rounded-[20px] p-6">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-semibold tracking-tight text-[var(--text-primary)]">
                  复习进度仪表盘
                </span>
                <span class="font-mono text-[11px] text-[var(--text-muted)]">
                  本地离线同步
                </span>
              </div>

              <div class="mt-5 flex items-center gap-5 sm:gap-6">
                <!-- Circular Progress Ring -->
                <div class="relative flex h-25 w-25 shrink-0 items-center justify-center">
                  <svg class="h-25 w-25 -rotate-90" viewBox="0 0 96 96" aria-hidden="true">
                    <defs>
                      <linearGradient :id="ringGradId" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="var(--brand-blue)" />
                        <stop offset="100%" stop-color="var(--status-mastered)" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="48"
                      cy="48"
                      :r="ringRadius"
                      fill="none"
                      stroke="var(--brand-blue-soft)"
                      stroke-width="8.5"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      :r="ringRadius"
                      fill="none"
                      :stroke="`url(#${ringGradId})`"
                      stroke-width="8.5"
                      stroke-linecap="round"
                      :stroke-dasharray="ringCircumference"
                      :stroke-dashoffset="ringOffset"
                      class="transition-all duration-500"
                    />
                  </svg>
                  <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span class="font-mono text-lg font-bold tracking-tight text-[var(--text-primary)]">
                      {{ domainStats.percent }}%
                    </span>
                    <span class="font-mono text-[10px] text-[var(--text-muted)]">
                      {{ domainStats.mastered === 0 ? '待开启' : `${domainStats.mastered}/${domainStats.total}` }}
                    </span>
                  </div>
                </div>

                <!-- Right Micro-Stat List with Crisp Hairline Dividers -->
                <div class="min-w-0 flex-1 divide-y divide-[var(--border-subtle)]">
                  <button
                    type="button"
                    class="flex w-full items-center justify-between rounded-[8px] px-2 py-2.5 text-left transition hover:bg-[var(--bg-hover)]"
                    @click="quickFilter = 'due'"
                  >
                    <span class="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <Clock class="h-3.5 w-3.5 text-[var(--status-reviewing)]" />
                      <span>今日待复习</span>
                    </span>
                    <span class="font-mono text-sm font-semibold text-[var(--text-primary)]">
                      {{ domainStats.due }}
                    </span>
                  </button>

                  <button
                    type="button"
                    class="flex w-full items-center justify-between rounded-[8px] px-2 py-2.5 text-left transition hover:bg-[var(--bg-hover)]"
                    @click="quickFilter = 'must-know'"
                  >
                    <span class="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <Flame class="h-3.5 w-3.5 text-[var(--brand-blue)]" />
                      <span>高频必考</span>
                    </span>
                    <span class="font-mono text-sm font-semibold text-[var(--text-primary)]">
                      {{ domainStats.mustKnow }}
                    </span>
                  </button>

                  <button
                    type="button"
                    class="flex w-full items-center justify-between rounded-[8px] px-2 py-2.5 text-left transition hover:bg-[var(--bg-hover)]"
                    @click="quickFilter = 'bookmarked'"
                  >
                    <span class="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <Bookmark class="h-3.5 w-3.5 text-[var(--status-mastered)]" />
                      <span>收藏 / 笔记</span>
                    </span>
                    <span class="font-mono text-sm font-semibold text-[var(--text-primary)]">
                      {{ domainStats.bookmarks }}
                      <span class="text-xs font-normal text-[var(--text-muted)]">/ {{ domainStats.notes }}</span>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Main Bento Knowledge Directory -->
    <section class="mx-auto max-w-[1200px] px-4 pt-9 sm:px-6 sm:pt-11">
      <!-- Directory Header & iOS/macOS Segmented Control -->
      <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 class="text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl">
            核心知识模块
          </h2>
          <p class="mt-1 text-xs text-[var(--text-muted)] sm:text-sm">
            点击任意模块卡片展开二级专题与题目清单，按原理脉络逐个击破。
          </p>
        </div>

        <div
          class="inline-flex flex-wrap gap-1 self-start rounded-[12px] bg-[var(--bg-segmented)] p-1 text-xs sm:self-auto"
          role="tablist"
          aria-label="题目快速筛选"
        >
          <button
            v-for="tab in [
              { id: 'all', label: `全部 (${domainStats.total})` },
              { id: 'must-know', label: `高频必考 (${domainStats.mustKnow})` },
              { id: 'due', label: `待复习 (${domainStats.due})` },
              { id: 'bookmarked', label: `收藏 (${domainStats.bookmarks})` },
            ]"
            :key="tab.id"
            type="button"
            role="tab"
            :aria-selected="quickFilter === tab.id"
            class="rounded-[9px] px-3 py-1.5 font-medium transition"
            :class="
              quickFilter === tab.id
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-pill)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            "
            @click="quickFilter = tab.id as typeof quickFilter"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <!-- Empty Filter State -->
      <div
        v-if="visibleCategories.length === 0"
        class="bento-card mt-6 rounded-[20px] px-6 py-12 text-center"
      >
        <p class="text-sm font-semibold text-[var(--text-primary)]">
          {{ quickFilter === 'due' ? '今日待复习队列已清空' : '当前筛选条件下暂无匹配题目' }}
        </p>
        <p class="mt-1.5 text-xs text-[var(--text-muted)]">
          在题解页面标记「需复习」或「收藏本题」后，对应题目会自动归档到这里。
        </p>
        <button
          type="button"
          class="mt-5 inline-flex h-9 items-center rounded-full bg-[var(--btn-primary-bg)] px-5 text-xs font-medium text-[var(--btn-primary-fg)] transition hover:bg-[var(--btn-primary-hover)]"
          @click="quickFilter = 'all'"
        >
          查看全部题目
        </button>
      </div>

      <!-- Bento Card Grid (10 L1 Modules) -->
      <div
        v-else
        class="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
      >
        <button
          v-for="cat in visibleCategories"
          :key="cat.id"
          type="button"
          class="bento-card-interactive group flex flex-col rounded-[18px] p-5 text-left"
          :class="
            selectedCategoryId === cat.id
              ? 'ring-2 ring-[var(--brand-blue)] ring-offset-2 ring-offset-[var(--bg-canvas)]'
              : ''
          "
          :aria-expanded="selectedCategoryId === cat.id"
          @click="selectCategory(cat)"
        >
          <!-- Card Header: 40x40 Soft Blue Icon + Progress Counter -->
          <div class="flex items-start justify-between gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--brand-blue-soft)] text-[var(--brand-blue)] transition-colors group-hover:bg-[var(--brand-blue)] group-hover:text-white"
            >
              <component :is="getCategoryIcon(cat.icon)" class="h-5 w-5" />
            </div>
            <div class="flex items-center gap-1.5">
              <span class="font-mono text-[11px] text-[var(--text-muted)]">
                {{ String(cat.order).padStart(2, '0') }}
              </span>
              <span
                class="rounded-full bg-[var(--bg-surface-muted)] px-2.5 py-0.5 font-mono text-[11px] font-medium text-[var(--text-secondary)]"
              >
                {{ categoryProgress(cat).mastered }} / {{ categoryProgress(cat).total }}
              </span>
            </div>
          </div>

          <!-- Card Body: Title & 2-Line Summary -->
          <h3 class="mt-4 text-[16px] font-semibold tracking-tight text-[var(--text-primary)]">
            {{ cat.name }}
          </h3>
          <p class="mt-1.5 line-clamp-2 flex-1 text-xs leading-relaxed text-[var(--text-muted)]">
            {{ cat.description }}
          </p>

          <!-- Card Footer: 4px Progress Bar + Topic Count -->
          <div class="mt-5 border-t border-[var(--border-subtle)] pt-3.5">
            <div class="h-1 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.12]">
              <div
                class="h-full rounded-full bg-gradient-to-r from-[var(--brand-blue)] to-[var(--status-mastered)] transition-all duration-300"
                :style="{ width: `${categoryProgress(cat).percent}%` }"
              />
            </div>
            <div class="mt-2.5 flex items-center justify-between text-[11px]">
              <span class="font-mono text-[var(--text-muted)]">
                {{ cat.subcategories.length }} 专题 · {{ categoryProgress(cat).matched }} 题
              </span>
              <span
                class="inline-flex items-center gap-1 font-medium text-[var(--brand-blue)] transition-opacity"
              >
                <span>{{ selectedCategoryId === cat.id ? '已展开' : '查看题目' }}</span>
                <ArrowRight class="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
        </button>
      </div>

      <!-- Full-Width Expandable Detail Panel for Selected Module -->
      <div
        v-if="selectedCategory"
        ref="detailPanelRef"
        class="bento-card mt-6 overflow-hidden rounded-[20px]"
      >
        <div
          class="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-muted)]/60 px-5 py-4 sm:px-6"
        >
          <div class="flex min-w-0 items-center gap-3.5">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--brand-blue)] text-white"
            >
              <component :is="getCategoryIcon(selectedCategory.icon)" class="h-5 w-5" />
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-mono text-xs font-medium text-[var(--brand-blue)]">
                  MODULE {{ String(selectedCategory.order).padStart(2, '0') }}
                </span>
                <h3 class="text-base font-bold text-[var(--text-primary)] sm:text-lg">
                  {{ selectedCategory.name }}
                </h3>
              </div>
              <p class="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                {{ selectedCategory.description }}
              </p>
            </div>
          </div>

          <button
            type="button"
            class="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            @click="selectedCategoryId = null"
          >
            <X class="h-3.5 w-3.5" />
            <span>收起面板</span>
          </button>
        </div>

        <div class="divide-y divide-[var(--border-subtle)]">
          <div
            v-for="sub in selectedCategory.subcategories"
            :key="sub.id"
            v-show="filterQuestions(sub.questions).length > 0"
          >
            <!-- L2 Subcategory Header -->
            <div
              class="flex items-center justify-between gap-3 bg-[var(--bg-surface-muted)]/40 px-5 py-2.5 sm:px-6"
            >
              <div class="flex min-w-0 items-baseline gap-2.5">
                <span class="font-mono text-[11px] font-medium text-[var(--brand-blue)]">
                  {{ String(selectedCategory.order).padStart(2, '0') }}-{{ String(sub.order).padStart(2, '0') }}
                </span>
                <h4 class="truncate text-xs font-semibold text-[var(--text-primary)] sm:text-sm">
                  {{ sub.name }}
                </h4>
                <span class="hidden truncate text-xs text-[var(--text-muted)] lg:inline">
                  · {{ sub.description }}
                </span>
              </div>
              <span class="shrink-0 font-mono text-[11px] text-[var(--text-muted)]">
                {{ filterQuestions(sub.questions).length }} 题
              </span>
            </div>

            <!-- Question List Rows -->
            <ul class="divide-y divide-[var(--border-subtle)]">
              <li v-for="q in filterQuestions(sub.questions)" :key="q.id">
                <RouterLink
                  :to="`/${q.domain}/${q.slug}`"
                  class="group flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-[var(--bg-hover)] sm:px-6"
                >
                  <div class="flex min-w-0 flex-1 items-center gap-3">
                    <span
                      class="h-2 w-2 shrink-0 rounded-full"
                      :class="statusDotClass(q.id)"
                    />
                    <span class="font-mono text-[11px] text-[var(--text-muted)]">
                      {{ String(q.order).padStart(2, '0') }}
                    </span>
                    <span
                      class="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text-primary)] transition-colors group-hover:text-[var(--brand-blue)]"
                    >
                      {{ q.title }}
                    </span>
                  </div>

                  <div class="flex shrink-0 items-center gap-2">
                    <span
                      v-if="q.diagram"
                      class="hidden rounded-full bg-[var(--brand-blue-soft)] px-2 py-0.5 font-mono text-[10px] font-medium text-[var(--brand-blue-text)] sm:inline"
                    >
                      交互图解
                    </span>
                    <span
                      v-else-if="q.hasMermaid"
                      class="hidden rounded-full bg-[var(--bg-surface-muted)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-muted)] sm:inline"
                    >
                      流程图
                    </span>
                    <span
                      class="rounded-full px-2 py-0.5 font-mono text-[10px] font-medium"
                      :class="
                        q.priority === 'must-know'
                          ? 'bg-[var(--brand-blue-soft)] text-[var(--brand-blue-text)]'
                          : 'bg-[var(--bg-surface-muted)] text-[var(--text-muted)]'
                      "
                    >
                      {{ priorityLabel(q.priority) }}
                    </span>
                    <ArrowRight
                      class="h-3.5 w-3.5 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--brand-blue)]"
                    />
                  </div>
                </RouterLink>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
