<script setup lang="ts">
import {
  ArrowRight,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  Flag,
  Pause,
  PencilLine,
  Play,
  RotateCcw,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Zap,
} from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PriorityBadge from '@/components/common/PriorityBadge.vue'
import PersonalNotes from '@/components/question/PersonalNotes.vue'
import QuestionBody from '@/components/question/QuestionBody.vue'
import ReferenceCards from '@/components/question/ReferenceCards.vue'
import { isEditableTarget } from '@/composables/useHotkeys'
import { usePrefersReducedMotion } from '@/composables/usePrefersReducedMotion'
import { loadCompiledQuestion } from '@/domains/questionLoader'
import { allDomains, getDomainFlatQuestions, getDomainManifest } from '@/domains/registry'
import { useStudyStore } from '@/stores/studyStore'
import type { CompiledQuestion, Priority, QuestionSummary } from '@/types/interview'
import { getNextLeitnerIntervalDays, splitCompiledIntoStages } from '@/utils/questionStages'

type DrillGrade = 'forgot' | 'rough' | 'mastered'

interface SessionResultItem {
  question: QuestionSummary
  grade: DrillGrade
  nextDays?: number
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let x = Math.imul(t ^ (t >>> 15), 1 | t)
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function deterministicShuffle<T>(items: readonly T[], seed: number): T[] {
  const copy = [...items]
  const rand = mulberry32(seed)
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = copy[i]!
    copy[i] = copy[j]!
    copy[j] = tmp
  }
  return copy
}

