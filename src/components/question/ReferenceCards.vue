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
  return '经典深度博客'
}
</script>

<template>
  <section class="mt-8 space-y-3" aria-label="延伸参考资料">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="text-sm font-bold text-[var(--text-primary)]">权威延伸参考卡片</h3>
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)] hover:border-[var(--domain-accent)] hover:text-[var(--text-primary)]"
        @click="studyStore.setUseCnAndroidDocs(!studyStore.state.useCnAndroidDocs)"
      >
        <Globe class="h-3 w-3 text-[var(--domain-accent)]" />
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
        class="group flex items-start justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 transition hover:border-[var(--domain-accent)]"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5 text-[11px]">
            <BookOpen v-if="refItem.type === 'official'" class="h-3.5 w-3.5 text-[var(--domain-accent)]" />
            <Code2 v-else-if="refItem.type === 'aosp'" class="h-3.5 w-3.5 text-indigo-500" />
            <FileText v-else class="h-3.5 w-3.5 text-amber-500" />
            <span class="font-semibold text-[var(--text-secondary)]">{{ typeLabel(refItem.type) }}</span>
            <span class="text-[var(--text-muted)]">· 校验 {{ refItem.verifiedAt }}</span>
          </div>
          <div class="mt-1 line-clamp-2 text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--domain-accent)]">
            {{ refItem.title }}
          </div>
        </div>
        <ExternalLink class="mt-1 h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--domain-accent)]" />
      </a>
    </div>
  </section>
</template>
