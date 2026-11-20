<script setup lang="ts">
import { Home } from 'lucide-vue-next'
</script>

<template>
  <main class="mx-auto max-w-lg px-4 py-20 text-center">
    <div class="font-mono text-4xl font-black text-[var(--domain-accent)]">404</div>
    <h1 class="mt-3 text-xl font-bold text-[var(--text-primary)]">页面不存在或路径已变更</h1>
    <p class="mt-2 text-sm text-[var(--text-secondary)]">
      请返回首页知识地图或使用顶部搜索框（Ctrl+K）定位题目。
    </p>
    <RouterLink
      to="/"
      class="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--domain-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--domain-accent-fg)]"
    >
      <Home class="h-4 w-4" />
      <span>返回首页</span>
    </RouterLink>
  </main>
</template>
