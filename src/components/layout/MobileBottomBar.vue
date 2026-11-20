<script setup lang="ts">
import { CheckCircle2, ChevronLeft, ChevronRight, Eye, EyeOff, ListTree } from 'lucide-vue-next'
import { useStudyStore } from '@/stores/studyStore'
import type { QuestionSummary } from '@/types/interview'

const props = defineProps<{
  questionId: string
  prev: QuestionSummary | null
  next: QuestionSummary | null
}>()

const emit = defineEmits<{
  (e: 'openDrawer'): void
  (e: 'navigate', target: QuestionSummary): void
}>()

const studyStore = useStudyStore()

const toggleMastered = () => {
  const current = studyStore.getStatus(props.questionId)
  studyStore.setStatus(props.questionId, current === 'mastered' ? 'reviewing' : 'mastered')
}
</script>

<template>
  <nav
    class="fixed right-0 bottom-0 left-0 z-30 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 px-2 pt-1.5 backdrop-blur-md lg:hidden"
    style="padding-bottom: max(0.45rem, env(safe-area-inset-bottom));"
    aria-label="移动端单手快捷操作栏"
  >
    <div class="mx-auto grid max-w-md grid-cols-5 gap-1">
      <button
        type="button"
        class="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium text-[var(--text-secondary)] active:bg-[var(--bg-surface-muted)]"
        @click="emit('openDrawer')"
      >
        <ListTree class="h-4 w-4" />
        <span>目录</span>
      </button>

      <button
        type="button"
        :disabled="!prev"
        class="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium transition disabled:opacity-35"
        :class="'text-[var(--text-secondary)] active:bg-[var(--bg-surface-muted)]'"
        @click="prev && emit('navigate', prev)"
      >
        <ChevronLeft class="h-4 w-4" />
        <span>上一题</span>
      </button>

      <button
        type="button"
        class="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium transition"
        :class="
          studyStore.state.selfTestMode
            ? 'bg-[var(--domain-accent-soft)] text-[var(--domain-accent)]'
            : 'text-[var(--text-secondary)] active:bg-[var(--bg-surface-muted)]'
        "
        @click="studyStore.setSelfTestMode(!studyStore.state.selfTestMode)"
      >
        <EyeOff v-if="studyStore.state.selfTestMode" class="h-4 w-4" />
        <Eye v-else class="h-4 w-4" />
        <span>自测</span>
      </button>

      <button
        type="button"
        class="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium transition"
        :class="
          studyStore.getStatus(questionId) === 'mastered'
            ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
            : 'text-[var(--text-secondary)] active:bg-[var(--bg-surface-muted)]'
        "
        @click="toggleMastered"
      >
        <CheckCircle2 class="h-4 w-4" />
        <span>{{ studyStore.getStatus(questionId) === 'mastered' ? '已掌握' : '打卡' }}</span>
      </button>

      <button
        type="button"
        :disabled="!next"
        class="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium transition disabled:opacity-35"
        :class="'text-[var(--text-primary)] active:bg-[var(--bg-surface-muted)]'"
        @click="next && emit('navigate', next)"
      >
        <ChevronRight class="h-4 w-4" />
        <span>下一题</span>
      </button>
    </div>
  </nav>
</template>
