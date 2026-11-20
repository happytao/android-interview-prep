<script setup lang="ts">
import { CheckCircle2, Eye, EyeOff, HelpCircle, Sparkles } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useStudyStore } from '@/stores/studyStore'

const props = defineProps<{
  questionId: string
  keywords: string[]
}>()

const studyStore = useStudyStore()
const hintsShown = ref(false)

watch(
  () => props.questionId,
  () => {
    hintsShown.value = false
  },
)

const isCollapsed = computed(
  () => studyStore.state.selfTestMode && !studyStore.isRevealed(props.questionId),
)

const revealAnswer = () => {
  studyStore.setRevealed(props.questionId, true)
}

const collapseAnswer = () => {
  studyStore.setRevealed(props.questionId, false)
  hintsShown.value = false
}

const grade = (status: 'mastered' | 'reviewing') => {
  studyStore.setStatus(props.questionId, status)
}
</script>

<template>
  <div>
    <!-- Collapsed Self-Test Gate (v-if prevents hidden DOM Mermaid getBBox=0 & Ctrl+F leakage) -->
    <section
      v-if="isCollapsed"
      class="my-6 rounded-2xl border border-dashed border-[var(--domain-accent)]/50 bg-[var(--bg-surface)] p-5 shadow-xs sm:p-6"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex items-start gap-3">
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--domain-accent-soft)] text-[var(--domain-accent)]"
          >
            <EyeOff class="h-5 w-5" />
          </span>
          <div>
            <h2 class="text-base font-bold text-[var(--text-primary)]">面试自测模式 · 先尝试口述作答</h2>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">
              试着用 30–60 秒在脑海中组织「核心结论 → 底层机制链路 → 常见追问」。卡壳时可先查看关键词提示。
            </p>
          </div>
        </div>
      </div>

      <div v-if="hintsShown" class="mt-4 rounded-xl bg-[var(--bg-surface-muted)] p-3.5">
        <div class="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--domain-accent)]">
          <Sparkles class="h-3.5 w-3.5" />
          <span>记忆线索关键词</span>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="kw in keywords"
            :key="kw"
            class="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono text-xs text-[var(--text-primary)]"
          >
            {{ kw }}
          </span>
        </div>
      </div>

      <div class="mt-5 flex flex-wrap gap-2.5">
        <button
          v-if="!hintsShown"
          type="button"
          class="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--domain-accent)]"
          @click="hintsShown = true"
        >
          <HelpCircle class="h-4 w-4 text-[var(--domain-accent)]" />
          <span>1. 显示关键词提示</span>
        </button>

        <button
          type="button"
          class="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[var(--domain-accent)] px-4 py-2 text-sm font-semibold text-[var(--domain-accent-fg)] shadow-xs transition hover:opacity-95"
          @click="revealAnswer"
        >
          <Eye class="h-4 w-4" />
          <span>{{ hintsShown ? '2. 展开完整原理解析' : '直接展开完整解析' }}</span>
        </button>
      </div>
    </section>

    <!-- Revealed Content -->
    <template v-else>
      <div
        v-if="studyStore.state.selfTestMode"
        class="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] px-3.5 py-2 text-xs"
      >
        <span class="font-medium text-[var(--text-secondary)]">自测解析已展开，对照后记得自评打标</span>
        <button
          type="button"
          class="inline-flex items-center gap-1 font-medium text-[var(--domain-accent)] hover:underline"
          @click="collapseAnswer"
        >
          <EyeOff class="h-3.5 w-3.5" />
          <span>重新遮罩收起</span>
        </button>
      </div>

      <slot />

      <!-- Post-Reveal Self-Grade Bar -->
      <section
        class="mt-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] p-4"
        aria-label="本题掌握度自评"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="text-xs font-medium text-[var(--text-secondary)]">
            掌握度自评（已掌握将按间隔天数进入复习队列）：
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition"
              :class="
                studyStore.getStatus(questionId) === 'mastered'
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-emerald-500'
              "
              @click="grade('mastered')"
            >
              <CheckCircle2 class="h-3.5 w-3.5" />
              <span>流畅答出 · 已掌握</span>
            </button>
            <button
              type="button"
              class="inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition"
              :class="
                studyStore.getStatus(questionId) === 'reviewing'
                  ? 'border-orange-500 bg-orange-500 text-white'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-orange-500'
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
