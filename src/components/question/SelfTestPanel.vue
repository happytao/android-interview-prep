<script setup lang="ts">
import { CheckCircle2, Eye, EyeOff, HelpCircle } from 'lucide-vue-next'
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
      class="my-6 rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface-muted)] p-5 sm:p-6"
    >
      <div class="flex items-start gap-3">
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
        >
          <EyeOff class="h-4 w-4" />
        </span>
        <div>
          <h2 class="text-sm font-semibold text-[var(--text-primary)] sm:text-base">
            面试自测模式 · 先尝试口述作答
          </h2>
          <p class="mt-1 text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
            试着用 30–60 秒组织「核心结论 → 底层机制链路 → 常见追问」。卡壳时可先查看关键词提示。
          </p>
        </div>
      </div>

      <div
        v-if="hintsShown"
        class="mt-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5"
      >
        <div class="mb-2 font-mono text-[11px] font-medium text-[var(--text-muted)]">
          记忆线索关键词
        </div>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="kw in keywords"
            :key="kw"
            class="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] px-2 py-0.5 font-mono text-xs text-[var(--text-primary)]"
          >
            {{ kw }}
          </span>
        </div>
      </div>

      <div class="mt-5 flex flex-wrap gap-2">
        <button
          v-if="!hintsShown"
          type="button"
          class="inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)] sm:text-sm"
          @click="hintsShown = true"
        >
          <HelpCircle class="h-3.5 w-3.5 text-[var(--text-muted)]" />
          <span>1. 显示关键词提示</span>
        </button>

        <button
          type="button"
          class="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--btn-primary-bg)] px-4 text-xs font-medium text-[var(--btn-primary-fg)] transition hover:opacity-90 sm:text-sm"
          @click="revealAnswer"
        >
          <Eye class="h-3.5 w-3.5" />
          <span>{{ hintsShown ? '2. 展开完整原理解析' : '直接展开完整解析' }}</span>
        </button>
      </div>
    </section>

    <!-- Revealed Content -->
    <template v-else>
      <div
        v-if="studyStore.state.selfTestMode"
        class="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] px-3.5 py-2 text-xs"
      >
        <span class="text-[var(--text-secondary)]">自测解析已展开，对照后记得自评打标</span>
        <button
          type="button"
          class="inline-flex items-center gap-1 font-medium text-[var(--text-primary)] hover:underline"
          @click="collapseAnswer"
        >
          <EyeOff class="h-3.5 w-3.5" />
          <span>重新遮罩收起</span>
        </button>
      </div>

      <slot />

      <!-- Post-Reveal Self-Grade Bar -->
      <section
        class="mt-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] p-4"
        aria-label="本题掌握度自评"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="text-xs font-medium text-[var(--text-secondary)]">
            掌握度自评（已掌握将按间隔天数进入复习队列）
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition"
              :class="
                studyStore.getStatus(questionId) === 'mastered'
                  ? 'border-[var(--domain-accent)] bg-[var(--domain-accent)] text-[var(--domain-accent-fg)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--border-strong)]'
              "
              @click="grade('mastered')"
            >
              <CheckCircle2 class="h-3.5 w-3.5" />
              <span>流畅答出 · 已掌握</span>
            </button>
            <button
              type="button"
              class="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition"
              :class="
                studyStore.getStatus(questionId) === 'reviewing'
                  ? 'border-amber-500 bg-amber-500 text-white'
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
