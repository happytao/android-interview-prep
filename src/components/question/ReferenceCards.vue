<script setup lang="ts">
import { BookOpen, Code2, ExternalLink, FileText, Globe } from 'lucide-vue-next'
import { useStudyStore } from '@/stores/studyStore'
import type { ReferenceItem } from '@/types/interview'

defineProps<{
  references: ReferenceItem[]
}>()

const studyStore = useStudyStore()

function resolveUrl(url: string): string {
  if (studyStore.state.useCnAndroidDocs && url.startsWith('https://developer.android.com/')) {
    return url.replace('https://developer.android.com/', 'https://developer.android.google.cn/')
  }
  return url
}

function typeLabel(t: ReferenceItem['type']): string {
  if (t === 'official') return '官方文档'
  if (t === 'aosp') return 'AOSP 源码'
  return '技术专栏'
}
</script>

<template>
  <section class="mt-8 space-y-3 border-t border-[var(--border-subtle)] pt-6" aria-label="延伸参考资料">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="text-sm font-semibold text-[var(--text-primary)]">权威延伸参考</h3>
      <button
        type="button"
        class="inline-flex h-7 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] px-2.5 text-[11px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
        @click="studyStore.setUseCnAndroidDocs(!studyStore.state.useCnAndroidDocs)"
      >
        <Globe class="h-3 w-3 text-[var(--brand-blue)]" />
        <span>{{ studyStore.state.useCnAndroidDocs ? '已切至 .google.cn 镜像' : '切至国内 .google.cn 镜像' }}</span>
      </button>
    </div>

    <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      <a
        v-for="refItem in references"
        :key="refItem.url"
        :href="resolveUrl(refItem.url)"
        target="_blank"
        rel="noopener noreferrer"
        referrerpolicy="no-referrer"
        class="group flex items-start justify-between gap-3 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)]/55 p-3.5 transition hover:border-[var(--brand-blue)]/40 hover:bg-[var(--bg-surface)]"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5 font-mono text-[11px] text-[var(--text-muted)]">
            <BookOpen v-if="refItem.type === 'official'" class="h-3.5 w-3.5 text-[var(--brand-blue)]" />
            <Code2 v-else-if="refItem.type === 'aosp'" class="h-3.5 w-3.5 text-[var(--brand-blue)]" />
            <FileText v-else class="h-3.5 w-3.5" />
            <span>{{ typeLabel(refItem.type) }}</span>
            <span>· {{ refItem.verifiedAt }}</span>
          </div>
          <div class="mt-1 line-clamp-2 text-xs font-medium text-[var(--text-primary)] transition-colors group-hover:text-[var(--brand-blue)]">
            {{ refItem.title }}
          </div>
        </div>
        <ExternalLink class="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--text-muted)] transition group-hover:text-[var(--brand-blue)]" />
      </a>
    </div>
  </section>
</template>
