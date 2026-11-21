<script setup lang="ts">
import { ArrowRight, ChevronDown, ChevronRight, Play, RotateCcw, Zap } from 'lucide-vue-next'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { usePrefersReducedMotion } from '@/composables/usePrefersReducedMotion'
import { allDomains, getDomainFlatQuestions, getDomainManifest, getQuestionById } from '@/domains/registry'
import { useStudyStore } from '@/stores/studyStore'
import type { CategoryNode, QuestionSummary } from '@/types/interview'

type SyllabusFilter = 'all' | 'mastered' | 'due' | 'must-know' | 'diagrams' | 'bookmarked'

const props = defineProps<{
  domainId: string
}>()

const studyStore = useStudyStore()
const prefersReduced = usePrefersReducedMotion()

const quickFilter = ref<SyllabusFilter>('all')
const expandedL1Ids = ref<Set<string>>(new Set())
const activeChapterId = ref<string>('')
let chapterObserver: IntersectionObserver | null = null

const domainManifest = computed(() => getDomainManifest(props.domainId) ?? allDomains[0]!)
const allQuestions = computed(() => getDomainFlatQuestions(domainManifest.value.config.id))

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
  let diagrams = 0

  for (const q of allQuestions.value) {
    const s = studyStore.getStatus(q.id)
    if (s === 'mastered') mastered += 1
    else if (s === 'reviewing') reviewing += 1
    if (q.priority === 'must-know') mustKnow += 1
    if (dueSet.value.has(q.id)) due += 1
    if (studyStore.isBookmarked(q.id)) bookmarks += 1
    if (q.diagram) diagrams += 1
  }

  return {
    total: allQuestions.value.length,
    mastered,
    reviewing,
    mustKnow,
    due,
    bookmarks,
    diagrams,
    percent: allQuestions.value.length ? Math.round((mastered / allQuestions.value.length) * 100) : 0,
  }
})

function matchesQuickFilter(q: QuestionSummary): boolean {
  if (quickFilter.value === 'all') return true
  if (quickFilter.value === 'mastered') return studyStore.getStatus(q.id) === 'mastered'
  if (quickFilter.value === 'due') return dueSet.value.has(q.id)
  if (quickFilter.value === 'must-know') return q.priority === 'must-know'
  if (quickFilter.value === 'diagrams') return Boolean(q.diagram)
  return studyStore.isBookmarked(q.id)
}

interface ComputedSubcategory {
  id: string
  slug: string
  name: string
  description: string
  order: number
  questions: QuestionSummary[]
}

interface ComputedCategory {
  cat: CategoryNode
  total: number
  mastered: number
  matched: number
  masteredPercent: number
  subcategories: ComputedSubcategory[]
}

const computedCategories = computed<ComputedCategory[]>(() =>
  domainManifest.value.categories.map((cat) => {
    let total = 0
    let mastered = 0
    let matched = 0
    const subcategories: ComputedSubcategory[] = []

    for (const sub of cat.subcategories) {
      const filtered: QuestionSummary[] = []
      for (const q of sub.questions) {
        total += 1
        if (studyStore.getStatus(q.id) === 'mastered') mastered += 1
        if (matchesQuickFilter(q)) {
          matched += 1
          filtered.push(q)
        }
      }
      if (filtered.length > 0) {
        subcategories.push({
          id: sub.id,
          slug: sub.slug,
          name: sub.name,
          description: sub.description,
          order: sub.order,
          questions: filtered,
        })
      }
    }

    return {
      cat,
      total,
      mastered,
      matched,
      masteredPercent: total ? Math.round((mastered / total) * 100) : 0,
      subcategories,
    }
  }),
)

const visibleCategories = computed(() => computedCategories.value.filter((item) => item.matched > 0))
const matchedTotalCount = computed(() =>
  visibleCategories.value.reduce((acc, item) => acc + item.matched, 0),
)

