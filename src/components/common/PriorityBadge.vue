<script setup lang="ts">
import type { Priority, StudyStatus } from '@/types/interview'

defineProps<{
  priority?: Priority
  status?: StudyStatus
  compact?: boolean
}>()

const priorityMap: Record<Priority, { label: string; cls: string }> = {
  'must-know': {
    label: '高频必考',
    cls: 'bg-amber-500/12 text-amber-700 border-amber-500/30 dark:text-amber-300 dark:border-amber-400/30',
  },
  core: {
    label: '核心常考',
    cls: 'bg-[var(--domain-accent-soft)] text-[var(--domain-accent)] border-[var(--domain-accent)]/30',
  },
  bonus: {
    label: '中级加分',
    cls: 'bg-indigo-500/12 text-indigo-700 border-indigo-500/30 dark:text-indigo-300 dark:border-indigo-400/30',
  },
}

const statusMap: Record<StudyStatus, { label: string; dot: string; cls: string }> = {
  unlearned: {
    label: '未学',
    dot: 'bg-slate-400',
    cls: 'bg-[var(--bg-surface-muted)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
  },
  reviewing: {
    label: '需复习',
    dot: 'bg-orange-500',
    cls: 'bg-orange-500/12 text-orange-700 border-orange-500/30 dark:text-orange-300',
  },
  mastered: {
    label: '已掌握',
    dot: 'bg-emerald-500',
    cls: 'bg-emerald-500/12 text-emerald-700 border-emerald-500/30 dark:text-emerald-300',
  },
}
</script>

<template>
  <span class="inline-flex flex-wrap items-center gap-1.5">
    <span
      v-if="priority"
      class="inline-flex items-center rounded-md border font-medium"
      :class="[priorityMap[priority].cls, compact ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs']"
    >
      {{ priorityMap[priority].label }}
    </span>
    <span
      v-if="status"
      class="inline-flex items-center gap-1.5 rounded-md border font-medium"
      :class="[statusMap[status].cls, compact ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs']"
    >
      <span class="h-1.5 w-1.5 rounded-full" :class="statusMap[status].dot" />
      {{ statusMap[status].label }}
    </span>
  </span>
</template>
