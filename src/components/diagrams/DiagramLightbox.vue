<script setup lang="ts">
import Panzoom, { type PanzoomObject } from '@panzoom/panzoom'
import { RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-vue-next'
import { nextTick, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  title: string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const stageRef = ref<HTMLElement | null>(null)
let panzoomInstance: PanzoomObject | null = null

const destroyPanzoom = () => {
  panzoomInstance?.destroy()
  panzoomInstance = null
}

const initPanzoom = async () => {
  await nextTick()
  destroyPanzoom()
  if (stageRef.value) {
    panzoomInstance = Panzoom(stageRef.value, {
      maxScale: 4,
      minScale: 0.5,
      step: 0.3,
    })
  }
}

const close = () => emit('update:open', false)
const zoomIn = () => panzoomInstance?.zoomIn()
const zoomOut = () => panzoomInstance?.zoomOut()
const resetZoom = () => panzoomInstance?.reset()

const onWheel = (e: WheelEvent) => {
  panzoomInstance?.zoomWithWheel(e)
}

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.open) {
    close()
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (typeof document === 'undefined') return
    if (isOpen) {
      document.documentElement.style.overflow = 'hidden'
      window.addEventListener('keydown', onKeydown)
      void initPanzoom()
    } else {
      document.documentElement.style.overflow = ''
      window.removeEventListener('keydown', onKeydown)
      destroyPanzoom()
    }
  },
)

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.documentElement.style.overflow = ''
    window.removeEventListener('keydown', onKeydown)
  }
  destroyPanzoom()
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[60] flex flex-col bg-black/80 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
    >
      <header
        class="flex items-center justify-between gap-3 border-b border-white/10 bg-[var(--bg-surface)] px-4 py-3 text-[var(--text-primary)]"
      >
        <div class="truncate text-sm font-semibold">{{ title }}</div>
        <div class="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)]"
            aria-label="缩小"
            @click="zoomOut"
          >
            <ZoomOut class="h-4 w-4" />
          </button>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)]"
            aria-label="放大"
            @click="zoomIn"
          >
            <ZoomIn class="h-4 w-4" />
          </button>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)]"
            aria-label="重置缩放"
            @click="resetZoom"
          >
            <RotateCcw class="h-4 w-4" />
          </button>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--domain-accent)] text-[var(--domain-accent-fg)]"
            aria-label="关闭全屏图解"
            @click="close"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </header>

      <div
        class="relative flex flex-1 items-center justify-center overflow-hidden p-3 select-none sm:p-6"
        style="touch-action: none"
        @wheel.prevent="onWheel"
        @click.self="close"
      >
        <div
          ref="stageRef"
          class="lightbox-stage flex max-h-full w-full max-w-4xl items-center justify-center"
        >
          <slot />
        </div>
      </div>

      <footer class="bg-black/60 px-4 py-2 text-center text-xs text-white/75">
        支持滚轮 / 双指缩放与拖拽平移，按 Esc 或点击空白处关闭
      </footer>
    </div>
  </Teleport>
</template>

<style scoped>
.lightbox-stage :deep(svg) {
  max-width: 100%;
  max-height: 62vh;
  height: auto;
  margin-inline: auto;
  display: block;
}
</style>
