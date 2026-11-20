<script setup lang="ts">
import { Home } from 'lucide-vue-next'
</script>

<template>
  <main class="mx-auto max-w-lg px-4 py-20 text-center">
    <div class="font-mono text-4xl font-bold tracking-tight text-[var(--text-primary)]">404</div>
    <h1 class="mt-3 text-xl font-semibold text-[var(--text-primary)]">页面不存在或路径已变更</h1>
    <p class="mt-2 text-sm text-[var(--text-secondary)]">
      请返回首页知识地图或使用顶部搜索框（Ctrl+K）定位题目。
    </p>
    <RouterLink
      to="/"
      class="mt-6 inline-flex h-9 items-center gap-2 rounded-md bg-[var(--btn-primary-bg)] px-4 text-sm font-medium text-[var(--btn-primary-fg)] transition hover:opacity-90"
    >
      <Home class="h-4 w-4" />
      <span>返回首页</span>
    </RouterLink>
  </main>
</template>
