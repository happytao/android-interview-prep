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
    cls: 'bg-[var(--brand-blue-soft)] text-[var(--brand-blue-text)] font-medium',
  },
  core: {
    label: '核心常考',
    cls: 'bg-[var(--bg-surface-muted)] text-[var(--text-secondary)]',
  },
  bonus: {
    label: '中级加分',
    cls: 'bg-[var(--bg-surface-muted)] text-[var(--text-muted)]',
  },
}

const statusMap: Record<StudyStatus, { label: string; dot: string }> = {
  unlearned: {
    label: '未学',
    dot: 'bg-black/20 dark:bg-white/25',
  },
  reviewing: {
    label: '需复习',
    dot: 'bg-[var(--status-reviewing)]',
  },
  mastered: {
    label: '已掌握',
    dot: 'bg-[var(--status-mastered)]',
  },
}
</script>

<template>
  <span class="inline-flex flex-wrap items-center gap-2">
    <span
      v-if="priority"
      class="inline-flex items-center rounded-full font-mono"
      :class="[priorityMap[priority].cls, compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs']"
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
