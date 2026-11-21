<script setup lang="ts">
import { ArrowDown, CheckCircle2, Eye, EyeOff, HelpCircle, Sparkles } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import QuestionBody from '@/components/question/QuestionBody.vue'
import ReferenceCards from '@/components/question/ReferenceCards.vue'
import { useStudyStore } from '@/stores/studyStore'
import type { QuestionBlock, ReferenceItem } from '@/types/interview'
import { getNextLeitnerIntervalDays, splitCompiledIntoStages } from '@/utils/questionStages'

const props = defineProps<{
  questionId: string
  keywords: string[]
  blocks?: QuestionBlock[]
  references?: ReferenceItem[]
  title?: string
}>()

const studyStore = useStudyStore()
const hintsShown = ref(false)
const halfRevealed = ref(false)

watch(
  () => props.questionId,
  () => {
    hintsShown.value = false
    halfRevealed.value = false
  },
)

watch(
  () => studyStore.state.selfTestMode,
  (enabled) => {
    if (!enabled) {
      hintsShown.value = false
      halfRevealed.value = false
    }
  },
)

const stages = computed(() => (props.blocks ? splitCompiledIntoStages(props.blocks) : null))

const revealStage = computed<0 | 1 | 2>(() => {
  if (!studyStore.state.selfTestMode || studyStore.isRevealed(props.questionId)) {
    return 2
  }
  return halfRevealed.value ? 1 : 0
})

const nextMasteredDays = computed(() =>
  getNextLeitnerIntervalDays(studyStore.getRecord(props.questionId)?.reviewCount ?? 0),
)

const revealStage1 = () => {
  halfRevealed.value = true
}

const revealAnswer = () => {
  studyStore.setRevealed(props.questionId, true)
}

const collapseAnswer = () => {
  studyStore.setRevealed(props.questionId, false)
  halfRevealed.value = false
  hintsShown.value = false
}

const grade = (status: 'mastered' | 'reviewing') => {
  studyStore.setStatus(props.questionId, status)
}
</script>

