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
    <div class="bento-card rounded-[20px] p-7 sm:p-9">
      <div
        class="inline-flex items-center gap-2 rounded-full bg-[var(--brand-blue-soft)] px-3 py-1 font-mono text-[11px] font-semibold tracking-wider text-[var(--brand-blue-text)] uppercase"
      >
        <Compass class="h-3.5 w-3.5" />
        <span>planned domain</span>
      </div>

      <h1 class="mt-4 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
        {{ domainManifest?.config.name ?? domainId }} 题库 · 规划建设中
      </h1>
      <p class="mt-2.5 text-sm leading-relaxed text-[var(--text-secondary)]">
        {{ domainManifest?.config.tagline ?? '该技术领域已预留独立配色令牌与内容挂载点。' }}
      </p>

      <div class="mt-6 rounded-[14px] bg-[var(--bg-surface-muted)] p-4 text-xs leading-relaxed text-[var(--text-secondary)]">
        <div class="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
          <FolderGit2 class="h-4 w-4 text-[var(--brand-blue)]" />
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
        class="mt-6 inline-flex h-10 items-center gap-2 rounded-full bg-[var(--btn-primary-bg)] px-5 text-sm font-medium text-[var(--btn-primary-fg)] shadow-[0_2px_8px_rgba(0,113,227,0.25)] transition hover:bg-[var(--btn-primary-hover)]"
      >
        <Home class="h-4 w-4" />
        <span>回到已激活的 {{ primaryActiveDomain?.config.name ?? '' }} 题库</span>
      </RouterLink>
    </div>
  </main>
</template>
