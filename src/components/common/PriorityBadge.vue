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
    cls: 'border-[var(--border-strong)] bg-[var(--bg-surface-muted)] text-[var(--text-primary)] font-medium',
  },
  core: {
    label: '核心常考',
    cls: 'border-[var(--border-subtle)] bg-transparent text-[var(--text-muted)]',
  },
  bonus: {
    label: '中级加分',
    cls: 'border-[var(--border-subtle)] bg-transparent text-[var(--text-muted)]',
  },
}

const statusMap: Record<StudyStatus, { label: string; dot: string }> = {
  unlearned: {
    label: '未学',
    dot: 'bg-zinc-300 dark:bg-zinc-700',
  },
  reviewing: {
    label: '需复习',
    dot: 'bg-amber-500',
  },
  mastered: {
    label: '已掌握',
    dot: 'bg-[var(--domain-accent)]',
  },
}
</script>

<template>
  <span class="inline-flex flex-wrap items-center gap-2">
    <span
      v-if="priority"
      class="inline-flex items-center rounded-md border font-mono"
      :class="[priorityMap[priority].cls, compact ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs']"
    >
      {{ priorityMap[priority].label }}
    </span>
    <span
      v-if="status"
      class="inline-flex items-center gap-1.5 font-mono text-[var(--text-muted)]"
      :class="compact ? 'text-[11px]' : 'text-xs'"
    >
      <span class="h-1.5 w-1.5 rounded-full" :class="statusMap[status].dot" />
      <span>{{ statusMap[status].label }}</span>
    </span>
  </span>
</template>
