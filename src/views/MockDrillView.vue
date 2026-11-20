<script setup lang="ts">
import { ArrowRight, CheckCircle2, HelpCircle, RotateCcw, Shuffle, Sparkles } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import PriorityBadge from '@/components/common/PriorityBadge.vue'
import { getDomainFlatQuestions, getDomainManifest } from '@/domains/registry'
import { useStudyStore } from '@/stores/studyStore'
import type { Priority, QuestionSummary } from '@/types/interview'

const studyStore = useStudyStore()
const domainManifest = computed(() => getDomainManifest('android'))
const allQuestions = computed(() => getDomainFlatQuestions('android'))

const selectedL1 = ref<string>('all')
const selectedPriority = ref<Priority | 'all'>('all')
const onlyDueOrUnlearned = ref(false)
const showHints = ref(false)
const currentQuestion = ref<QuestionSummary | null>(null)

const pool = computed(() => {
  const dueSet = new Set(studyStore.dueReviewIds)
  return allQuestions.value.filter((q) => {
    if (selectedL1.value !== 'all' && q.category !== selectedL1.value) return false
    if (selectedPriority.value !== 'all' && q.priority !== selectedPriority.value) return false
    if (onlyDueOrUnlearned.value) {
      const status = studyStore.getStatus(q.id)
      return status === 'unlearned' || status === 'reviewing' || dueSet.has(q.id)
    }
    return true
  })
})

const drawNext = () => {
  if (pool.value.length === 0) {
    currentQuestion.value = null
    return
  }
  const candidates =
    pool.value.length > 1 && currentQuestion.value
      ? pool.value.filter((q) => q.id !== currentQuestion.value?.id)
      : pool.value
  const pick = candidates[Math.floor(Math.random() * candidates.length)]!
  currentQuestion.value = pick
  showHints.value = false
}

// Pick initial item lazily on first interaction or auto-pick
if (!currentQuestion.value && allQuestions.value.length > 0) {
  drawNext()
}
</script>

<template>
  <main class="mx-auto max-w-3xl px-4 py-8 pb-20">
    <header class="mb-6">
      <div class="inline-flex items-center gap-1.5 rounded-full bg-[var(--domain-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--domain-accent)]">
        <Shuffle class="h-3.5 w-3.5" />
        <span>模拟面试抽题演练</span>
      </div>
      <h1 class="mt-2.5 text-2xl font-extrabold text-[var(--text-primary)]">随机抽题与限时口述自测</h1>
      <p class="mt-1 text-sm text-[var(--text-secondary)]">
        按模块与必考梯度筛选出题池，先尝试 60 秒脱稿口述，再按需看关键词提示或跳转完整图解。
      </p>
    </header>

    <!-- Filter Controls -->
    <section class="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-xs sm:p-5">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label class="block text-xs">
          <span class="font-semibold text-[var(--text-secondary)]">限定知识模块</span>
          <select
            v-model="selectedL1"
            class="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]"
            @change="drawNext"
          >
            <option value="all">全部分类 ({{ allQuestions.length }} 题)</option>
            <option
              v-for="cat in domainManifest?.categories ?? []"
              :key="cat.id"
              :value="cat.slug"
            >
              {{ String(cat.order).padStart(2, '0') }} · {{ cat.name }}
            </option>
          </select>
        </label>

        <label class="block text-xs">
          <span class="font-semibold text-[var(--text-secondary)]">题型梯度</span>
          <select
            v-model="selectedPriority"
            class="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]"
            @change="drawNext"
          >
            <option value="all">不限级别</option>
            <option value="must-know">仅高频必考</option>
            <option value="core">仅核心常考</option>
            <option value="bonus">仅中级加分</option>
          </select>
        </label>

        <div class="flex items-end">
          <button
            type="button"
            class="min-h-10 w-full rounded-xl border px-3 py-2 text-xs font-semibold transition"
            :class="
              onlyDueOrUnlearned
                ? 'border-[var(--domain-accent)] bg-[var(--domain-accent-soft)] text-[var(--domain-accent)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] text-[var(--text-secondary)]'
            "
            @click="
              () => {
                onlyDueOrUnlearned = !onlyDueOrUnlearned
                drawNext()
              }
            "
          >
            {{ onlyDueOrUnlearned ? '仅抽未学 / 待复习 ✓' : '包含已掌握题目' }}
          </button>
        </div>
      </div>

      <div class="mt-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>当前题池共 {{ pool.length }} 题</span>
        <button
          type="button"
          class="inline-flex items-center gap-1 font-semibold text-[var(--domain-accent)] hover:underline"
          @click="drawNext"
        >
          <RotateCcw class="h-3.5 w-3.5" />
          <span>换一题</span>
        </button>
      </div>
    </section>

    <!-- Drawn Question Card -->
    <section
      v-if="currentQuestion"
      class="mt-6 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-xs font-medium text-[var(--text-muted)]">
          {{ currentQuestion.categoryName }} / {{ currentQuestion.subcategoryName }}
        </span>
        <PriorityBadge
          :priority="currentQuestion.priority"
          :status="studyStore.getStatus(currentQuestion.id)"
        />
      </div>

      <h2 class="mt-4 text-xl font-extrabold text-[var(--text-primary)] sm:text-2xl">
        {{ currentQuestion.title }}
      </h2>

      <div v-if="showHints" class="mt-5 rounded-2xl bg-[var(--bg-surface-muted)] p-4">
        <div class="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--domain-accent)]">
          <Sparkles class="h-3.5 w-3.5" />
          <span>关键得分线索</span>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="kw in currentQuestion.keywords"
            :key="kw"
            class="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono text-xs text-[var(--text-primary)]"
          >
            {{ kw }}
          </span>
        </div>
      </div>

      <div class="mt-6 flex flex-wrap items-center gap-2.5">
        <button
          v-if="!showHints"
          type="button"
          class="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]"
          @click="showHints = true"
        >
          <HelpCircle class="h-4 w-4 text-[var(--domain-accent)]" />
          <span>提示关键词</span>
        </button>

        <RouterLink
          :to="`/${currentQuestion.domain}/${currentQuestion.slug}`"
          class="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[var(--domain-accent)] px-4 py-2 text-sm font-semibold text-[var(--domain-accent-fg)]"
        >
          <span>查看完整解析与图解</span>
          <ArrowRight class="h-4 w-4" />
        </RouterLink>

        <button
          type="button"
          class="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
          @click="
            () => {
              if (currentQuestion) studyStore.setStatus(currentQuestion.id, 'mastered')
              drawNext()
            }
          "
        >
          <CheckCircle2 class="h-4 w-4" />
          <span>答对了 · 标记掌握并抽下一题</span>
        </button>
      </div>
    </section>

    <div
      v-else
      class="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center text-sm text-[var(--text-secondary)]"
    >
      当前筛选条件下没有匹配题目，请放宽上方筛选条件。
    </div>
  </main>
</template>