function formatSeconds(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

const route = useRoute()
const router = useRouter()
const studyStore = useStudyStore()
const prefersReduced = usePrefersReducedMotion()

const activeDomains = computed(() => allDomains.filter((d) => d.config.status === 'active'))

function resolveValidDomain(candidate: unknown): string {
  if (typeof candidate === 'string' && activeDomains.value.some((d) => d.config.id === candidate)) {
    return candidate
  }
  return activeDomains.value[0]?.config.id ?? allDomains[0]?.config.id ?? 'android'
}

const selectedDomainId = ref<string>(resolveValidDomain(route.query.domain))
const selectedL1 = ref<string>('all')
const selectedPriority = ref<Priority | 'all'>('all')
const onlyDueOrUnlearned = ref(false)
const roundSize = ref<number>(20)
const filterOpen = ref(false)
const sessionSeed = ref(1)

const domainManifest = computed(() => getDomainManifest(selectedDomainId.value))
const allQuestions = computed(() => getDomainFlatQuestions(selectedDomainId.value))
const dueSet = computed(() => new Set(studyStore.dueReviewIds))

const filteredPool = computed(() =>
  allQuestions.value.filter((q) => {
    if (selectedL1.value !== 'all' && q.category !== selectedL1.value) return false
    if (selectedPriority.value !== 'all' && q.priority !== selectedPriority.value) return false
    if (onlyDueOrUnlearned.value) {
      const status = studyStore.getStatus(q.id)
      return status === 'unlearned' || status === 'reviewing' || dueSet.value.has(q.id)
    }
    return true
  }),
)

const dueInPoolCount = computed(
  () => filteredPool.value.filter((q) => dueSet.value.has(q.id)).length,
)

const hasActiveFilters = computed(
  () =>
    selectedL1.value !== 'all' ||
    selectedPriority.value !== 'all' ||
    onlyDueOrUnlearned.value ||
    roundSize.value !== 20,
)

// Session queue & progression state
const deck = ref<QuestionSummary[]>([])
const currentIndex = ref(0)
const revealStage = ref<0 | 1 | 2>(0)
const notesExpanded = ref(false)
const sessionResults = ref<SessionResultItem[]>([])
const sessionFinished = ref(false)
const requeuedIds = new Set<string>()

// Compiled question loading with cancellation guard
const compiled = ref<CompiledQuestion | null>(null)
const isLoading = ref(false)
const loadError = ref<string | null>(null)
let loadGen = 0

// 60s Oral Timer
const elapsedSeconds = ref(0)
const timerRunning = ref(true)
let timerInterval: ReturnType<typeof setInterval> | null = null

const currentQuestion = computed<QuestionSummary | null>(() => {
  if (sessionFinished.value) return null
  return deck.value[currentIndex.value] ?? null
})

const isCurrentDue = computed(() =>
  Boolean(currentQuestion.value && dueSet.value.has(currentQuestion.value.id)),
)

const stages = computed(() =>
  compiled.value ? splitCompiledIntoStages(compiled.value.blocks) : null,
)

const stage2And3Blocks = computed(() =>
  stages.value ? [...stages.value.stage2, ...stages.value.stage3] : [],
)

const progressPercent = computed(() => {
  if (deck.value.length === 0) return 0
  if (sessionFinished.value) return 100
  return Math.round(((currentIndex.value + 1) / deck.value.length) * 100)
})

const nextMasteredDays = computed(() => {
  if (!currentQuestion.value) return 1
  return getNextIntervalDays(currentQuestion.value.id)
})

const masteredResultsCount = computed(
  () => sessionResults.value.filter((r) => r.grade === 'mastered').length,
)

const reviewingResults = computed(() =>
  sessionResults.value.filter((r) => r.grade !== 'mastered'),
)

const masteryRate = computed(() => {
  if (sessionResults.value.length === 0) return 0
  return Math.round((masteredResultsCount.value / sessionResults.value.length) * 100)
})

function getNextIntervalDays(questionId: string): number {
  const prevCount = studyStore.getRecord(questionId)?.reviewCount ?? 0
  return getNextLeitnerIntervalDays(prevCount)
}

function buildDeck(customSource?: QuestionSummary[]) {
  const source = customSource ?? filteredPool.value
  const currentDueSet = new Set(studyStore.dueReviewIds)

  const dueItems: QuestionSummary[] = []
  const unlearnedItems: QuestionSummary[] = []
  const masteredItems: QuestionSummary[] = []

  for (const q of source) {
    if (currentDueSet.has(q.id)) {
      dueItems.push(q)
    } else if (studyStore.getStatus(q.id) === 'unlearned') {
      unlearnedItems.push(q)
    } else {
      masteredItems.push(q)
    }
  }

  const filterKey = `${selectedDomainId.value}|${selectedL1.value}|${selectedPriority.value}|${onlyDueOrUnlearned.value}|${roundSize.value}`
  const baseSeed = hashString(filterKey) + sessionSeed.value

  const ordered = [
    ...deterministicShuffle(dueItems, baseSeed),
    ...deterministicShuffle(unlearnedItems, baseSeed + 101),
    ...deterministicShuffle(masteredItems, baseSeed + 202),
  ]

  const finalDeck =
    !customSource && roundSize.value > 0 ? ordered.slice(0, roundSize.value) : ordered

  deck.value = finalDeck
  requeuedIds.clear()
  currentIndex.value = 0
  revealStage.value = 0
  notesExpanded.value = false
  sessionResults.value = []
  sessionFinished.value = false
  elapsedSeconds.value = 0
  timerRunning.value = finalDeck.length > 0
}

function resetTimer() {
  elapsedSeconds.value = 0
  timerRunning.value = true
}

function toggleTimer(e?: MouseEvent) {
  if (e && e.detail > 0) (e.currentTarget as HTMLElement | null)?.blur()
  timerRunning.value = !timerRunning.value
}

function handleResetTimer(e?: MouseEvent) {
  if (e && e.detail > 0) (e.currentTarget as HTMLElement | null)?.blur()
  resetTimer()
}

function toggleFilter(e: MouseEvent) {
  if (e.detail > 0) (e.currentTarget as HTMLElement | null)?.blur()
  filterOpen.value = !filterOpen.value
}

function loadActiveQuestion(q: QuestionSummary | null) {
  const gen = ++loadGen
  compiled.value = null
  loadError.value = null
  if (!q) {
    isLoading.value = false
    return
  }

  isLoading.value = true
  void loadCompiledQuestion(q.sourcePath)
    .then((loaded) => {
      if (gen !== loadGen) return
      compiled.value = loaded
    })
    .catch((err) => {
      if (gen !== loadGen) return
      loadError.value = err instanceof Error ? err.message : '题目内容加载失败'
    })
    .finally(() => {
      if (gen === loadGen) {
        isLoading.value = false
      }
    })
}

// Initialize first session queue before registering immediate watcher
buildDeck()

watch(currentQuestion, (q) => {
  loadActiveQuestion(q)
}, { immediate: true })

watch(
  () => route.query.domain,
  (qDomain) => {
    const resolved = resolveValidDomain(qDomain)
    if (typeof qDomain === 'string' && resolved !== selectedDomainId.value) {
      selectedDomainId.value = resolved
    }
  },
)

function selectDomain(domainId: string) {
  if (selectedDomainId.value === domainId) return
  selectedDomainId.value = domainId
  void router.replace({ query: { ...route.query, domain: domainId } })
}

watch(selectedDomainId, () => {
  selectedL1.value = 'all'
  buildDeck()
})

function gradeAndAdvance(grade: DrillGrade) {
  const q = currentQuestion.value
  if (!q || sessionFinished.value || !compiled.value) return

  let nextDays: number | undefined
  if (grade === 'mastered') {
    nextDays = getNextIntervalDays(q.id)
    studyStore.setStatus(q.id, 'mastered')
  } else if (grade === 'forgot') {
    studyStore.setStatus(q.id, 'reviewing', { resetReviewCount: true })
    if (!requeuedIds.has(q.id)) {
      requeuedIds.add(q.id)
      deck.value.push(q)
    }
  } else {
    studyStore.setStatus(q.id, 'reviewing')
  }

  const existingIdx = sessionResults.value.findIndex((r) => r.question.id === q.id)
  if (existingIdx !== -1) {
    sessionResults.value[existingIdx] = { question: q, grade, nextDays }
  } else {
    sessionResults.value.push({ question: q, grade, nextDays })
  }
  revealStage.value = 0
  notesExpanded.value = false
  elapsedSeconds.value = 0

  if (currentIndex.value + 1 < deck.value.length) {
    currentIndex.value += 1
    timerRunning.value = true
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: prefersReduced.value ? 'auto' : 'smooth' })
    }
  } else {
    sessionFinished.value = true
    timerRunning.value = false
  }
}