<template>
  <div>
    <!-- Stage 0: Collapsed Self-Test Gate (v-if prevents hidden DOM Mermaid getBBox=0 & Ctrl+F leakage) -->
    <section
      v-if="revealStage === 0"
      class="my-6 rounded-[16px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface-muted)]/70 p-5 sm:p-6"
    >
      <div class="flex items-start gap-3.5">
        <span
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--brand-blue-soft)] text-[var(--brand-blue)]"
        >
          <EyeOff class="h-4 w-4" />
        </span>
        <div>
          <h2 class="text-sm font-semibold text-[var(--text-primary)] sm:text-base">
            面试自测模式 · 先尝试口述作答
          </h2>
          <p class="mt-1 text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
            试着用 30–60 秒组织「核心结论 → 底层机制链路 → 常见追问」。卡壳时可先看关键词提示，或半展开核对答题骨架。
          </p>
        </div>
      </div>

      <div
        v-if="hintsShown && keywords.length > 0"
        class="mt-4 rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5"
      >
        <div class="mb-2 text-xs font-medium text-[var(--text-muted)]">
          记忆线索关键词
        </div>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="kw in keywords"
            :key="kw"
            class="rounded-full bg-[var(--brand-blue-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--brand-blue-text)]"
          >
            {{ kw }}
          </span>
        </div>
      </div>

      <div class="mt-5 flex flex-wrap gap-2.5">
        <button
          type="button"
          class="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)] sm:text-sm"
          @click="hintsShown = !hintsShown"
        >
          <HelpCircle class="h-3.5 w-3.5 text-[var(--brand-blue)]" />
          <span>{{ hintsShown ? '隐藏关键词提示' : '显示关键词提示' }}</span>
        </button>

        <button
          type="button"
          class="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--btn-primary-bg)] px-5 text-xs font-medium text-[var(--btn-primary-fg)] shadow-[0_2px_8px_rgba(0,113,227,0.25)] transition hover:bg-[var(--btn-primary-hover)] sm:text-sm"
          @click="revealStage1"
        >
          <Sparkles class="h-3.5 w-3.5" />
          <span>1. 先核对关键词与答题思路</span>
        </button>

        <button
          type="button"
          class="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] sm:text-sm"
          @click="revealAnswer"
        >
          <Eye class="h-3.5 w-3.5" />
          <span>直接展开全文</span>
        </button>
      </div>
    </section>

    <!-- Stage 1: Half-Revealed (Keywords + Stage 1 面试答题思路; Stage 2 SVG/Mermaid still unmounted) -->
    <template v-else-if="revealStage === 1">
      <div
        class="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-[var(--callout-bg)] px-4 py-2.5 text-xs"
      >
        <span class="text-[var(--text-secondary)]">
          阶段 1 / 2 · 已核对关键词与答题骨架，尝试补全底层原理后继续展开
        </span>
        <button
          type="button"
          class="inline-flex items-center gap-1 font-medium text-[var(--brand-blue)] hover:underline"
          @click="collapseAnswer"
        >
          <EyeOff class="h-3.5 w-3.5" />
          <span>重新遮罩收起</span>
        </button>
      </div>

      <div v-if="keywords.length > 0" class="mb-5 flex flex-wrap items-center gap-1.5">
        <span
          v-for="kw in keywords"
          :key="kw"
          class="rounded-full bg-[var(--bg-surface-muted)] px-2.5 py-0.5 text-xs text-[var(--text-secondary)]"
        >
          {{ kw }}
        </span>
      </div>

      <QuestionBody
        v-if="stages && stages.stage1.length > 0"
        :key="`${questionId}-stage1`"
        :blocks="stages.stage1"
        :title="title ?? ''"
        class="[&>div:first-child>h2:first-child]:!mt-1"
      />
      <p
        v-else
        class="border-y border-[var(--border-subtle)] py-4 text-sm text-[var(--text-muted)]"
      >
        本题暂无单独「面试答题思路」章节，请对照上方关键词直接展开完整解析。
      </p>

      <div class="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-5">
        <span class="text-xs text-[var(--text-secondary)]">
          已完成口述结构核对？展开底层原理、交互图解与高频追问
        </span>
        <button
          type="button"
          class="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--btn-primary-bg)] px-5 text-xs font-medium text-[var(--btn-primary-fg)] shadow-[0_2px_8px_rgba(0,113,227,0.25)] transition hover:bg-[var(--btn-primary-hover)] sm:text-sm"
          @click="revealAnswer"
        >
          <ArrowDown class="h-3.5 w-3.5" />
          <span>继续展开完整原理与图解</span>
        </button>
      </div>
    </template>

    <!-- Stage 2: Fully Revealed Content -->
    <template v-else>
      <div
        v-if="studyStore.state.selfTestMode"
        class="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-[var(--callout-bg)] px-4 py-2.5 text-xs"
      >
        <span class="text-[var(--text-secondary)]">自测解析已展开，对照后记得自评打标</span>
        <button
          type="button"
          class="inline-flex items-center gap-1 font-medium text-[var(--brand-blue)] hover:underline"
          @click="collapseAnswer"
        >
          <EyeOff class="h-3.5 w-3.5" />
          <span>重新遮罩收起</span>
        </button>
      </div>

      <slot v-if="$slots.default" />
      <template v-else-if="blocks">
        <QuestionBody :key="`${questionId}-full`" :blocks="blocks" :title="title ?? ''" />
        <ReferenceCards v-if="references && references.length > 0" :references="references" />
      </template>

      <!-- Post-Reveal Self-Grade Bar -->
      <section
        class="mt-8 rounded-[16px] border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)]/70 p-4"
        aria-label="本题掌握度自评"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="text-xs font-medium text-[var(--text-secondary)]">
            掌握度自评（已掌握将按间隔天数进入复习队列）
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition"
              :class="
                studyStore.getStatus(questionId) === 'mastered'
                  ? 'border-transparent bg-[var(--status-mastered)] text-white shadow-[0_1px_4px_rgba(30,142,62,0.28)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--border-strong)]'
              "
              @click="grade('mastered')"
            >
              <CheckCircle2 class="h-3.5 w-3.5" />
              <span>流畅答出 · 已掌握 (+{{ nextMasteredDays }}d)</span>
            </button>
            <button
              type="button"
              class="inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition"
              :class="
                studyStore.getStatus(questionId) === 'reviewing'
                  ? 'border-transparent bg-[var(--status-reviewing)] text-white shadow-[0_1px_4px_rgba(217,119,6,0.28)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--border-strong)]'
              "
              @click="grade('reviewing')"
            >
              <span>卡壳 / 尚不熟 · 加入待复习</span>
            </button>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
