<script setup lang="ts">
import { Home } from 'lucide-vue-next'
</script>

<template>
  <main class="mx-auto max-w-lg px-4 py-20 text-center">
    <div class="bento-card rounded-[20px] p-9">
      <div class="font-mono text-4xl font-bold tracking-tight text-[var(--brand-blue)]">404</div>
      <h1 class="mt-3 text-xl font-semibold text-[var(--text-primary)]">页面不存在或路径已变更</h1>
      <p class="mt-2 text-sm text-[var(--text-secondary)]">
        请返回首页知识地图或使用顶部搜索框（⌘K）定位题目。
      </p>
      <RouterLink
        to="/"
        class="mt-6 inline-flex h-10 items-center gap-2 rounded-full bg-[var(--btn-primary-bg)] px-5 text-sm font-medium text-[var(--btn-primary-fg)] shadow-[0_2px_8px_rgba(0,113,227,0.25)] transition hover:bg-[var(--btn-primary-hover)]"
      >
        <Home class="h-4 w-4" />
        <span>返回首页</span>
      </RouterLink>
    </div>
  </main>
</template>
