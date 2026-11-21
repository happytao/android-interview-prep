<script setup lang="ts">
import { Maximize2 } from 'lucide-vue-next'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { renderMermaidSerialized } from '@/utils/mermaidQueue'
import DiagramLightbox from './DiagramLightbox.vue'

const props = defineProps<{
  code: string
  title?: string
}>()

const { resolvedTheme } = useTheme()
const containerRef = ref<HTMLElement | null>(null)
const isVisible = ref(false)
const isRendering = ref(true)
const errorMsg = ref<string | null>(null)
const renderedSvg = ref('')
const lightboxOpen = ref(false)

let observer: IntersectionObserver | null = null
let renderGeneration = 0

const executeRender = async () => {
  if (!isVisible.value) return
  const currentGen = ++renderGeneration
  isRendering.value = true
  errorMsg.value = null
  try {
    const svg = await renderMermaidSerialized(props.code, resolvedTheme.value)
    if (currentGen === renderGeneration) {
      renderedSvg.value = svg
    }
  } catch (err) {
    if (currentGen === renderGeneration) {
      errorMsg.value = err instanceof Error ? err.message : '流程图渲染失败'
    }
  } finally {
    if (currentGen === renderGeneration) {
      isRendering.value = false
    }
  }
}

onMounted(() => {
  if (typeof IntersectionObserver === 'undefined') {
    isVisible.value = true
    void executeRender()
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        isVisible.value = true
        observer?.disconnect()
        observer = null
        void executeRender()
      }
    },
    { rootMargin: '180px 0px' },
  )

  if (containerRef.value) {
    observer.observe(containerRef.value)
  }
})

watch([() => props.code, resolvedTheme], () => {
  if (isVisible.value) {
    void executeRender()
  }
})

onUnmounted(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <figure
    ref="containerRef"
    class="my-6 overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-card)]"
  >
    <!-- Refined Light-Gray Top Bar -->
    <div
      class="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-muted)]/60 px-4 py-2.5"
    >
      <span
        class="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wide text-[var(--text-secondary)]"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-[var(--brand-blue)]" />
        <span>ARCHITECTURE FLOW · 机制流程图</span>
      </span>
      <button
        v-if="renderedSvg"
        type="button"
        class="inline-flex h-7 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--brand-blue)]/40 hover:text-[var(--brand-blue)]"
        aria-label="全屏缩放流程图"
        @click="lightboxOpen = true"
      >
        <Maximize2 class="h-3 w-3" />
        <span>放大查看</span>
      </button>
    </div>

    <div
      class="min-h-[200px] overflow-x-auto bg-[var(--diagram-surface)] p-4 sm:p-5"
    >
      <div
        v-if="errorMsg"
        class="rounded-[12px] border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-300"
      >
        <p class="font-semibold">Mermaid 渲染异常：{{ errorMsg }}</p>
        <pre class="mt-2 overflow-x-auto whitespace-pre-wrap text-[11px]">{{ code }}</pre>
      </div>

      <div
        v-else-if="isRendering && !renderedSvg"
        class="flex h-[200px] animate-pulse items-center justify-center text-xs text-[var(--text-muted)]"
      >
        正在渲染流程图...
      </div>

      <!-- Safe: rendered by Mermaid with securityLevel: 'strict' -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div
        v-else-if="!lightboxOpen"
        class="mermaid-svg-host flex justify-center [&>svg]:h-auto [&>svg]:max-w-full"
        v-html="renderedSvg"
      />
      <div
        v-else
        class="flex h-[200px] items-center justify-center text-xs text-[var(--text-muted)]"
      >
        正在全屏灯箱中查看流程图...
      </div>
    </div>

    <DiagramLightbox v-model:open="lightboxOpen" :title="title ?? '机制流程图'">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div
        class="max-w-[92vw] rounded-[16px] border border-[var(--border-subtle)] bg-[var(--diagram-surface)] p-5 [&>svg]:h-auto [&>svg]:max-h-[75vh] [&>svg]:max-w-[88vw]"
        v-html="renderedSvg"
      />
    </DiagramLightbox>
  </figure>
</template>
