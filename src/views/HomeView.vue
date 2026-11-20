<script setup lang="ts">
import { ArrowRight, ChevronDown, ChevronRight, Play, Shuffle } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { allDomains, getDomainFlatQuestions, getDomainManifest, getQuestionById } from '@/domains/registry'
import { useStudyStore } from '@/stores/studyStore'
import type { CategoryNode, QuestionSummary } from '@/types/interview'

const props = defineProps<{
  domainId: string
}>()

const studyStore = useStudyStore()
const quickFilter = ref<'all' | 'must-know' | 'due' | 'bookmarked'>('all')
const expandedL1Ids = ref<Set<string>>(new Set())

const domainManifest = computed(() => getDomainManifest(props.domainId) ?? allDomains[0]!)
const allQuestions = computed(() => getDomainFlatQuestions(domainManifest.value.config.id))

watch(
  () => domainManifest.value.config.id,
  () => {
    expandedL1Ids.value = new Set(
      domainManifest.value.categories.slice(0, 2).map((cat) => cat.id),
    )
    quickFilter.value = 'all'
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

const domainStats = computed(() => {
  let mastered = 0
  let reviewing = 0
  let mustKnow = 0
  let due = 0
  let bookmarks = 0
  let notes = 0
  const dueSet = new Set(studyStore.dueReviewIds)

  for (const q of allQuestions.value) {
    const s = studyStore.getStatus(q.id)
    if (s === 'mastered') mastered += 1
    else if (s === 'reviewing') reviewing += 1
    if (q.priority === 'must-know') mustKnow += 1
    if (dueSet.has(q.id)) due += 1
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

const hasMatchedQuestions = computed(() =>
  domainManifest.value.categories.some((cat) => categoryProgress(cat).matched > 0),
)

const dueSet = computed(() => new Set(studyStore.dueReviewIds))

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
  return { total, mastered, matched }
}

function toggleCategory(id: string) {
  if (expandedL1Ids.value.has(id)) {
    expandedL1Ids.value.delete(id)
  } else {
    expandedL1Ids.value.add(id)
  }
}

function isCategoryExpanded(id: string) {
  if (quickFilter.value !== 'all') return true
  return expandedL1Ids.value.has(id)
}

function statusDotClass(id: string) {
  const s = studyStore.getStatus(id)
  if (s === 'mastered') return 'bg-[var(--domain-accent)]'
  if (s === 'reviewing') return 'bg-amber-500'
  return 'bg-zinc-300 dark:bg-zinc-700'
}

function priorityLabel(p: QuestionSummary['priority']) {
  if (p === 'must-know') return '必考'
  if (p === 'core') return '常考'
  return '加分'
}
</script>

<template>
  <main class="mx-auto max-w-[1160px] px-4 py-8 pb-20 sm:px-6 sm:py-12">
    <!-- Open Editorial Hero (No outer card container) -->
    <section class="border-b border-[var(--border-subtle)] pb-8">
      <div class="font-mono text-xs tracking-wider text-[var(--text-muted)] uppercase">
        {{ domainManifest.config.id }} engineering · {{ domainManifest.categories.length }} modules / {{ domainStats.total }} topics
      </div>

      <h1 class="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
        原理驱动的 {{ domainManifest.config.name }} 面试知识图谱
      </h1>

      <p class="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
        {{ domainManifest.config.tagline }}。每道题按「答题思路 → 原理解析 → 图解流程 → 追问与关键词 → 权威参考」编排，支持自测折叠与间隔复习。
      </p>

      <div class="mt-6 flex flex-wrap items-center gap-2.5">
        <RouterLink
          v-if="lastVisitedQuestion"
          :to="`/${lastVisitedQuestion.domain}/${lastVisitedQuestion.slug}`"
          class="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--btn-primary-bg)] px-4 text-xs font-medium text-[var(--btn-primary-fg)] transition hover:opacity-90 sm:text-sm"
        >
          <Play class="h-3.5 w-3.5" />
          <span>继续学习：{{ lastVisitedQuestion.title.length > 18 ? `${lastVisitedQuestion.title.slice(0, 18)}…` : lastVisitedQuestion.title }}</span>
        </RouterLink>
        <RouterLink
          v-else-if="firstQuestion"
          :to="`/${firstQuestion.domain}/${firstQuestion.slug}`"
          class="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--btn-primary-bg)] px-4 text-xs font-medium text-[var(--btn-primary-fg)] transition hover:opacity-90 sm:text-sm"
        >
          <Play class="h-3.5 w-3.5" />
          <span>从第一题开始</span>
        </RouterLink>

        <RouterLink
          :to="{ path: '/mock', query: { domain: domainManifest.config.id } }"
          class="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)] sm:text-sm"
        >
          <Shuffle class="h-3.5 w-3.5 text-[var(--text-muted)]" />
          <span>随机模拟抽题</span>
        </RouterLink>
      </div>

      <!-- Borderless Horizontal Stat Strip -->
      <div class="mt-8 grid grid-cols-2 gap-6 border-t border-[var(--border-subtle)] pt-6 sm:flex sm:flex-wrap sm:items-start sm:gap-12">
        <div>
          <div class="text-xs text-[var(--text-muted)]">已掌握进度</div>
          <div class="mt-1 flex items-baseline gap-1.5 font-mono">
            <span class="text-2xl font-semibold text-[var(--text-primary)]">{{ domainStats.mastered }}</span>
            <span class="text-xs text-[var(--text-muted)]">/ {{ domainStats.total }} ({{ domainStats.percent }}%)</span>
          </div>
          <div class="mt-2 h-0.5 w-24 overflow-hidden bg-[var(--bg-surface-muted)]">
            <div
              class="h-full bg-[var(--domain-accent)] transition-all duration-300"
              :style="{ width: `${domainStats.percent}%` }"
            />
          </div>
        </div>

        <div>
          <div class="text-xs text-[var(--text-muted)]">今日待复习</div>
          <div class="mt-1 flex items-baseline gap-1.5 font-mono">
            <span class="text-2xl font-semibold text-[var(--text-primary)]">{{ domainStats.due }}</span>
            <span class="text-xs text-[var(--text-muted)]">题</span>
          </div>
        </div>

        <div>
          <div class="text-xs text-[var(--text-muted)]">高频必考</div>
          <div class="mt-1 flex items-baseline gap-1.5 font-mono">
            <span class="text-2xl font-semibold text-[var(--text-primary)]">{{ domainStats.mustKnow }}</span>
            <span class="text-xs text-[var(--text-muted)]">核心题</span>
          </div>
        </div>

        <div>
          <div class="text-xs text-[var(--text-muted)]">收藏与笔记</div>
          <div class="mt-1 flex items-baseline gap-1.5 font-mono">
            <span class="text-2xl font-semibold text-[var(--text-primary)]">{{ domainStats.bookmarks }}</span>
            <span class="text-xs text-[var(--text-muted)]">/ {{ domainStats.notes }} 笔记</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Knowledge Graph Toolbar -->
    <section class="mt-8 flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-sm font-semibold tracking-tight text-[var(--text-primary)] sm:text-base">
        两级分类知识目录
      </h2>

      <div
        class="flex flex-wrap gap-0.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] p-0.5 text-xs"
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
          class="rounded-[5px] px-2.5 py-1 font-medium transition"
          :class="
            quickFilter === tab.id
              ? 'border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)]'
              : 'border border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          "
          @click="quickFilter = tab.id as typeof quickFilter"
        >
          {{ tab.label }}
        </button>
      </div>
    </section>

    <!-- Clean Divide-y L1 -> L2 Knowledge List (Zero nested cards) -->
    <section class="mt-4">
      <div
        v-if="!hasMatchedQuestions"
        class="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] px-4 py-10 text-center"
      >
        <p class="text-sm font-medium text-[var(--text-primary)]">
          {{ quickFilter === 'due' ? '今日待复习队列已清空' : '当前筛选条件下暂无匹配题目' }}
        </p>
        <p class="mt-1 text-xs text-[var(--text-muted)]">
          在题解页面标记「需复习」或「收藏本题」后，对应题目会自动归档到这里。
        </p>
        <button
          type="button"
          class="mt-4 inline-flex h-8 items-center rounded-md bg-[var(--btn-primary-bg)] px-3.5 text-xs font-medium text-[var(--btn-primary-fg)]"
          @click="quickFilter = 'all'"
        >
          查看全部题目
        </button>
      </div>

      <div
        v-else
        class="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]"
      >
        <div
          v-for="cat in domainManifest.categories"
          :key="cat.id"
          v-show="categoryProgress(cat).matched > 0"
        >
          <button
            type="button"
            class="flex w-full items-center justify-between gap-4 px-2 py-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50 sm:px-3"
            @click="toggleCategory(cat.id)"
          >
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-baseline gap-2.5">
                <span class="font-mono text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                  {{ String(cat.order).padStart(2, '0') }}
                </span>
                <h3 class="text-sm font-semibold text-[var(--text-primary)] sm:text-base">
                  {{ cat.name }}
                </h3>
                <span class="hidden text-xs text-[var(--text-muted)] md:inline">
                  {{ cat.description }}
                </span>
              </div>
              <p class="mt-1 text-xs text-[var(--text-muted)] md:hidden">
                {{ cat.description }}
              </p>
            </div>

            <div class="flex shrink-0 items-center gap-3">
              <span class="font-mono text-xs tabular-nums text-[var(--text-muted)]">
                {{ categoryProgress(cat).mastered }}/{{ categoryProgress(cat).total }}
              </span>
              <ChevronDown
                v-if="isCategoryExpanded(cat.id)"
                class="h-4 w-4 text-[var(--text-muted)]"
              />
              <ChevronRight v-else class="h-4 w-4 text-[var(--text-muted)]" />
            </div>
          </button>

          <div
            v-if="isCategoryExpanded(cat.id)"
            class="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]"
          >
            <div
              v-for="sub in cat.subcategories"
              :key="sub.id"
              v-show="filterQuestions(sub.questions).length > 0"
            >
              <!-- Flat L2 Sub-Header Band -->
              <div
                class="flex items-center justify-between gap-3 bg-[var(--bg-surface-muted)] px-3 py-2 sm:px-4"
              >
                <div class="flex min-w-0 items-baseline gap-2.5">
                  <span class="font-mono text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
                    {{ String(cat.order).padStart(2, '0') }}-{{ String(sub.order).padStart(2, '0') }}
                  </span>
                  <h4 class="truncate text-xs font-semibold text-[var(--text-primary)]">
                    {{ sub.name }}
                  </h4>
                  <span class="hidden truncate text-xs text-[var(--text-muted)] lg:inline">
                    · {{ sub.description }}
                  </span>
                </div>
                <span class="shrink-0 font-mono text-[11px] tabular-nums text-[var(--text-muted)]">
                  {{ filterQuestions(sub.questions).length }} 题
                </span>
              </div>

              <!-- Flat Question Rows -->
              <ul class="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                <li v-for="q in filterQuestions(sub.questions)" :key="q.id">
                  <RouterLink
                    :to="`/${q.domain}/${q.slug}`"
                    class="group flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50 sm:px-4"
                  >
                    <div class="flex min-w-0 flex-1 items-center gap-2.5">
                      <span
                        class="h-1.5 w-1.5 shrink-0 rounded-full"
                        :class="statusDotClass(q.id)"
                      />
                      <span class="font-mono text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
                        {{ String(q.order).padStart(2, '0') }}
                      </span>
                      <span class="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text-primary)]">
                        {{ q.title }}
                      </span>
                    </div>

                    <div class="flex shrink-0 items-center gap-2.5">
                      <span
                        v-if="q.diagram"
                        class="hidden font-mono text-[11px] text-[var(--domain-accent)] sm:inline"
                      >
                        交互图解
                      </span>
                      <span
                        v-else-if="q.hasMermaid"
                        class="hidden font-mono text-[11px] text-[var(--text-muted)] sm:inline"
                      >
                        流程图
                      </span>
                      <span
                        class="rounded border px-1.5 py-0.5 font-mono text-[10px]"
                        :class="
                          q.priority === 'must-know'
                            ? 'border-[var(--border-strong)] bg-[var(--bg-surface-muted)] text-[var(--text-primary)] font-medium'
                            : 'border-[var(--border-subtle)] text-[var(--text-muted)]'
                        "
                      >
                        {{ priorityLabel(q.priority) }}
                      </span>
                      <ArrowRight
                        class="h-3.5 w-3.5 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text-primary)]"
                      />
                    </div>
                  </RouterLink>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