function finishRoundEarly() {
  if (deck.value.length === 0) return
  sessionFinished.value = true
  timerRunning.value = false
}

function startAnotherRound() {
  sessionSeed.value += 1
  buildDeck()
}

function drillReviewingSubset() {
  const subset = reviewingResults.value.map((r) => r.question)
  if (subset.length === 0) return
  sessionSeed.value += 1
  buildDeck(subset)
}

function clearFilters() {
  selectedL1.value = 'all'
  selectedPriority.value = 'all'
  onlyDueOrUnlearned.value = false
  roundSize.value = 20
  buildDeck()
}

const onKeydown = (e: KeyboardEvent) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return
  if (isEditableTarget(e.target)) return
  if (typeof document !== 'undefined' && document.querySelector('[aria-modal="true"]')) {
    return
  }
  if (sessionFinished.value || !currentQuestion.value) return

  if (e.code === 'Space' || e.key === ' ') {
    // Allow native Space activation on focused interactive controls
    if ((e.target as HTMLElement | null)?.closest('button, a, [role="button"], summary, [tabindex]')) {
      return
    }
    if (revealStage.value < 2 && compiled.value) {
      e.preventDefault()
      if (e.repeat) return
      revealStage.value = (revealStage.value + 1) as 1 | 2
    }
    return
  }

  if (e.repeat || revealStage.value < 1 || !compiled.value) return
  if (e.key === '1') {
    e.preventDefault()
    gradeAndAdvance('forgot')
  } else if (e.key === '2') {
    e.preventDefault()
    gradeAndAdvance('rough')
  } else if (e.key === '3') {
    e.preventDefault()
    gradeAndAdvance('mastered')
  }
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.title = '沉浸演练 · 技术面试复习站'
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeydown)
    timerInterval = setInterval(() => {
      if (timerRunning.value && !sessionFinished.value && currentQuestion.value && !isLoading.value) {
        elapsedSeconds.value += 1
      }
    }, 1000)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeydown)
  }
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
})
</script>

