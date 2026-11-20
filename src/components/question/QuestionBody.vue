<script setup lang="ts">
import { type Component, defineAsyncComponent } from 'vue'
import MermaidBlock from '@/components/diagrams/MermaidBlock.vue'
import type { QuestionBlock } from '@/types/interview'

defineProps<{
  blocks: QuestionBlock[]
  title: string
}>()

const diagramModules = import.meta.glob<{ default: Component }>('/src/components/diagrams/**/*.vue')
const asyncCache = new Map<string, Component>()

function resolveDiagram(name: string): Component | null {
  const existing = asyncCache.get(name)
  if (existing) return existing

  const entry = Object.entries(diagramModules).find(([filePath]) =>
    filePath.endsWith(`/${name}.vue`),
  )
  if (!entry) return null

  const comp = defineAsyncComponent(entry[1])
  asyncCache.set(name, comp)
  return comp
}
</script>

<template>
  <div class="interview-prose prose prose-slate dark:prose-invert max-w-none">
    <template v-for="(block, idx) in blocks" :key="idx">
      <!-- Safe: compiled at build time with markdown-it html: false -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-if="block.type === 'html'" v-html="block.html" />

      <component
        :is="resolveDiagram(block.name)"
        v-else-if="block.type === 'diagram' && resolveDiagram(block.name)"
      />

      <div
        v-else-if="block.type === 'diagram'"
        class="my-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300"
      >
        交互式图表组件 "{{ block.name }}" 尚未就绪
      </div>

      <MermaidBlock
        v-else-if="block.type === 'mermaid'"
        :code="block.code"
        :title="title"
      />
    </template>
  </div>
</template>
