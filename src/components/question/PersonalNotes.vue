<script setup lang="ts">
import { PencilLine } from 'lucide-vue-next'
import { onUnmounted, ref, watch } from 'vue'
import { useStudyStore } from '@/stores/studyStore'

const props = defineProps<{
  questionId: string
}>()

const studyStore = useStudyStore()
const draft = ref(studyStore.getNote(props.questionId))
const savedHint = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null
let dirtyQuestionId: string | null = null

const flushPendingSave = () => {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  if (dirtyQuestionId !== null) {
    studyStore.setNote(dirtyQuestionId, draft.value)
    dirtyQuestionId = null
  }
}

watch(
  () => props.questionId,
  (newId, oldId) => {
    if (oldId && dirtyQuestionId === oldId) {
      flushPendingSave()
    }
    draft.value = studyStore.getNote(newId)
    savedHint.value = false
  },
)

watch(
  () => studyStore.getNote(props.questionId),
  (storeNote) => {
    if (dirtyQuestionId !== props.questionId && draft.value !== storeNote) {
      draft.value = storeNote
      savedHint.value = false
    }
  },
)

onUnmounted(() => {
  flushPendingSave()
})

const onInput = () => {
  const targetId = props.questionId
  dirtyQuestionId = targetId
  savedHint.value = false
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    if (dirtyQuestionId === targetId) {
      studyStore.setNote(targetId, draft.value)
      dirtyQuestionId = null
      savedHint.value = true
    }
  }, 280)
}
</script>

<template>
  <section
    class="mt-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5"
    aria-label="个人复习笔记"
  >
    <div class="mb-2.5 flex items-center justify-between gap-2">
      <div class="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
        <PencilLine class="h-4 w-4 text-[var(--domain-accent)]" />
        <span>个人手记与口述补充（纯文本安全存储）</span>
      </div>
      <span class="text-[11px] text-[var(--text-muted)]">
        {{ savedHint ? '已自动保存至本地' : `${draft.length} / 5000` }}
      </span>
    </div>

    <textarea
      v-model="draft"
      rows="4"
      maxlength="5000"
      placeholder="记录你在实际项目里的踩坑案例、面试复盘话术或补充理解（纯文本保存，支持导入导出备份）..."
      class="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--domain-accent)] focus:outline-none"
      @input="onInput"
    />
  </section>
</template>
