<script setup lang="ts">
import { useId } from 'vue'
import { useDiagramSteps, type DiagramStep } from '@/composables/useDiagramSteps'
import DiagramShell from '../primitives/DiagramShell.vue'

const arrowId = useId()

const steps: DiagramStep[] = [
  {
    title: '请求 VSync 与同步屏障',
    description:
      'View.invalidate() / requestLayout() 触发 ViewRootImpl.scheduleTraversals()，向主线程 MessageQueue 插入同步屏障并向 Choreographer 注册帧回调请求 VSync。',
    highlightIds: ['vsync', 'choreographer'],
  },
  {
    title: 'Choreographer 按序调度帧回调',
    description:
      '硬件 VSync 信号抵达后，异步消息穿透同步屏障优先执行 Choreographer.doFrame()，按 Input → Animation → Insets → Traversal（Measure/Layout/Draw）依次回调。',
    highlightIds: ['choreographer', 'cpu'],
  },
  {
    title: 'RenderThread 异步 GPU 栅格化',
    description:
      '主线程录制 DisplayList / RenderNode 后移交 RenderThread 调用 Skia/Vulkan/GL 渲染到 GraphicBuffer（双缓冲/三缓冲轮转，避免主线程等待 GPU 完成）。',
    highlightIds: ['cpu', 'gpu'],
  },
  {
    title: 'SurfaceFlinger 合成与掉帧成因',
    description:
      'SurfaceFlinger 在下一 VSync 周期将多图层合成送显。若 CPU + GPU 耗时超过 16.6ms（60Hz）或 8.3ms（120Hz），Buffer 未就绪即发生掉帧（Jank）。',
    highlightIds: ['gpu', 'sf'],
  },
]

const {
  currentStep,
  activeHighlights,
  isPlaying,
  prefersReduced,
  next,
  prev,
  reset,
  setStep,
  toggleAutoPlay,
} = useDiagramSteps(steps)

const isActive = (id: string) => activeHighlights.value.has(id)
</script>

<template>
  <DiagramShell
    title="VSync 信号、Choreographer 与双缓冲渲染流水线"
    subtitle="理解 16.6ms/8.3ms 帧周期内主线程、RenderThread 与 SurfaceFlinger 的协同节奏"
    :steps="steps"
    :current-step="currentStep"
    :is-playing="isPlaying"
    :prefers-reduced="prefersReduced"
    @prev="prev"
    @next="next"
    @reset="reset"
    @toggle-play="toggleAutoPlay"
    @select-step="setStep"
  >
    <svg
      viewBox="0 0 640 290"
      class="mx-auto w-full max-w-[640px]"
      role="img"
      aria-label="VSync 与 Choreographer 渲染流水线"
    >
      <defs>
        <marker
          :id="arrowId"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--diagram-stroke)" />
        </marker>
      </defs>

      <!-- VSync Pulse -->
      <rect
        x="24"
        y="26"
        width="126"
        height="74"
        rx="10"
        :fill="isActive('vsync') ? 'var(--domain-accent-soft)' : 'var(--diagram-surface)'"
        :stroke="isActive('vsync') ? 'var(--domain-accent)' : 'var(--diagram-stroke)'"
        :stroke-width="isActive('vsync') ? 2.5 : 1.5"
      />
      <text x="87" y="58" text-anchor="middle" font-size="14" font-weight="700" fill="var(--text-primary)">
        VSync 脉冲
      </text>
      <text x="87" y="80" text-anchor="middle" font-size="12" fill="var(--text-secondary)">
        16.6ms / 8.3ms
      </text>

      <!-- Choreographer -->
      <rect
        x="184"
        y="26"
        width="172"
        height="74"
        rx="10"
        :fill="isActive('choreographer') ? 'var(--domain-accent-soft)' : 'var(--diagram-surface)'"
        :stroke="isActive('choreographer') ? 'var(--domain-accent)' : 'var(--diagram-stroke)'"
        :stroke-width="isActive('choreographer') ? 2.5 : 1.5"
      />
      <text x="270" y="56" text-anchor="middle" font-size="14" font-weight="700" fill="var(--text-primary)">
        Choreographer
      </text>
      <text x="270" y="78" text-anchor="middle" font-size="12" fill="var(--text-secondary)">
        Input → Anim → Traversal
      </text>

      <!-- Main Thread CPU -->
      <rect
        x="390"
        y="26"
        width="226"
        height="74"
        rx="10"
        :fill="isActive('cpu') ? 'var(--domain-accent-soft)' : 'var(--diagram-surface)'"
        :stroke="isActive('cpu') ? 'var(--domain-accent)' : 'var(--diagram-stroke)'"
        :stroke-width="isActive('cpu') ? 2.5 : 1.5"
      />
      <text x="503" y="56" text-anchor="middle" font-size="14" font-weight="700" fill="var(--text-primary)">
        主线程 (CPU)
      </text>
      <text x="503" y="78" text-anchor="middle" font-size="12" fill="var(--text-secondary)">
        Measure / Layout / 录制 DisplayList
      </text>

      <!-- RenderThread + GPU -->
      <rect
        x="340"
        y="174"
        width="276"
        height="84"
        rx="10"
        :fill="isActive('gpu') ? 'var(--domain-accent-soft)' : 'var(--diagram-surface)'"
        :stroke="isActive('gpu') ? 'var(--domain-accent)' : 'var(--diagram-stroke)'"
        :stroke-width="isActive('gpu') ? 2.5 : 1.5"
      />
      <text x="478" y="206" text-anchor="middle" font-size="14" font-weight="700" fill="var(--text-primary)">
        RenderThread + GPU 栅格化
      </text>
      <text x="478" y="228" text-anchor="middle" font-size="12" fill="var(--text-secondary)">
        GraphicBuffer 双/三缓冲轮转
      </text>
      <text x="478" y="246" text-anchor="middle" font-size="11" fill="var(--diagram-muted)">
        超时则错过下一次 VSync → 掉帧 Jank
      </text>

      <!-- SurfaceFlinger -->
      <rect
        x="24"
        y="174"
        width="254"
        height="84"
        rx="10"
        :fill="isActive('sf') ? 'var(--domain-accent-soft)' : 'var(--diagram-surface)'"
        :stroke="isActive('sf') ? 'var(--domain-accent)' : 'var(--diagram-stroke)'"
        :stroke-width="isActive('sf') ? 2.5 : 1.5"
      />
      <text x="151" y="208" text-anchor="middle" font-size="14" font-weight="700" fill="var(--text-primary)">
        SurfaceFlinger 合成上屏
      </text>
      <text x="151" y="232" text-anchor="middle" font-size="12" fill="var(--text-secondary)">
        HWC / GL 合成多窗口图层 → Display
      </text>

      <!-- Arrows -->
      <line x1="150" y1="63" x2="178" y2="63" stroke="var(--diagram-stroke)" stroke-width="2" :marker-end="`url(#${arrowId})`" />
      <line x1="356" y1="63" x2="384" y2="63" stroke="var(--diagram-stroke)" stroke-width="2" :marker-end="`url(#${arrowId})`" />
      <line x1="503" y1="100" x2="503" y2="168" stroke="var(--domain-accent)" stroke-width="2.2" :marker-end="`url(#${arrowId})`" />
      <line x1="340" y1="216" x2="284" y2="216" stroke="var(--diagram-stroke)" stroke-width="2" :marker-end="`url(#${arrowId})`" />
    </svg>
  </DiagramShell>
</template>