const isFullSyllabus = computed(() => {
  const cats = domainManifest.value.categories
  return cats.length > 0 && cats.every((cat) => expandedL1Ids.value.has(cat.id))
})

function setQuickFilter(next: SyllabusFilter) {
  if (next !== 'all' && quickFilter.value === next) {
    quickFilter.value = 'all'
    return
  }
  quickFilter.value = next
}

function toggleCategory(id: string) {
  const next = new Set(expandedL1Ids.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedL1Ids.value = next
}

function setCompactMode() {
  const first = domainManifest.value.categories[0]
  expandedL1Ids.value = first ? new Set([first.id]) : new Set()
}

function setFullSyllabusMode() {
  expandedL1Ids.value = new Set(domainManifest.value.categories.map((c) => c.id))
}

function isCategoryExpanded(id: string) {
  if (quickFilter.value !== 'all') return true
  return expandedL1Ids.value.has(id)
}

async function jumpToChapter(cat: CategoryNode) {
  if (!expandedL1Ids.value.has(cat.id)) {
    const next = new Set(expandedL1Ids.value)
    next.add(cat.id)
    expandedL1Ids.value = next
  }
  activeChapterId.value = cat.id
  await nextTick()
  const el = document.getElementById(`chapter-${cat.slug}`)
  el?.scrollIntoView({
    behavior: prefersReduced.value ? 'auto' : 'smooth',
    block: 'start',
  })
}

const setupChapterObserver = async () => {
  chapterObserver?.disconnect()
  chapterObserver = null
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return

  await nextTick()
  const visibleIds = visibleCategories.value.map((item) => item.cat.id)
  if (visibleIds.length === 0) {
    activeChapterId.value = ''
    return
  }
  if (!activeChapterId.value || !visibleIds.includes(activeChapterId.value)) {
    activeChapterId.value = visibleIds[0]!
  }

  const elements = visibleCategories.value
    .map((item) => document.getElementById(`chapter-${item.cat.slug}`))
    .filter((el): el is HTMLElement => Boolean(el))
  if (elements.length === 0) return

  chapterObserver = new IntersectionObserver(
    (entries) => {
      const intersecting = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      const id = intersecting[0]?.target.getAttribute('data-chapter-id')
      if (id) activeChapterId.value = id
    },
    { rootMargin: '-96px 0px -65% 0px', threshold: 0 },
  )

  for (const el of elements) {
    chapterObserver.observe(el)
  }
}

watch(
  () => domainManifest.value.config.id,
  () => {
    const first = domainManifest.value.categories[0]
    expandedL1Ids.value = first ? new Set([first.id]) : new Set()
    activeChapterId.value = first?.id ?? ''
    quickFilter.value = 'all'
    void setupChapterObserver()
  },
  { immediate: true },
)

watch(
  () => visibleCategories.value.map((c) => c.cat.id).join(','),
  () => {
    void setupChapterObserver()
  },
)

onMounted(() => {
  void setupChapterObserver()
})

onUnmounted(() => {
  chapterObserver?.disconnect()
  chapterObserver = null
})

const statMetrics = computed(() => [
  { id: 'all' as SyllabusFilter, label: 'TOTAL', value: `${domainStats.value.total}` },
  {
    id: 'mastered' as SyllabusFilter,
    label: 'MASTERED',
    value: `${domainStats.value.percent}% (${domainStats.value.mastered}/${domainStats.value.total})`,
  },
  { id: 'due' as SyllabusFilter, label: 'DUE TODAY', value: `${domainStats.value.due}` },
  { id: 'must-know' as SyllabusFilter, label: 'MUST-KNOW', value: `${domainStats.value.mustKnow}` },
  {
    id: 'diagrams' as SyllabusFilter,
    label: 'INTERACTIVE DIAGRAMS',
    value: `${domainStats.value.diagrams}`,
  },
])

const activeFilterLabel = computed(() => {
  if (quickFilter.value === 'mastered') return '已掌握'
  if (quickFilter.value === 'due') return '今日待复习'
  if (quickFilter.value === 'must-know') return '高频必考'
  if (quickFilter.value === 'diagrams') return '交互式图解'
  if (quickFilter.value === 'bookmarked') return '已收藏'
  return ''
})

function statusDotClass(id: string) {
  const s = studyStore.getStatus(id)
  if (s === 'mastered') return 'bg-[var(--status-mastered)]'
  if (s === 'reviewing') return 'bg-[var(--status-reviewing)]'
  return 'bg-black/15 dark:bg-white/25'
}

function priorityLabel(p: QuestionSummary['priority']) {
  if (p === 'must-know') return '必考'
  if (p === 'core') return '常考'
  return '加分'
}
</script>

<template>
  <main class="pb-24">
    <!-- Open Asymmetric Editorial Hero with Main Apple/Android Ambient Glow -->
    <section class="hero-ambient border-b border-[var(--border-subtle)]">
      <div class="mx-auto max-w-[1360px] px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div
          class="inline-flex items-center gap-2 rounded-full bg-[var(--brand-blue-soft)] px-3 py-1 font-mono text-[11px] font-semibold tracking-wider text-[var(--brand-blue-text)] uppercase"
        >
          <span>{{ domainManifest.config.id }} engineering</span>
          <span class="opacity-40">·</span>
          <span>{{ domainManifest.categories.length }} modules / {{ domainStats.total }} topics</span>
        </div>

        <h1
          class="mt-4 text-balance text-3xl font-bold tracking-[-0.03em] leading-[1.16] text-[var(--text-primary)] sm:text-4xl lg:text-[42px]"
        >
          原理驱动的 {{ domainManifest.config.name }} 知识图谱
        </h1>

        <p class="mt-3.5 max-w-2xl text-pretty text-sm leading-relaxed text-[var(--text-secondary)] sm:text-[15px]">
          {{ domainManifest.config.tagline }}。全书按「答题思路 → 原理解析 → 图解流程 → 追问与关键词 → 权威参考」编排，支持三阶口述演练与间隔复习。
        </p>

        <div class="mt-7 flex flex-wrap items-center gap-3">
          <RouterLink
            v-if="lastVisitedQuestion"
            :to="`/${lastVisitedQuestion.domain}/${lastVisitedQuestion.slug}`"
            class="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--btn-primary-bg)] px-5 text-sm font-medium text-[var(--btn-primary-fg)] shadow-[0_2px_10px_rgba(0,113,227,0.28)] transition hover:bg-[var(--btn-primary-hover)]"
          >
            <Play class="h-3.5 w-3.5 fill-current" />
            <span>继续阅读：{{ lastVisitedQuestion.title.length > 18 ? `${lastVisitedQuestion.title.slice(0, 18)}…` : lastVisitedQuestion.title }}</span>
          </RouterLink>
          <RouterLink
            v-else-if="firstQuestion"
            :to="`/${firstQuestion.domain}/${firstQuestion.slug}`"
            class="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--btn-primary-bg)] px-5 text-sm font-medium text-[var(--btn-primary-fg)] shadow-[0_2px_10px_rgba(0,113,227,0.28)] transition hover:bg-[var(--btn-primary-hover)]"
          >
            <Play class="h-3.5 w-3.5 fill-current" />
            <span>开始系统阅读</span>
          </RouterLink>

          <RouterLink
            :to="{ path: '/mock', query: { domain: domainManifest.config.id } }"
            class="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] px-5 text-sm font-medium text-[var(--text-primary)] shadow-[var(--shadow-pill)] transition hover:bg-[var(--bg-hover)]"
          >
            <Zap class="h-3.5 w-3.5 text-[var(--brand-blue)]" />
            <span>进入沉浸演练</span>
            <span
              v-if="domainStats.due > 0"
              class="rounded-full bg-[var(--brand-blue-soft)] px-2 py-0.5 text-xs font-semibold tabular-nums text-[var(--brand-blue-text)]"
            >
              待复习 {{ domainStats.due }}
            </span>
          </RouterLink>
        </div>
      </div>
    </section>

    <div class="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8">
      <!-- Borderless Horizontal Metric Stat Strip -->
      <section
        class="border-b border-[var(--border-subtle)] pt-1"
        aria-label="题库进度与筛选指标"
      >
        <div class="flex flex-wrap items-stretch gap-x-5 gap-y-0 sm:gap-x-8">
          <button
            v-for="metric in statMetrics"
            :key="metric.id"
            type="button"
            class="-mb-px inline-flex min-h-[44px] items-center gap-2 border-b-2 py-2.5 font-mono text-xs tabular-nums transition-colors"
            :class="
              quickFilter === metric.id
                ? 'border-[var(--brand-blue)] font-semibold text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            "
            :aria-pressed="quickFilter === metric.id"
            @click="setQuickFilter(metric.id)"
          >
            <span class="tracking-wider uppercase">{{ metric.label }}</span>
            <span
              class="text-[12.5px]"
              :class="quickFilter === metric.id ? 'text-[var(--brand-blue-text)]' : 'text-[var(--text-primary)]'"
            >
              {{ metric.value }}
            </span>
          </button>
        </div>
      </section>

      <!-- Index Toolbar -->
      <section class="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2.5">
          <div
            class="inline-flex items-center gap-0.5 rounded-[10px] bg-[var(--bg-segmented)] p-1 text-xs"
            role="group"
            aria-label="目录展开模式"
          >
            <button
              type="button"
              class="min-h-8 rounded-[7px] px-3 py-1 font-medium transition disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0"
              :class="
                !isFullSyllabus
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-pill)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              "
              :disabled="quickFilter !== 'all'"
              @click="setCompactMode"
            >
              紧凑章节
            </button>
            <button
              type="button"
              class="min-h-8 rounded-[7px] px-3 py-1 font-medium transition disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0"
              :class="
                isFullSyllabus
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-pill)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              "
              :disabled="quickFilter !== 'all'"
              @click="setFullSyllabusMode"
            >
              展开全书大纲
            </button>
          </div>

          <button
            type="button"
            class="inline-flex min-h-8 items-center gap-1.5 rounded-[10px] border px-3 py-1 text-xs font-medium transition sm:min-h-0"
            :class="
              quickFilter === 'bookmarked'
                ? 'border-[var(--brand-blue)] bg-[var(--brand-blue-soft)] text-[var(--brand-blue-text)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
            "
            @click="setQuickFilter('bookmarked')"
          >
            <span>收藏</span>
            <span class="tabular-nums">{{ domainStats.bookmarks }}</span>
          </button>
        </div>

        <div v-if="quickFilter !== 'all'" class="flex items-center gap-2 text-xs">
          <span
            class="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-blue-soft)] px-3 py-1 text-xs font-medium text-[var(--brand-blue-text)]"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-[var(--brand-blue)]" />
            <span>筛选：{{ activeFilterLabel }} ({{ matchedTotalCount }})</span>
          </span>
          <button
            type="button"
            class="inline-flex min-h-8 items-center gap-1 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] sm:min-h-0"
            @click="quickFilter = 'all'"
          >
            <RotateCcw class="h-3 w-3" />
            <span>重置</span>
          </button>
        </div>
      </section>

      <!-- 2-Column Editorial Chapter Index + Single-Column Spacious Subsections -->
      <section class="mt-5">
        <div
          v-if="visibleCategories.length === 0"
          class="bento-card rounded-[16px] px-6 py-14 text-center"
        >
          <p class="text-sm font-medium text-[var(--text-primary)]">
            {{
              quickFilter === 'due'
                ? '今日待复习队列已清空'
                : quickFilter === 'mastered'
                  ? '暂未标记已掌握的题目，翻开一章开始阅读并打卡吧'
                  : '当前筛选条件下暂无匹配题目'
            }}
          </p>
          <button
            type="button"
            class="mt-4 inline-flex min-h-9 items-center rounded-full bg-[var(--btn-primary-bg)] px-5 text-xs font-medium text-[var(--btn-primary-fg)] transition hover:bg-[var(--btn-primary-hover)]"
            @click="quickFilter = 'all'"
          >
            查看全部 {{ domainStats.total }} 道题目
          </button>
        </div>

        <div v-else class="lg:grid lg:grid-cols-12 lg:gap-8">
          <!-- Left Sticky Chapter Anchor Rail -->
          <aside class="hidden lg:col-span-3 lg:block">
            <nav
              class="sidebar-scroll sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2"
              aria-label="章节目录锚点"
            >
              <div class="px-2.5 font-mono text-[11px] font-semibold tracking-wider text-[var(--text-muted)] uppercase">
                Chapters · 章节锚点
              </div>
              <ul class="mt-2.5 border-l border-[var(--border-subtle)] text-xs">
                <li v-for="item in visibleCategories" :key="item.cat.id">
                  <button
                    type="button"
                    class="-ml-px flex w-full items-center justify-between gap-2 border-l-2 py-2 pr-2 pl-3 text-left transition-colors"
                    :class="
                      activeChapterId === item.cat.id
                        ? 'border-[var(--brand-blue)] font-semibold text-[var(--brand-blue)]'
                        : 'border-transparent text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                    "
                    @click="jumpToChapter(item.cat)"
                  >
                    <span class="flex min-w-0 items-baseline gap-2">
                      <span class="shrink-0 font-mono text-[11px] tabular-nums text-[var(--text-muted)]">
                        {{ String(item.cat.order).padStart(2, '0') }}
                      </span>
                      <span class="truncate">{{ item.cat.name }}</span>
                    </span>
                    <span class="shrink-0 font-mono text-[11px] tabular-nums text-[var(--text-muted)]">
                      {{ item.mastered }}/{{ item.total }}
                    </span>
                  </button>
                </li>
              </ul>
            </nav>
          </aside>

          <!-- Right Chapter Accordion with Single-Column Spacious Subsections -->
          <div class="lg:col-span-9">
            <div class="bento-card overflow-hidden rounded-[16px] divide-y divide-[var(--border-subtle)]">
              <div
                v-for="item in visibleCategories"
                :id="`chapter-${item.cat.slug}`"
                :key="item.cat.id"
                :data-chapter-id="item.cat.id"
                class="scroll-mt-20"
              >
                <button
                  type="button"
                  class="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-[var(--bg-hover)] sm:px-6 sm:py-5"
                  :aria-expanded="isCategoryExpanded(item.cat.id)"
                  @click="toggleCategory(item.cat.id)"
                >
                  <div class="flex min-w-0 flex-1 items-baseline gap-3 sm:gap-4">
                    <span
                      class="shrink-0 font-mono text-sm font-medium tabular-nums"
                      :class="
                        isCategoryExpanded(item.cat.id)
                          ? 'text-[var(--brand-blue)]'
                          : 'text-[var(--text-muted)]'
                      "
                    >
                      {{ String(item.cat.order).padStart(2, '0') }}
                    </span>
                    <div class="min-w-0 flex-1">
                      <h2 class="text-base font-semibold tracking-tight text-[var(--text-primary)] sm:text-[17px]">
                        {{ item.cat.name }}
                      </h2>
                      <p class="mt-0.5 line-clamp-1 text-xs text-[var(--text-muted)] sm:text-[13px]">
                        {{ item.cat.description }}
                      </p>
                    </div>
                  </div>

                  <div class="flex shrink-0 items-center gap-3">
                    <div
                      class="hidden h-[3px] w-20 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.12] sm:block"
                      aria-hidden="true"
                    >
                      <div
                        class="h-full rounded-full bg-gradient-to-r from-[var(--brand-blue)] to-[var(--status-mastered)] transition-[width] duration-300"
                        :style="{ width: `${item.masteredPercent}%` }"
                      />
                    </div>
                    <span class="font-mono text-xs tabular-nums text-[var(--text-muted)]">
                      {{ item.mastered }}/{{ item.total }}
                    </span>
                    <ChevronDown
                      v-if="isCategoryExpanded(item.cat.id)"
                      class="h-4 w-4 text-[var(--text-muted)]"
                    />
                    <ChevronRight
                      v-else
                      class="h-4 w-4 text-[var(--text-muted)]"
                    />
                  </div>
                </button>

                <!-- Paradigm C Style Spacious Single-Column Subsections -->
                <div
                  v-if="isCategoryExpanded(item.cat.id)"
                  class="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]"
                >
                  <div
                    v-for="sub in item.subcategories"
                    :key="sub.id"
                  >
                    <!-- L2 Sub-Header Band -->
                    <div
                      class="flex items-center justify-between gap-3 bg-[var(--bg-surface-muted)]/60 px-4 py-2.5 sm:px-6"
                    >
                      <div class="flex min-w-0 items-baseline gap-2.5">
                        <span class="shrink-0 font-mono text-xs font-medium tabular-nums text-[var(--brand-blue)]">
                          {{ String(item.cat.order).padStart(2, '0') }}-{{ String(sub.order).padStart(2, '0') }}
                        </span>
                        <h3 class="truncate text-xs font-semibold text-[var(--text-primary)] sm:text-[13px]">
                          {{ sub.name }}
                        </h3>
                        <span class="hidden truncate text-xs text-[var(--text-muted)] lg:inline">
                          · {{ sub.description }}
                        </span>
                      </div>
                      <span class="shrink-0 text-xs tabular-nums text-[var(--text-muted)]">
                        {{ sub.questions.length }} 题
                      </span>
                    </div>

                    <!-- Full-Width Single-Column Question Rows -->
                    <ul class="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                      <li v-for="q in sub.questions" :key="q.id">
                        <RouterLink
                          :to="`/${q.domain}/${q.slug}`"
                          class="group flex min-h-[46px] items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-hover)] sm:px-6"
                        >
                          <div class="flex min-w-0 flex-1 items-center gap-3">
                            <span
                              class="h-1.5 w-1.5 shrink-0 rounded-full"
                              :class="statusDotClass(q.id)"
                            />
                            <span class="shrink-0 font-mono text-xs tabular-nums text-[var(--text-muted)]">
                              {{ String(q.order).padStart(2, '0') }}
                            </span>
                            <span
                              class="min-w-0 flex-1 text-sm font-medium text-[var(--text-primary)] transition-colors group-hover:text-[var(--brand-blue)]"
                            >
                              {{ q.title }}
                            </span>
                          </div>

                          <div class="flex shrink-0 items-center gap-2">
                            <span
                              v-if="q.diagram"
                              class="hidden rounded-full bg-[var(--brand-blue-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--brand-blue-text)] sm:inline-flex"
                            >
                              交互图解
                            </span>
                            <span
                              v-else-if="q.hasMermaid"
                              class="hidden rounded-full bg-[var(--bg-surface-muted)] px-2.5 py-0.5 text-xs text-[var(--text-muted)] sm:inline-flex"
                            >
                              流程图
                            </span>
                            <span
                              class="rounded-full px-2.5 py-0.5 text-xs"
                              :class="
                                q.priority === 'must-know'
                                  ? 'bg-[var(--brand-blue-soft)] font-medium text-[var(--brand-blue-text)]'
                                  : 'bg-[var(--bg-surface-muted)] text-[var(--text-secondary)]'
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
            </div>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>
