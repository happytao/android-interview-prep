<script setup lang="ts">
import { useId } from 'vue'
import { useDiagramSteps, type DiagramStep } from '@/composables/useDiagramSteps'
import DiagramShell from '../primitives/DiagramShell.vue'

const arrowId = useId()

const steps: DiagramStep[] = [
  {
    title: 'Activity 入口分发',
    description:
      '触摸事件由 WMS 经 InputChannel 送达 Activity.dispatchTouchEvent()，先交给 PhoneWindow.superDispatchTouchEvent() 再传到根视图 DecorView。',
    highlightIds: ['activity', 'decor'],
  },
  {
    title: 'ViewGroup 逐层向下询问拦截',
    description:
      'ViewGroup.dispatchTouchEvent() 判断是否满足拦截条件：未禁止拦截且 onInterceptTouchEvent() 返回 false 时，遍历命中的子视图分发（DOWN 阶段确定 mFirstTouchTarget）。',
    highlightIds: ['viewgroup', 'view'],
  },
  {
    title: '子 View 消费事件或回溯冒泡',
    description:
      '若子 View.onTouchEvent()（或 OnTouchListener）返回 true，事件在底部消费结束；若返回 false，则按 U 型路径逐级向上回溯交由父容器 onTouchEvent() 处理。',
    highlightIds: ['view', 'viewgroup'],
  },
  {
    title: '拦截打断与 ACTION_CANCEL',
    description:
      '若 DOWN 由子 View 消费，但后续 MOVE 时父容器突然拦截，ViewGroup 会向原目标发送 ACTION_CANCEL 通知收尾清理状态（如按压态还原），不再下发后续事件。',
    highlightIds: ['viewgroup', 'cancel'],
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
    title="Android 触摸事件分发 U 型链路"
    subtitle="观察 dispatchTouchEvent → onInterceptTouchEvent → onTouchEvent 的职责链与 CANCEL 路径"
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
      viewBox="0 0 640 310"
      class="mx-auto w-full min-w-[540px] max-w-[640px]"
      role="img"
      aria-label="Android 触摸事件分发 U 型链路图"
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

      <!-- Activity -->
      <rect
        x="24"
        y="30"
        width="126"
        height="72"
        rx="10"
        :fill="isActive('activity') ? 'var(--domain-accent-soft)' : 'var(--diagram-surface)'"
        :stroke="isActive('activity') ? 'var(--domain-accent)' : 'var(--diagram-stroke)'"
        :stroke-width="isActive('activity') ? 2.5 : 1.5"
      />
      <text x="87" y="62" text-anchor="middle" font-size="14" font-weight="700" fill="var(--text-primary)">
        Activity
      </text>
      <text x="87" y="84" text-anchor="middle" font-size="12" fill="var(--text-secondary)">
        dispatchTouch
      </text>

      <!-- DecorView -->
      <rect
        x="182"
        y="30"
        width="126"
        height="72"
        rx="10"
        :fill="isActive('decor') ? 'var(--domain-accent-soft)' : 'var(--diagram-surface)'"
        :stroke="isActive('decor') ? 'var(--domain-accent)' : 'var(--diagram-stroke)'"
        :stroke-width="isActive('decor') ? 2.5 : 1.5"
      />
      <text x="245" y="62" text-anchor="middle" font-size="14" font-weight="700" fill="var(--text-primary)">
        DecorView
      </text>
      <text x="245" y="84" text-anchor="middle" font-size="12" fill="var(--text-secondary)">
        PhoneWindow
      </text>

      <!-- ViewGroup -->
      <rect
        x="340"
        y="30"
        width="136"
        height="90"
        rx="10"
        :fill="isActive('viewgroup') ? 'var(--domain-accent-soft)' : 'var(--diagram-surface)'"
        :stroke="isActive('viewgroup') ? 'var(--domain-accent)' : 'var(--diagram-stroke)'"
        :stroke-width="isActive('viewgroup') ? 2.5 : 1.5"
      />
      <text x="408" y="60" text-anchor="middle" font-size="14" font-weight="700" fill="var(--text-primary)">
        ViewGroup
      </text>
      <text x="408" y="82" text-anchor="middle" font-size="12" fill="var(--text-secondary)">
        onInterceptTouch
      </text>
      <text x="408" y="102" text-anchor="middle" font-size="12" fill="var(--text-secondary)">
        mFirstTouchTarget
      </text>

      <!-- Target View -->
      <rect
        x="506"
        y="174"
        width="114"
        height="86"
        rx="10"
        :fill="isActive('view') ? 'var(--domain-accent-soft)' : 'var(--diagram-surface)'"
        :stroke="isActive('view') ? 'var(--domain-accent)' : 'var(--diagram-stroke)'"
        :stroke-width="isActive('view') ? 2.5 : 1.5"
      />
      <text x="563" y="206" text-anchor="middle" font-size="14" font-weight="700" fill="var(--text-primary)">
        子 View
      </text>
      <text x="563" y="228" text-anchor="middle" font-size="12" fill="var(--text-secondary)">
        OnTouchListener
      </text>
      <text x="563" y="246" text-anchor="middle" font-size="12" fill="var(--text-secondary)">
        onTouchEvent
      </text>

      <!-- U-turn Return Bar -->
      <rect
        x="24"
        y="188"
        width="430"
        height="58"
        rx="10"
        :fill="isActive('cancel') ? 'var(--domain-accent-soft)' : 'var(--diagram-surface)'"
        :stroke="isActive('cancel') ? 'var(--domain-accent)' : 'var(--diagram-stroke)'"
        stroke-width="1.5"
      />
      <text x="239" y="213" text-anchor="middle" font-size="13" font-weight="600" fill="var(--text-primary)">
        未消费时沿 U 型链路回溯 onTouchEvent() 消费
      </text>
      <text x="239" y="233" text-anchor="middle" font-size="12" fill="var(--text-secondary)">
        父容器半路拦截时向原目标下发 ACTION_CANCEL 收尾
      </text>

      <!-- Forward Arrows -->
      <line x1="150" y1="66" x2="176" y2="66" stroke="var(--diagram-stroke)" stroke-width="2" :marker-end="`url(#${arrowId})`" />
      <line x1="308" y1="66" x2="334" y2="66" stroke="var(--diagram-stroke)" stroke-width="2" :marker-end="`url(#${arrowId})`" />
      <path d="M 476 75 L 563 75 L 563 168" fill="none" stroke="var(--domain-accent)" stroke-width="2.2" :marker-end="`url(#${arrowId})`" />
      <line x1="506" y1="217" x2="460" y2="217" stroke="var(--diagram-stroke)" stroke-width="2" stroke-dasharray="5 4" :marker-end="`url(#${arrowId})`" />
      <line x1="87" y1="188" x2="87" y2="108" stroke="var(--diagram-stroke)" stroke-width="2" stroke-dasharray="5 4" :marker-end="`url(#${arrowId})`" />
    </svg>
  </DiagramShell>
</template>
