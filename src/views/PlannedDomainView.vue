<script setup lang="ts">
import { Compass, FolderGit2, Home } from 'lucide-vue-next'
import { computed } from 'vue'
import { allDomains, getDomainManifest } from '@/domains/registry'

const props = defineProps<{
  domainId: string
}>()

const domainManifest = computed(() => getDomainManifest(props.domainId))
const primaryActiveDomain = computed(() => allDomains.find((d) => d.config.status === 'active') ?? allDomains[0])
</script>

<template>
  <main class="mx-auto max-w-2xl px-4 py-14">
    <div class="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-xs sm:p-8">
      <div class="inline-flex items-center gap-2 rounded-full bg-[var(--domain-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--domain-accent)]">
        <Compass class="h-3.5 w-3.5" />
        <span>远期领域规划占位</span>
      </div>

      <h1 class="mt-3 text-2xl font-extrabold text-[var(--text-primary)]">
        {{ domainManifest?.config.name ?? domainId }} 题库 · 规划建设中
      </h1>
      <p class="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
        {{ domainManifest?.config.tagline ?? '该技术领域已预留独立配色令牌与内容挂载点。' }}
      </p>

      <div class="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] p-4 text-xs leading-relaxed text-[var(--text-secondary)]">
        <div class="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
          <FolderGit2 class="h-4 w-4 text-[var(--domain-accent)]" />
          <span>零改代码扩展机制（已就绪）</span>
        </div>
        <p class="mt-1.5">
          后续学习到本领域时，只需将
          <code class="font-mono">content/{{ domainId }}/_domain.json</code>
          中的 <code class="font-mono">status</code> 改为 <code class="font-mono">"active"</code>，并按两级目录放入
          <code class="font-mono">.md</code> 题目，全站导航、搜索分词与本地刷题记录即自动生效。
        </p>
      </div>

      <RouterLink
        :to="primaryActiveDomain ? `/${primaryActiveDomain.config.id}` : '/'"
        class="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--domain-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--domain-accent-fg)]"
      >
        <Home class="h-4 w-4" />
        <span>回到已激活的 {{ primaryActiveDomain?.config.name ?? '' }} 题库</span>
      </RouterLink>
    </div>
  </main>
</template>
