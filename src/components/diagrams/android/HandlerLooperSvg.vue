<script setup lang="ts">
import { useId } from 'vue'
import { useDiagramSteps, type DiagramStep } from '@/composables/useDiagramSteps'
import DiagramShell from '../primitives/DiagramShell.vue'

const arrowId = useId()

const steps: DiagramStep[] = [
  {
    title: '发送消息入队',
    description:
      '工作线程或主线程通过 Handler.sendMessage() / post() 发送消息，内部调用 MessageQueue.enqueueMessage() 按执行时间戳 when 从小到大插入单链表。',
    highlightIds: ['handler', 'queue'],
  },
  {
    title: '唤醒阻塞线程',
    description:
      '若新消息位于队头或队列原为空处于阻塞休眠中，enqueueMessage() 调用 nativeWake() 向内核写入信号（Android 6.0 前用 pipe 管道，6.0+ 切换为更轻量的 eventfd）。',
    highlightIds: ['queue', 'epoll'],
  },
  {
    title: 'epoll 休眠与唤醒',
    description:
      'Looper.loop() 调用 queue.next()；无可执行消息时执行 nativePollOnce() 在 Linux epoll_wait 中挂起休眠并让出 CPU 时间片，因此主线程死循环不会空转消耗 CPU，也不会引发 ANR。',
    highlightIds: ['epoll', 'looper'],
  },
  {
    title: '目标 Handler 回调',
    description:
      '被唤醒或到达延时时间后，next() 取出队头 Message，Looper 将其分发给 msg.target.dispatchMessage(msg)，依次判断 Callback、mCallback 或重写 handleMessage()，最终 recycleUnchecked() 回收复用。',
    highlightIds: ['looper', 'dispatch'],
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
    title="Handler / Looper / MessageQueue 与 epoll 休眠唤醒"
    subtitle="点击步骤切换观察消息入队、Linux 内核态休眠让出 CPU 与主线程分发全流程"
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
      viewBox="0 0 640 300"
      class="mx-auto w-full min-w-[540px] max-w-[640px]"
      role="img"
      aria-label="Handler Looper MessageQueue 与 epoll 交互图"
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

      <!-- Divider Java / Native -->
      <line
        x1="20"
        y1="175"
        x2="620"
        y2="175"
        stroke="var(--border-strong)"
        stroke-dasharray="6 4"
        stroke-width="1.5"
      />
      <text x="26" y="165" font-size="12" fill="var(--diagram-muted)">Java 层 (ThreadLocal 绑定线程)</text>
      <text x="26" y="196" font-size="12" fill="var(--diagram-muted)">Native C++ / Linux 内核层</text>

      <!-- Handler Box -->
      <rect
        x="28"
        y="36"
        width="145"
        height="88"
        rx="12"
        :fill="isActive('handler') ? 'var(--domain-accent-soft)' : 'var(--diagram-surface)'"
        :stroke="isActive('handler') ? 'var(--domain-accent)' : 'var(--diagram-stroke)'"
        :stroke-width="isActive('handler') ? 2.5 : 1.5"
      />
      <text x="100" y="68" text-anchor="middle" font-size="15" font-weight="700" fill="var(--text-primary)">
        Handler
      </text>
      <text x="100" y="90" text-anchor="middle" font-size="12" fill="var(--text-secondary)">
        sendMessage()
      </text>
      <text x="100" y="108" text-anchor="middle" font-size="12" fill="var(--text-secondary)">
        post(Runnable)
      </text>

      <!-- MessageQueue Box -->
      <rect
        x="238"
        y="36"
        width="168"
        height="88"
        rx="12"
        :fill="isActive('queue') ? 'var(--domain-accent-soft)' : 'var(--diagram-surface)'"
        :stroke="isActive('queue') ? 'var(--domain-accent)' : 'var(--diagram-stroke)'"
        :stroke-width="isActive('queue') ? 2.5 : 1.5"
      />
      <text x="322" y="66" text-anchor="middle" font-size="15" font-weight="700" fill="var(--text-primary)">
        MessageQueue
      </text>
      <text x="322" y="88" text-anchor="middle" font-size="12" fill="var(--text-secondary)">
        按 when 排序单链表
      </text>
      <text x="322" y="106" text-anchor="middle" font-size="12" fill="var(--text-secondary)">
        next() / enqueue()
      </text>

      <!-- Looper Box -->
      <rect
        x="466"
        y="36"
        width="148"
        height="88"
        rx="12"
        :fill="isActive('looper') || isActive('dispatch') ? 'var(--domain-accent-soft)' : 'var(--diagram-surface)'"
        :stroke="isActive('looper') || isActive('dispatch') ? 'var(--domain-accent)' : 'var(--diagram-stroke)'"
        :stroke-width="isActive('looper') || isActive('dispatch') ? 2.5 : 1.5"
      />
      <text x="540" y="66" text-anchor="middle" font-size="15" font-weight="700" fill="var(--text-primary)">
        Looper.loop()
      </text>
      <text x="540" y="88" text-anchor="middle" font-size="12" fill="var(--text-secondary)">
        msg.target.dispatch
      </text>
      <text x="540" y="106" text-anchor="middle" font-size="12" fill="var(--text-secondary)">
        recycleUnchecked()
      </text>

      <!-- Epoll Box -->
      <rect
        x="198"
        y="212"
        width="248"
        height="72"
        rx="12"
        :fill="isActive('epoll') ? 'var(--domain-accent-soft)' : 'var(--diagram-surface)'"
        :stroke="isActive('epoll') ? 'var(--domain-accent)' : 'var(--diagram-stroke)'"
        :stroke-width="isActive('epoll') ? 2.5 : 1.5"
      />
      <text x="322" y="242" text-anchor="middle" font-size="15" font-weight="700" fill="var(--text-primary)">
        Linux epoll (eventfd / pipe)
      </text>
      <text x="322" y="264" text-anchor="middle" font-size="12" fill="var(--text-secondary)">
        nativePollOnce() 挂起休眠 ↔ nativeWake() 唤醒
      </text>

      <!-- Arrows -->
      <line
        x1="173"
        y1="80"
        x2="232"
        y2="80"
        stroke="var(--diagram-stroke)"
        stroke-width="2"
        :marker-end="`url(#${arrowId})`"
      />
      <line
        x1="406"
        y1="80"
        x2="460"
        y2="80"
        stroke="var(--diagram-stroke)"
        stroke-width="2"
        :marker-end="`url(#${arrowId})`"
      />
      <line
        x1="286"
        y1="124"
        x2="286"
        y2="206"
        stroke="var(--diagram-stroke)"
        stroke-width="2"
        :marker-end="`url(#${arrowId})`"
      />
      <line
        x1="358"
        y1="212"
        x2="358"
        y2="130"
        stroke="var(--domain-accent)"
        stroke-width="2"
        :marker-end="`url(#${arrowId})`"
      />
    </svg>
  </DiagramShell>
</template>
