<script setup lang="ts">
import {
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  PlayCircle,
  Shuffle,
  Sparkles,
} from 'lucide-vue-next'
import { computed, ref } from 'vue'
import PriorityBadge from '@/components/common/PriorityBadge.vue'
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
  const dueSet = new Set(studyStore.dueReviewIds)

  for (const q of allQuestions.value) {
    const s = studyStore.getStatus(q.id)
    if (s === 'mastered') mastered += 1
    else if (s === 'reviewing') reviewing += 1
    if (q.priority === 'must-know') mustKnow += 1
    if (dueSet.has(q.id)) due += 1
  }

  return {
    total: allQuestions.value.length,
    mastered,
    reviewing,
    mustKnow,
    due,
    percent: allQuestions.value.length ? Math.round((mastered / allQuestions.value.length) * 100) : 0,
  }
})

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

function isCategoryExpanded(id: string, index: number) {
  if (quickFilter.value !== 'all') return true
  if (expandedL1Ids.value.size === 0 && index < 2) return true
  return expandedL1Ids.value.has(id)
}
</script>

<template>
  <main class="mx-auto max-w-[1280px] px-3 py-6 pb-16 sm:px-5 sm:py-8">
    <!-- Hero Card -->
    <section
      class="relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-xs sm:p-8"
    >
      <div class="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div class="max-w-2xl">
          <div class="inline-flex items-center gap-2 rounded-full bg-[var(--domain-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--domain-accent)]">
            <Layers class="h-3.5 w-3.5" />
            <span>{{ domainManifest.config.name }} · {{ domainManifest.categories.length }} 大模块 · {{ domainStats.total }} 题</span>
          </div>
          <h1 class="mt-3 text-2xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            原理驱动的{{ domainManifest.config.name }}面试知识图谱
          </h1>
          <p class="mt-2 text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
            {{ domainManifest.config.tagline }}。每道题按「答题思路 → 原理解析 → 图解流程 → 追问与关键词 → 权威参考」编排，支持自测遮罩与复习队列。
          </p>

          <div class="mt-5 flex flex-wrap gap-2.5">
            <RouterLink
              v-if="lastVisitedQuestion"
              :to="`/${lastVisitedQuestion.domain}/${lastVisitedQuestion.slug}`"
              class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--domain-accent)] px-4 py-2 text-sm font-semibold text-[var(--domain-accent-fg)] shadow-xs transition hover:opacity-95"
            >
              <PlayCircle class="h-4 w-4" />
              <span>继续学习：{{ lastVisitedQuestion.title.slice(0, 18) }}…</span>
            </RouterLink>
            <RouterLink
              v-else-if="firstQuestion"
              :to="`/${firstQuestion.domain}/${firstQuestion.slug}`"
              class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--domain-accent)] px-4 py-2 text-sm font-semibold text-[var(--domain-accent-fg)] shadow-xs transition hover:opacity-95"
            >
              <PlayCircle class="h-4 w-4" />
              <span>从第一题开始</span>
            </RouterLink>

            <RouterLink
              to="/mock"
              class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:border-[var(--domain-accent)]"
            >
              <Shuffle class="h-4 w-4 text-[var(--domain-accent)]" />
              <span>随机模拟抽题</span>
            </RouterLink>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="grid shrink-0 grid-cols-2 gap-2.5 sm:grid-cols-4 lg:w-80 lg:grid-cols-2">
          <div class="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] p-3.5">
            <div class="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <CheckCircle2 class="h-3.5 w-3.5 text-emerald-500" />
              <span>已掌握</span>
            </div>
            <div class="mt-1 font-mono text-xl font-bold text-[var(--text-primary)]">
              {{ domainStats.mastered }} <span class="text-xs font-normal text-[var(--text-muted)]">/ {{ domainStats.total }}</span>
            </div>
            <div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-surface)]">
              <div
                class="h-full rounded-full bg-[var(--domain-accent)] transition-all duration-300"
                :style="{ width: `${domainStats.percent}%` }"
              />
            </div>
          </div>

          <div class="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] p-3.5">
            <div class="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <Clock class="h-3.5 w-3.5 text-orange-500" />
              <span>今日待复习</span>
            </div>
            <div class="mt-1 font-mono text-xl font-bold text-[var(--text-primary)]">
              {{ domainStats.due }}
            </div>
            <div class="mt-1 text-[11px] text-[var(--text-muted)]">间隔回忆队列</div>
          </div>

          <div class="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] p-3.5">
            <div class="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <Flame class="h-3.5 w-3.5 text-amber-500" />
              <span>高频必考</span>
            </div>
            <div class="mt-1 font-mono text-xl font-bold text-[var(--text-primary)]">
              {{ domainStats.mustKnow }}
            </div>
            <div class="mt-1 text-[11px] text-[var(--text-muted)]">精选核心题目</div>
          </div>

          <div class="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] p-3.5">
            <div class="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <Bookmark class="h-3.5 w-3.5 text-sky-500" />
              <span>我的收藏</span>
            </div>
            <div class="mt-1 font-mono text-xl font-bold text-[var(--text-primary)]">
              {{ studyStore.stats.bookmarks }}
            </div>
            <div class="mt-1 text-[11px] text-[var(--text-muted)]">笔记 {{ studyStore.stats.notes }} 条</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Quick Filter Bar -->
    <section class="mt-6 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <Sparkles class="h-4 w-4 text-[var(--domain-accent)]" />
        <h2 class="text-base font-bold text-[var(--text-primary)] sm:text-lg">两级分类知识地图</h2>
      </div>
      <div class="flex flex-wrap gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1 text-xs">
        <button
          v-for="tab in [
            { id: 'all', label: `全部 (${domainStats.total})` },
            { id: 'must-know', label: `高频必考 (${domainStats.mustKnow})` },
            { id: 'due', label: `今日待复习 (${domainStats.due})` },
            { id: 'bookmarked', label: `收藏 (${studyStore.stats.bookmarks})` },
          ]"
          :key="tab.id"
          type="button"
          class="min-h-8 rounded-lg px-3 py-1 font-medium transition"
          :class="
            quickFilter === tab.id
              ? 'bg-[var(--domain-accent)] text-[var(--domain-accent-fg)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          "
          @click="quickFilter = tab.id as typeof quickFilter"
        >
          {{ tab.label }}
        </button>
      </div>
    </section>

    <!-- L1 -> L2 Knowledge Tree -->
    <section class="mt-4 space-y-4">
      <div
        v-for="(cat, idx) in domainManifest.categories"
        :key="cat.id"
        v-show="categoryProgress(cat).matched > 0"
        class="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs"
      >
        <button
          type="button"
          class="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-[var(--bg-surface-muted)] sm:px-6"
          @click="toggleCategory(cat.id)"
        >
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="rounded-lg bg-[var(--domain-accent-soft)] px-2 py-0.5 font-mono text-xs font-bold text-[var(--domain-accent)]"
              >
                L1 · {{ String(cat.order).padStart(2, '0') }}
              </span>
              <h3 class="text-base font-bold text-[var(--text-primary)]">{{ cat.name }}</h3>
              <span class="text-xs text-[var(--text-muted)]">
                {{ cat.subcategories.length }} 专题 · {{ categoryProgress(cat).mastered }}/{{ categoryProgress(cat).total }} 已掌握
              </span>
            </div>
            <p class="mt-1 text-xs text-[var(--text-secondary)]">{{ cat.description }}</p>
          </div>
          <span class="shrink-0 text-xs font-medium text-[var(--domain-accent)]">
            {{ isCategoryExpanded(cat.id, idx) ? '收起' : '展开' }}
          </span>
        </button>

        <div
          v-if="isCategoryExpanded(cat.id, idx)"
          class="border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)]/45 p-4 sm:p-6"
        >
          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div
              v-for="sub in cat.subcategories"
              :key="sub.id"
              v-show="filterQuestions(sub.questions).length > 0"
              class="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
            >
              <div class="flex items-start justify-between gap-2 border-b border-[var(--border-subtle)] pb-2.5">
                <div>
                  <div class="font-mono text-[11px] font-semibold text-[var(--domain-accent)]">
                    {{ String(cat.order).padStart(2, '0') }}-{{ String(sub.order).padStart(2, '0') }}
                  </div>
                  <h4 class="text-sm font-bold text-[var(--text-primary)]">{{ sub.name }}</h4>
                  <p class="mt-0.5 text-xs text-[var(--text-muted)]">{{ sub.description }}</p>
                </div>
                <span class="shrink-0 rounded-md bg-[var(--bg-surface-muted)] px-2 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]">
                  {{ filterQuestions(sub.questions).length }} 题
                </span>
              </div>

              <ul class="mt-3 space-y-1.5">
                <li v-for="q in filterQuestions(sub.questions)" :key="q.id">
                  <RouterLink
                    :to="`/${q.domain}/${q.slug}`"
                    class="group flex items-start justify-between gap-2 rounded-xl px-2.5 py-2 transition hover:bg-[var(--bg-surface-muted)]"
                  >
                    <div class="min-w-0 flex-1">
                      <div class="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--domain-accent)]">
                        {{ q.title }}
                      </div>
                      <div class="mt-1 flex flex-wrap items-center gap-1.5">
                        <PriorityBadge compact :priority="q.priority" :status="studyStore.getStatus(q.id)" />
                        <span
                          v-if="q.diagram"
                          class="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"
                        >
                          交互SVG
                        </span>
                        <span
                          v-else-if="q.hasMermaid"
                          class="rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300"
                        >
                          流程图
                        </span>
                      </div>
                    </div>
                    <ArrowRight class="mt-1 h-4 w-4 shrink-0 text-[var(--text-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--domain-accent)]" />
                  </RouterLink>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Multi-Domain Roadmap -->
    <section class="mt-10 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-sm font-bold text-[var(--text-primary)]">多领域扩展路线图（零改核心代码接入）</h2>
          <p class="mt-0.5 text-xs text-[var(--text-secondary)]">
            一期专注打磨 Android 中级题库；后续学习前端、后端、运维、网络安全时，只需新建领域目录即可自动上线。
          </p>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <RouterLink
          v-for="d in allDomains"
          :key="d.config.id"
          :to="d.config.status === 'active' ? `/${d.config.id}` : `/${d.config.id}/planned`"
          class="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] p-3.5 transition hover:border-[var(--domain-accent)]"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-bold text-[var(--text-primary)]">{{ d.config.name }}</span>
            <span
              class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              :class="
                d.config.status === 'active'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
              "
            >
              {{ d.config.status === 'active' ? `${d.questionCount} 题` : '规划中' }}
            </span>
          </div>
          <p class="mt-1.5 line-clamp-2 text-xs text-[var(--text-secondary)]">{{ d.config.tagline }}</p>
        </RouterLink>
      </div>
    </section>
  </main>
</template>
