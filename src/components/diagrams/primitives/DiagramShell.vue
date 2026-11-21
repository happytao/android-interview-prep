<script setup lang="ts">
import { Maximize2, Pause, Play, RotateCcw, StepBack, StepForward } from 'lucide-vue-next'
import { ref } from 'vue'
import type { DiagramStep } from '@/composables/useDiagramSteps'
import DiagramLightbox from '../DiagramLightbox.vue'

const props = defineProps<{
  title: string
  subtitle?: string
  steps: DiagramStep[]
  currentStep: number
  isPlaying: boolean
  prefersReduced: boolean
}>()

const emit = defineEmits<{
  (e: 'prev'): void
  (e: 'next'): void
  (e: 'reset'): void
  (e: 'togglePlay'): void
  (e: 'selectStep', index: number): void
}>()

const lightboxOpen = ref(false)
const activeInfo = () => props.steps[props.currentStep] ?? props.steps[0]
</script>

<template>
  <figure
    class="my-6 overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-card)]"
  >
    <!-- Refined Top Header Band -->
    <div
      class="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-muted)]/60 px-4 py-3"
    >
      <div>
        <div class="flex items-center gap-2">
          <span
            class="inline-flex items-center rounded-full bg-[var(--brand-blue-soft)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--brand-blue-text)]"
          >
            交互原理图解
          </span>
          <h4 class="text-sm font-semibold text-[var(--text-primary)]">
            {{ title }}
          </h4>
        </div>
        <p v-if="subtitle" class="mt-0.5 text-xs text-[var(--text-muted)]">
          {{ subtitle }}
        </p>
      </div>

      <button
        type="button"
        class="inline-flex h-7 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--brand-blue)]/40 hover:text-[var(--brand-blue)]"
        aria-label="放大查看图解"
        @click="lightboxOpen = true"
      >
        <Maximize2 class="h-3 w-3" />
        <span>全屏缩放</span>
      </button>
    </div>

    <div class="p-4">
      <!-- Step Chips -->
      <div class="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="原理步骤">
        <button
          v-for="(s, idx) in steps"
          :key="idx"
          type="button"
          role="tab"
          :aria-selected="idx === currentStep"
          class="h-8 rounded-[10px] border px-2.5 text-xs font-medium transition"
          :class="
            idx === currentStep
              ? 'border-transparent bg-[var(--brand-blue)] text-white shadow-[0_1px_4px_rgba(0,113,227,0.28)]'
              : 'border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          "
          @click="emit('selectStep', idx)"
        >
          {{ idx + 1 }}. {{ s.title }}
        </button>
      </div>

      <!-- SVG Stage -->
      <div
        class="overflow-x-auto rounded-[12px] border border-[var(--border-subtle)] bg-[var(--diagram-surface-alt)] p-2 sm:p-4"
      >
        <slot v-if="!lightboxOpen" />
        <div
          v-else
          class="flex h-48 items-center justify-center text-xs text-[var(--text-muted)]"
        >
          正在全屏灯箱中查看图解...
        </div>
      </div>

      <!-- External Accessible HTML Step Caption -->
      <div
        aria-live="polite"
        class="mt-3 flex flex-col gap-3 rounded-[12px] bg-[var(--bg-surface-muted)] p-3.5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="min-w-0 flex-1">
          <div class="font-mono text-xs font-semibold text-[var(--brand-blue)]">
            步骤 {{ currentStep + 1 }} / {{ steps.length }} · {{ activeInfo()?.title }}
          </div>
          <p class="mt-0.5 text-sm leading-relaxed text-[var(--text-secondary)]">
            {{ activeInfo()?.description }}
          </p>
        </div>

        <div class="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] transition hover:border-[var(--border-strong)]"
            title="上一步"
            aria-label="上一步"
            @click="emit('prev')"
          >
            <StepBack class="h-3.5 w-3.5" />
          </button>
          <button
            v-if="!prefersReduced"
            type="button"
            class="inline-flex h-8 items-center gap-1 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-xs font-medium text-[var(--text-primary)] transition hover:border-[var(--border-strong)]"
            :aria-label="isPlaying ? '暂停自动演示' : '自动步进演示'"
            @click="emit('togglePlay')"
          >
            <Pause v-if="isPlaying" class="h-3.5 w-3.5" />
            <Play v-else class="h-3.5 w-3.5" />
            <span>{{ isPlaying ? '暂停' : '演示' }}</span>
          </button>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] transition hover:border-[var(--border-strong)]"
            title="下一步"
            aria-label="下一步"
            @click="emit('next')"
          >
            <StepForward class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            title="重置"
            aria-label="重置步骤"
            @click="emit('reset')"
          >
            <RotateCcw class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>

    <DiagramLightbox v-model:open="lightboxOpen" :title="title">
      <div class="w-full max-w-4xl rounded-[16px] border border-[var(--border-subtle)] bg-[var(--diagram-surface)] p-5">
        <slot />
      </div>

      <template #controls>
        <div class="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 text-xs">
          <span class="min-w-0 flex-1 font-medium text-[var(--text-primary)]">
            步骤 {{ currentStep + 1 }}/{{ steps.length }}：{{ activeInfo()?.title }} — {{ activeInfo()?.description }}
          </span>
          <div class="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              class="h-8 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] px-3 text-[var(--text-primary)]"
              @click="emit('prev')"
            >
              上一步
            </button>
            <button
              type="button"
              class="h-8 rounded-[10px] bg-[var(--btn-primary-bg)] px-3 font-medium text-[var(--btn-primary-fg)]"
              @click="emit('next')"
            >
              下一步
            </button>
          </div>
        </div>
      </template>
    </DiagramLightbox>
  </figure>
</template>
