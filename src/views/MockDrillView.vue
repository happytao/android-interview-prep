<script setup lang="ts">
import { ArrowRight, CheckCircle2, Eye, HelpCircle, RotateCcw, Shuffle } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import PriorityBadge from '@/components/common/PriorityBadge.vue'
import { allDomains, getDomainFlatQuestions, getDomainManifest } from '@/domains/registry'
import { useStudyStore } from '@/stores/studyStore'
import type { Priority, QuestionSummary } from '@/types/interview'

const route = useRoute()
const studyStore = useStudyStore()
const activeDomains = computed(() => allDomains.filter((d) => d.config.status === 'active'))

const selectedDomainId = ref<string>(
  (() => {
    const qDomain = typeof route.query.domain === 'string' ? route.query.domain : ''
    if (qDomain && activeDomains.value.some((d) => d.config.id === qDomain)) {
      return qDomain
    }
    return activeDomains.value[0]?.config.id ?? allDomains[0]?.config.id ?? 'android'
  })(),
)

const domainManifest = computed(() => getDomainManifest(selectedDomainId.value))
const allQuestions = computed(() => getDomainFlatQuestions(selectedDomainId.value))

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

watch(selectedDomainId, () => {
  selectedL1.value = 'all'
  drawNext()
})

if (!currentQuestion.value && allQuestions.value.length > 0) {
  drawNext()
}
</script>

<template>
  <main class="mx-auto max-w-3xl px-4 py-10 pb-20 sm:px-6 sm:py-12">
    <header class="pb-6">
      <div
        class="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-blue-soft)] px-3 py-1 font-mono text-[11px] font-semibold tracking-wider text-[var(--brand-blue-text)] uppercase"
      >
        <Shuffle class="h-3.5 w-3.5" />
        <span>mock interview drill</span>
      </div>
      <h1 class="mt-3 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
        随机抽题与限时口述自测
      </h1>
      <p class="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
        按模块与必考梯度筛选出题池，先尝试 60 秒脱稿口述，再按需看关键词提示或跳转完整图解。
      </p>
    </header>

    <!-- Filter Controls Bento Card -->
    <section class="bento-card rounded-[18px] p-5">
      <div v-if="activeDomains.length > 1" class="mb-4 flex flex-wrap items-center gap-1.5 text-xs">
        <span class="font-medium text-[var(--text-secondary)]">技术领域：</span>
        <button
          v-for="d in activeDomains"
          :key="d.config.id"
          type="button"
          class="rounded-full px-3 py-1 font-medium transition"
          :class="
            selectedDomainId === d.config.id
              ? 'bg-[var(--brand-blue)] text-white'
              : 'bg-[var(--bg-surface-muted)] text-[var(--text-secondary)]'
          "
          @click="selectedDomainId = d.config.id"
        >
          {{ d.config.name }}
        </button>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label class="block text-xs">
          <span class="font-medium text-[var(--text-secondary)]">限定知识模块</span>
          <select
            v-model="selectedL1"
            class="mt-1.5 h-9 w-full rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] px-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--brand-blue)] focus:bg-[var(--bg-surface)] focus:outline-none"
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
          <span class="font-medium text-[var(--text-secondary)]">题型梯度</span>
          <select
            v-model="selectedPriority"
            class="mt-1.5 h-9 w-full rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] px-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--brand-blue)] focus:bg-[var(--bg-surface)] focus:outline-none"
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
            class="h-9 w-full rounded-[10px] border px-3 text-xs font-medium transition"
            :class="
              onlyDueOrUnlearned
                ? 'border-transparent bg-[var(--brand-blue)] text-white shadow-[0_1px_4px_rgba(0,113,227,0.28)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            "
            @click="
              () => {
                onlyDueOrUnlearned = !onlyDueOrUnlearned
                drawNext()
              }
            "
          >
            {{ onlyDueOrUnlearned ? '仅抽未学 / 待复习' : '包含已掌握题目' }}
          </button>
        </div>
      </div>

      <div class="mt-4 flex items-center justify-between border-t border-[var(--border-subtle)] pt-3.5 text-xs text-[var(--text-muted)]">
        <span class="font-mono tabular-nums">题池 {{ pool.length }} 题</span>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 font-medium text-[var(--brand-blue)] hover:underline"
          @click="drawNext"
        >
          <RotateCcw class="h-3.5 w-3.5" />
          <span>换一题</span>
        </button>
      </div>
    </section>

    <!-- Drawn Question Bento Card -->
    <section
      v-if="currentQuestion"
      class="bento-card mt-6 rounded-[20px] p-6 sm:p-7"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="font-mono text-xs text-[var(--text-muted)]">
          {{ currentQuestion.categoryName }} / {{ currentQuestion.subcategoryName }}
        </span>
        <PriorityBadge
          :priority="currentQuestion.priority"
          :status="studyStore.getStatus(currentQuestion.id)"
        />
      </div>

      <h2 class="mt-4 text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl">
        {{ currentQuestion.title }}
      </h2>

      <div v-if="showHints" class="mt-5 border-t border-[var(--border-subtle)] pt-4">
        <div class="mb-2 flex items-center gap-1.5 font-mono text-xs font-medium text-[var(--text-muted)]">
          <Eye class="h-3.5 w-3.5 text-[var(--brand-blue)]" />
          <span>记忆线索关键词</span>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="kw in currentQuestion.keywords"
            :key="kw"
            class="rounded-full bg-[var(--brand-blue-soft)] px-2.5 py-0.5 font-mono text-xs text-[var(--brand-blue-text)]"
          >
            {{ kw }}
          </span>
        </div>
      </div>

      <div class="mt-6 flex flex-wrap items-center gap-2.5">
        <button
          v-if="!showHints"
          type="button"
          class="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)] sm:text-sm"
          @click="showHints = true"
        >
          <HelpCircle class="h-3.5 w-3.5 text-[var(--brand-blue)]" />
          <span>提示关键词</span>
        </button>

        <RouterLink
          :to="`/${currentQuestion.domain}/${currentQuestion.slug}`"
          class="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--btn-primary-bg)] px-5 text-xs font-medium text-[var(--btn-primary-fg)] shadow-[0_2px_8px_rgba(0,113,227,0.25)] transition hover:bg-[var(--btn-primary-hover)] sm:text-sm"
        >
          <span>查看完整解析与图解</span>
          <ArrowRight class="h-3.5 w-3.5" />
        </RouterLink>

        <button
          type="button"
          class="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] px-4 text-xs font-medium text-[var(--text-primary)] transition hover:border-[var(--status-mastered)]/50"
          @click="
            () => {
              if (currentQuestion) studyStore.setStatus(currentQuestion.id, 'mastered')
              drawNext()
            }
          "
        >
          <CheckCircle2 class="h-3.5 w-3.5 text-[var(--status-mastered)]" />
          <span>标记掌握并换题</span>
        </button>
      </div>
    </section>

    <div
      v-else
      class="bento-card mt-6 rounded-[20px] p-10 text-center text-sm text-[var(--text-muted)]"
    >
      当前筛选条件下没有匹配题目，请放宽上方筛选条件。
    </div>
  </main>
</template>