<template>
  <div class="flex min-h-[calc(100vh-3.5rem)] flex-col">
    <!-- Top Slim Opaque Telemetry Bar (Sticky under AppHeader — zero text bleed-through) -->
    <div class="sticky top-14 z-20 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div class="mx-auto flex h-12 max-w-4xl items-center justify-between gap-2 px-4 sm:px-6">
        <!-- Left: Session Progress -->
        <div class="flex min-w-0 items-center gap-2 text-xs">
          <span class="inline-flex min-w-0 items-center gap-1.5 font-medium text-[var(--text-primary)] tabular-nums">
            <Zap class="h-3.5 w-3.5 shrink-0 text-[var(--brand-blue)]" />
            <span class="truncate">
              <template v-if="deck.length === 0">题池 0 题</template>
              <template v-else-if="sessionFinished">本轮已结束</template>
              <template v-else>第 {{ currentIndex + 1 }} / {{ deck.length }} 题</template>
            </span>
          </span>
          <span
            v-if="!sessionFinished && dueInPoolCount > 0"
            class="hidden text-xs text-[var(--text-muted)] sm:inline"
          >
            · 待复习 {{ dueInPoolCount }} 优先
          </span>
        </div>

        <!-- Right: 60s Oral Timer + Filter + End Round -->
        <div class="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div
            v-if="currentQuestion && !sessionFinished"
            class="inline-flex h-8 items-center gap-1 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] px-2.5 text-xs"
          >
            <Clock
              class="h-3.5 w-3.5 shrink-0"
              :class="elapsedSeconds > 60 ? 'text-[var(--status-reviewing)]' : 'text-[var(--brand-blue)]'"
            />
            <span
              class="font-mono text-xs font-medium tabular-nums"
              :class="[
                elapsedSeconds > 60
                  ? 'text-[var(--status-reviewing)]'
                  : 'text-[var(--text-primary)]',
                !prefersReduced && elapsedSeconds > 60 ? 'animate-pulse' : '',
              ]"
            >
              {{ formatSeconds(elapsedSeconds) }}<span class="hidden sm:inline"> / 01:00</span>
            </span>
            <button
              type="button"
              class="inline-flex h-5 w-5 items-center justify-center rounded text-[var(--text-muted)] transition hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
              :title="timerRunning ? '暂停口述计时' : '继续口述计时'"
              :aria-label="timerRunning ? '暂停口述计时' : '继续口述计时'"
              @click="toggleTimer($event)"
            >
              <Pause v-if="timerRunning" class="h-3 w-3" />
              <Play v-else class="h-3 w-3" />
            </button>
            <button
              type="button"
              class="inline-flex h-5 w-5 items-center justify-center rounded text-[var(--text-muted)] transition hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
              title="重置计时"
              aria-label="重置计时"
              @click="handleResetTimer($event)"
            >
              <RotateCcw class="h-3 w-3" />
            </button>
          </div>

          <button
            type="button"
            class="inline-flex h-8 items-center gap-1.5 rounded-[10px] border px-2.5 text-xs font-medium transition"
            :class="
              filterOpen || hasActiveFilters
                ? 'border-transparent bg-[var(--brand-blue-soft)] text-[var(--brand-blue-text)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
            "
            :aria-expanded="filterOpen"
            @click="toggleFilter($event)"
          >
            <SlidersHorizontal class="h-3.5 w-3.5" />
            <span>筛选</span>
            <span
              v-if="hasActiveFilters"
              class="h-1.5 w-1.5 rounded-full bg-[var(--brand-blue)]"
            />
          </button>

          <button
            v-if="deck.length > 0 && !sessionFinished"
            type="button"
            class="inline-flex h-8 items-center gap-1 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            @click="finishRoundEarly"
          >
            <Flag class="h-3.5 w-3.5" />
            <span class="hidden sm:inline">结束本轮</span>
            <span class="sm:hidden">结束</span>
          </button>
        </div>
      </div>

      <!-- Thin 2px Tech-Blue Linear Progress Bar -->
      <div class="h-[2px] w-full bg-[var(--bg-surface-muted)]">
        <div
          class="h-full bg-[var(--brand-blue)] transition-[width] duration-200"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>
    </div>

    <!-- Collapsible In-Place Filter Bar -->
    <section
      v-if="filterOpen"
      class="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-muted)]/75"
      aria-label="演练队列筛选"
    >
      <div class="mx-auto max-w-4xl space-y-3 px-4 py-4 sm:px-6">
        <div v-if="activeDomains.length > 1" class="flex flex-wrap items-center gap-1.5 text-xs">
          <span class="font-medium text-[var(--text-secondary)]">技术领域：</span>
          <button
            v-for="d in activeDomains"
            :key="d.config.id"
            type="button"
            class="rounded-full px-3 py-1 font-medium transition"
            :class="
              selectedDomainId === d.config.id
                ? 'bg-[var(--brand-blue)] text-white'
                : 'border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]'
            "
            @click="selectDomain(d.config.id)"
          >
            {{ d.config.name }}
          </button>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label class="block text-xs">
            <span class="font-medium text-[var(--text-secondary)]">限定知识模块</span>
            <select
              v-model="selectedL1"
              class="mt-1.5 h-9 w-full rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-xs text-[var(--text-primary)] focus:border-[var(--brand-blue)] focus:outline-none sm:text-sm"
              @change="buildDeck()"
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
              class="mt-1.5 h-9 w-full rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-xs text-[var(--text-primary)] focus:border-[var(--brand-blue)] focus:outline-none sm:text-sm"
              @change="buildDeck()"
            >
              <option value="all">不限级别</option>
              <option value="must-know">仅高频必考</option>
              <option value="core">仅核心常考</option>
              <option value="bonus">仅中级加分</option>
            </select>
          </label>

          <div class="flex flex-col justify-end">
            <button
              type="button"
              class="h-9 w-full rounded-[10px] border px-3 text-xs font-medium transition"
              :class="
                onlyDueOrUnlearned
                  ? 'border-transparent bg-[var(--brand-blue)] text-white shadow-[0_1px_4px_rgba(0,113,227,0.28)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
              "
              @click="
                () => {
                  onlyDueOrUnlearned = !onlyDueOrUnlearned
                  buildDeck()
                }
              "
            >
              {{ onlyDueOrUnlearned ? '仅抽未学 / 待复习' : '包含已掌握题目' }}
            </button>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3 text-xs">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-[var(--text-muted)]">每轮题数</span>
            <div class="inline-flex rounded-[9px] bg-[var(--bg-segmented)] p-0.5">
              <button
                v-for="opt in [
                  { value: 10, label: '10 题' },
                  { value: 20, label: '20 题' },
                  { value: 0, label: '全部' },
                ]"
                :key="opt.value"
                type="button"
                class="rounded-[7px] px-2.5 py-0.5 text-xs font-medium tabular-nums transition"
                :class="
                  roundSize === opt.value
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-pill)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                "
                @click="
                  () => {
                    roundSize = opt.value
                    buildDeck()
                  }
                "
              >
                {{ opt.label }}
              </button>
            </div>
            <span class="text-xs tabular-nums text-[var(--text-muted)]">
              题池 {{ filteredPool.length }} 题
            </span>
          </div>

          <button
            type="button"
            class="inline-flex items-center gap-1.5 font-medium text-[var(--brand-blue)] hover:underline"
            @click="startAnotherRound"
          >
            <Shuffle class="h-3.5 w-3.5" />
            <span>重新洗牌开始</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Main Centered Drill Stage -->
    <main class="mx-auto w-full max-w-4xl flex-1 px-4 pt-6 pb-28 sm:px-6 sm:pt-8">
      <!-- Empty Pool -->
      <section
        v-if="deck.length === 0"
        class="bento-card rounded-[20px] p-12 text-center"
      >
        <p class="text-sm font-medium text-[var(--text-primary)]">
          当前筛选条件下暂无待演练题目
        </p>
        <p class="mt-1.5 text-xs text-[var(--text-muted)]">
          可放宽模块/梯度筛选，或关闭「仅抽未学 / 待复习」以巩固已掌握题目。
        </p>
        <button
          type="button"
          class="mt-5 inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--btn-primary-bg)] px-5 text-xs font-medium text-[var(--btn-primary-fg)] transition hover:bg-[var(--btn-primary-hover)]"
          @click="clearFilters"
        >
          重置筛选条件
        </button>
      </section>

      <!-- Session Complete Summary View -->
      <section
        v-else-if="sessionFinished"
        class="bento-card space-y-8 rounded-[20px] px-6 py-7 sm:px-9 sm:py-8"
        aria-label="本轮演练复盘"
      >
        <header class="border-b border-[var(--border-subtle)] pb-6">
          <div class="inline-flex items-center gap-2 rounded-full bg-[var(--brand-blue-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-blue-text)]">
            本轮演练复盘 · {{ domainManifest?.config.name ?? selectedDomainId }}
          </div>
          <h1 class="mt-3 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            本轮演练成绩单
          </h1>
          <p class="mt-1.5 text-sm text-[var(--text-secondary)]">
            本轮共评测 {{ sessionResults.length }} / {{ deck.length }} 题，间隔复习日程已同步至本地学习档案。
          </p>
        </header>

        <!-- Summary Counts Grid -->
        <div
          class="grid grid-cols-3 divide-x divide-[var(--border-subtle)] rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)]/60"
        >
          <div class="px-4 py-4">
            <div class="text-xs text-[var(--text-muted)]">已掌握</div>
            <div class="mt-1 font-mono text-2xl font-bold text-[var(--status-mastered)] tabular-nums">
              {{ masteredResultsCount }}
              <span class="font-sans text-xs font-normal text-[var(--text-muted)]">题</span>
            </div>
          </div>
          <div class="px-4 py-4">
            <div class="text-xs text-[var(--text-muted)]">加入待复习</div>
            <div class="mt-1 font-mono text-2xl font-bold text-[var(--status-reviewing)] tabular-nums">
              {{ reviewingResults.length }}
              <span class="font-sans text-xs font-normal text-[var(--text-muted)]">题</span>
            </div>
          </div>
          <div class="px-4 py-4">
            <div class="text-xs text-[var(--text-muted)]">脱稿命中率</div>
            <div class="mt-1 font-mono text-2xl font-bold text-[var(--brand-blue)] tabular-nums">
              {{ masteryRate }}<span class="text-sm font-normal text-[var(--text-muted)]">%</span>
            </div>
          </div>
        </div>

        <!-- Reviewing Questions List -->
        <div v-if="reviewingResults.length > 0" class="space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-[var(--text-primary)]">
              加入待复习清单（{{ reviewingResults.length }} 题）
            </h2>
            <span class="text-xs text-[var(--text-muted)]">点击题目可直达完整精读页</span>
          </div>

          <ul class="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
            <li v-for="item in reviewingResults" :key="item.question.id">
              <RouterLink
                :to="`/${item.question.domain}/${item.question.slug}`"
                class="group flex items-center justify-between gap-3 py-3 transition-colors hover:bg-[var(--bg-hover)] sm:px-3"
              >
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span>{{ item.question.categoryName }} / {{ item.question.subcategoryName }}</span>
                    <span
                      class="rounded-full bg-[var(--bg-surface-muted)] px-2 py-0.5 text-xs font-medium"
                      :class="
                        item.grade === 'forgot'
                          ? 'text-[var(--status-reviewing)]'
                          : 'text-[var(--text-secondary)]'
                      "
                    >
                      {{ item.grade === 'forgot' ? '卡壳忘光' : '基本答出' }}
                    </span>
                  </div>
                  <div class="mt-1 text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--brand-blue)]">
                    {{ item.question.title }}
                  </div>
                </div>
                <span class="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[var(--text-muted)] group-hover:text-[var(--brand-blue)]">
                  <span>精读</span>
                  <ArrowRight class="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </RouterLink>
            </li>
          </ul>
        </div>

        <div
          v-else-if="sessionResults.length > 0"
          class="rounded-[14px] bg-[var(--bg-surface-muted)]/60 p-6 text-center text-sm text-[var(--text-secondary)]"
        >
          本轮已答题目全部脱稿秒答，继续保持！
        </div>

        <!-- Round Summary Actions -->
        <div class="flex flex-wrap items-center gap-2.5 pt-2">
          <button
            type="button"
            class="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--btn-primary-bg)] px-5 text-xs font-medium text-[var(--btn-primary-fg)] shadow-[0_2px_8px_rgba(0,113,227,0.25)] transition hover:bg-[var(--btn-primary-hover)] sm:text-sm"
            @click="startAnotherRound"
          >
            <RotateCcw class="h-3.5 w-3.5" />
            <span>再来一轮</span>
          </button>

          <button
            v-if="reviewingResults.length > 0"
            type="button"
            class="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] px-5 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)] sm:text-sm"
            @click="drillReviewingSubset"
          >
            <Zap class="h-3.5 w-3.5 text-[var(--brand-blue)]" />
            <span>只练本轮待复习 ({{ reviewingResults.length }})</span>
          </button>

          <RouterLink
            :to="`/${selectedDomainId}`"
            class="inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] sm:text-sm"
          >
            <span>返回知识精读</span>
          </RouterLink>
        </div>
      </section>

      <!-- Active Drill Floating White Reading Paper + Progressive 3-Stage Reveal -->
      <Transition
        v-else-if="currentQuestion"
        :name="prefersReduced ? undefined : 'drill-card'"
        :css="!prefersReduced"
        mode="out-in"
      >
        <article
          :key="`${currentQuestion.id}-${currentIndex}`"
          class="bento-card space-y-6 rounded-[20px] px-5 py-6 sm:px-9 sm:py-8 lg:px-10 lg:py-9"
        >
          <!-- Question Editorial Header -->
          <header class="border-b border-[var(--border-subtle)] pb-5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="text-xs text-[var(--text-muted)]">
                {{ currentQuestion.categoryName }} / {{ currentQuestion.subcategoryName }}
              </span>

              <div class="flex flex-wrap items-center gap-2">
                <span
                  v-if="isCurrentDue"
                  class="inline-flex items-center rounded-full bg-amber-500/12 px-2.5 py-0.5 text-xs font-medium text-[var(--status-reviewing)]"
                >
                  到期复习
                </span>
                <PriorityBadge
                  compact
                  :priority="currentQuestion.priority"
                  :status="studyStore.getStatus(currentQuestion.id)"
                />
                <button
                  type="button"
                  class="inline-flex h-8 items-center gap-1 rounded-[10px] border px-2.5 text-xs transition"
                  :class="
                    studyStore.isBookmarked(currentQuestion.id)
                      ? 'border-transparent bg-[var(--brand-blue-soft)] text-[var(--brand-blue-text)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                  "
                  :title="studyStore.isBookmarked(currentQuestion.id) ? '取消收藏' : '收藏本题'"
                  @click="studyStore.toggleBookmark(currentQuestion.id)"
                >
                  <Bookmark
                    class="h-3.5 w-3.5"
                    :class="studyStore.isBookmarked(currentQuestion.id) ? 'fill-current' : ''"
                  />
                  <span class="hidden sm:inline">{{ studyStore.isBookmarked(currentQuestion.id) ? '已收藏' : '收藏' }}</span>
                </button>
                <RouterLink
                  :to="`/${currentQuestion.domain}/${currentQuestion.slug}`"
                  class="inline-flex h-8 items-center gap-1 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-xs text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--brand-blue)]"
                  title="打开精读全文页"
                >
                  <span>精读</span>
                  <ExternalLink class="h-3.5 w-3.5" />
                </RouterLink>
              </div>
            </div>

            <h1 class="mt-4 text-2xl leading-snug font-bold tracking-tight text-[var(--text-primary)] sm:text-[28px]">
              {{ currentQuestion.title }}
            </h1>
          </header>

          <!-- Async Loading Skeleton -->
          <div v-if="isLoading" class="space-y-3 py-4">
            <div class="h-5 w-1/3 animate-pulse rounded-[8px] bg-[var(--bg-surface-muted)]" />
            <div class="h-4 w-full animate-pulse rounded-[8px] bg-[var(--bg-surface-muted)]" />
            <div class="h-4 w-5/6 animate-pulse rounded-[8px] bg-[var(--bg-surface-muted)]" />
            <div class="h-28 w-full animate-pulse rounded-[14px] bg-[var(--bg-surface-muted)]" />
          </div>

          <!-- Load Error -->
          <div
            v-else-if="loadError"
            class="rounded-[14px] border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300"
          >
            <p>{{ loadError }}</p>
            <button
              type="button"
              class="mt-3 inline-flex h-8 items-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 text-xs font-medium text-[var(--text-primary)]"
              @click="loadActiveQuestion(currentQuestion)"
            >
              重新加载
            </button>
          </div>

          <!-- Progressive 3-Stage Reveal Content -->
          <template v-else-if="compiled && stages">
            <!-- Stage 0: Calm Whitespace Oral Think Prompt -->
            <section
              v-if="revealStage === 0"
              class="rounded-[16px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface-muted)]/60 px-5 py-10 text-center sm:px-8 sm:py-12"
            >
              <div class="mx-auto max-w-md space-y-4">
                <p class="text-sm leading-relaxed text-[var(--text-secondary)]">
                  先尝试 60 秒脱稿口述「结论 → 底层链路 → 追问边界」，按
                  <kbd class="mx-0.5 rounded-[6px] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2 py-0.5 font-mono text-xs text-[var(--text-primary)]">Space</kbd>
                  揭示关键词与答题骨架
                </p>

                <div class="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                  <button
                    type="button"
                    class="inline-flex h-10 items-center gap-1.5 rounded-full bg-[var(--btn-primary-bg)] px-5 text-xs font-medium text-[var(--btn-primary-fg)] shadow-[0_2px_8px_rgba(0,113,227,0.25)] transition hover:bg-[var(--btn-primary-hover)] sm:text-sm"
                    @click="revealStage = 1"
                  >
                    <Sparkles class="h-3.5 w-3.5" />
                    <span>揭示关键词与答题思路</span>
                  </button>

                  <button
                    type="button"
                    class="inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)] sm:text-sm"
                    @click="revealStage = 2"
                  >
                    <Eye class="h-3.5 w-3.5 text-[var(--brand-blue)]" />
                    <span>直接展开全文</span>
                  </button>
                </div>
              </div>
            </section>

            <!-- Stage 1 & Stage 2 Progressive Body -->
            <template v-else>
              <!-- Stage 1: Keywords + 面试答题思路 -->
              <section class="space-y-4">
                <div class="flex items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
                  <span class="font-medium text-[var(--brand-blue)]">阶段 1 · 破题关键词与口述骨架</span>
                  <span v-if="revealStage === 1">按 [Space] 展开完整原理与图解</span>
                </div>

                <div v-if="currentQuestion.keywords.length > 0" class="flex flex-wrap gap-1.5">
                  <span
                    v-for="kw in currentQuestion.keywords"
                    :key="kw"
                    class="rounded-full bg-[var(--bg-surface-muted)] px-2.5 py-0.5 text-xs text-[var(--text-secondary)]"
                  >
                    {{ kw }}
                  </span>
                </div>

                <QuestionBody
                  v-if="stages.stage1.length > 0"
                  :key="`${compiled.id}-s1`"
                  :blocks="stages.stage1"
                  :title="currentQuestion.title"
                  class="[&>div:first-child>h2:first-child]:!mt-1"
                />
                <p
                  v-else
                  class="border-y border-[var(--border-subtle)] py-4 text-sm text-[var(--text-muted)]"
                >
                  本题未配置独立「面试答题思路」章节，请核对上方关键词并展开完整解析。
                </p>

                <!-- Gate to Stage 2 -->
                <div
                  v-if="revealStage === 1"
                  class="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-5"
                >
                  <span class="text-xs text-[var(--text-secondary)]">
                    核对完口述思路？按 [Space] 继续查看底层原理、图解与高频追问
                  </span>
                  <button
                    type="button"
                    class="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--btn-primary-bg)] px-5 text-xs font-medium text-[var(--btn-primary-fg)] shadow-[0_2px_8px_rgba(0,113,227,0.25)] transition hover:bg-[var(--btn-primary-hover)] sm:text-sm"
                    @click="revealStage = 2"
                  >
                    <Eye class="h-3.5 w-3.5" />
                    <span>展开完整原理与图解 (Space)</span>
                  </button>
                </div>
              </section>

              <!-- Stage 2: 核心原理解析 + 图解流程 + 高频追问 + 参考 + 笔记 -->
              <section
                v-if="revealStage >= 2"
                class="space-y-6 border-t border-[var(--border-subtle)] pt-6"
              >
                <div class="text-xs font-medium text-[var(--brand-blue)]">
                  阶段 2 · 底层原理解析、图解流程与追问边界
                </div>

                <QuestionBody
                  v-if="stage2And3Blocks.length > 0"
                  :key="`${compiled.id}-s23`"
                  :blocks="stage2And3Blocks"
                  :title="currentQuestion.title"
                  class="[&>div:first-child>h2:first-child]:!mt-1"
                />

                <ReferenceCards
                  v-if="compiled.references.length > 0"
                  :references="compiled.references"
                />

                <!-- Collapsible Personal Notes -->
                <div class="border-t border-[var(--border-subtle)] pt-4">
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                    :aria-expanded="notesExpanded"
                    @click="notesExpanded = !notesExpanded"
                  >
                    <ChevronDown v-if="notesExpanded" class="h-3.5 w-3.5" />
                    <ChevronRight v-else class="h-3.5 w-3.5" />
                    <PencilLine class="h-3.5 w-3.5 text-[var(--brand-blue)]" />
                    <span>个人手记</span>
                    <span
                      v-if="studyStore.getNote(currentQuestion.id).trim().length > 0"
                      class="rounded-full bg-[var(--brand-blue-soft)] px-2 py-0.5 text-xs font-medium text-[var(--brand-blue-text)]"
                    >
                      已有记录
                    </span>
                  </button>

                  <div v-if="notesExpanded">
                    <PersonalNotes :question-id="currentQuestion.id" />
                  </div>
                </div>
              </section>
            </template>
          </template>
        </article>
      </Transition>
    </main>

    <!-- Sticky Opaque Bottom Grading Dock (Zero bleed-through) -->
    <footer
      v-if="currentQuestion && !sessionFinished"
      class="sticky bottom-0 z-20 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[0_-4px_16px_rgba(0,0,0,0.04)]"
      style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom));"
    >
      <div class="mx-auto max-w-4xl px-4 pt-2.5 sm:px-6">
        <div class="mb-2 hidden items-center justify-between text-xs text-[var(--text-muted)] sm:flex">
          <span>口述完成直接打分，自动无缝切入下一题</span>
          <span v-if="revealStage === 0">快捷键：先按 [Space] 揭晓思路后可用 [1] [2] [3] 快速评级</span>
          <span v-else>快捷键：[Space] 展开完整解析 · [1] [2] [3] 快速评级</span>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <button
            type="button"
            :disabled="!compiled"
            class="flex min-h-11 flex-col items-center justify-center rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)]/60 px-2 py-1.5 text-center transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)] disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:min-h-0 sm:flex-row sm:gap-1.5 sm:px-3"
            @click="gradeAndAdvance('forgot')"
          >
            <kbd
              class="hidden rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)] sm:inline"
            >
              1
            </kbd>
            <span class="text-xs font-medium text-[var(--text-primary)] sm:hidden">1. 卡壳忘光</span>
            <span class="text-xs text-[var(--status-reviewing)] sm:hidden">今日重测</span>
            <span class="hidden text-xs font-medium text-[var(--text-primary)] sm:inline">
              卡壳忘光 · 今日重测
            </span>
          </button>

          <button
            type="button"
            :disabled="!compiled"
            class="flex min-h-11 flex-col items-center justify-center rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)]/60 px-2 py-1.5 text-center transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)] disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:min-h-0 sm:flex-row sm:gap-1.5 sm:px-3"
            @click="gradeAndAdvance('rough')"
          >
            <kbd
              class="hidden rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)] sm:inline"
            >
              2
            </kbd>
            <span class="text-xs font-medium text-[var(--text-primary)] sm:hidden">2. 基本答出</span>
            <span class="text-xs text-[var(--text-muted)] sm:hidden">巩固复习</span>
            <span class="hidden text-xs font-medium text-[var(--text-primary)] sm:inline">
              基本答出 · 巩固复习
            </span>
          </button>

          <button
            type="button"
            :disabled="!compiled"
            class="flex min-h-11 flex-col items-center justify-center rounded-[12px] bg-[var(--btn-primary-bg)] px-2 py-1.5 text-center text-[var(--btn-primary-fg)] shadow-[0_2px_8px_rgba(0,113,227,0.25)] transition hover:bg-[var(--btn-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:min-h-0 sm:flex-row sm:gap-1.5 sm:px-3"
            @click="gradeAndAdvance('mastered')"
          >
            <kbd
              class="hidden rounded border border-white/30 px-1.5 py-0.5 font-mono text-[10px] text-white/90 sm:inline"
            >
              3
            </kbd>
            <CheckCircle2 class="hidden h-3.5 w-3.5 shrink-0 sm:inline" />
            <span class="text-xs font-medium sm:hidden">3. 脱稿秒答</span>
            <span class="text-xs opacity-90 sm:hidden">已掌握 +{{ nextMasteredDays }}d</span>
            <span class="hidden text-xs font-medium sm:inline">
              脱稿秒答 · 已掌握 (+{{ nextMasteredDays }}d)
            </span>
          </button>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.drill-card-enter-active,
.drill-card-leave-active {
  transition:
    opacity 150ms ease,
    transform 150ms ease;
}

.drill-card-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.drill-card-leave-to {
  opacity: 0;
  transform: translate(-10px, -6px);
}
</style>
