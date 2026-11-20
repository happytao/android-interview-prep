<script setup lang="ts">
import { useId } from 'vue'
import { useDiagramSteps, type DiagramStep } from '@/composables/useDiagramSteps'
import DiagramShell from '../primitives/DiagramShell.vue'

const arrowId = useId()

const steps: DiagramStep[] = [
  {
    title: '初始化 mmap 内存映射',
    description:
      'Server 进程打开 /dev/binder 时调用 mmap()（上限 1MB - 8KB），Binder 驱动在内核虚拟空间分配页框，并同时映射到 Server 用户空间，建立共享物理页。',
    highlightIds: ['kernel', 'server', 'physical'],
  },
  {
    title: 'Client 发起跨进程传输',
    description:
      'Client 进程（Proxy）通过 transact() 将序列化数据写入 Parcel，触发 ioctl(BINDER_WRITE_READ) 系统调用陷入内核态。',
    highlightIds: ['client', 'kernel'],
  },
  {
    title: '唯一 1 次数据拷贝',
    description:
      'Binder 驱动调用 copy_from_user() 将 Client 用户空间的数据直接拷贝到共享的内核缓冲区；因为 Server 用户空间已通过 mmap 映射同一物理页，无需第二次拷贝！',
    highlightIds: ['kernel', 'physical', 'server'],
  },
  {
    title: 'Server Stub 零拷贝直读',
    description:
      'Server 线程池唤醒后，Stub 直接从映射好的虚拟地址读取 Parcel 参数执行业务逻辑并返回结果，相比传统 Pipe/Socket 的 2 次拷贝性能翻倍且携带不可伪造的 UID/PID。',
    highlightIds: ['server'],
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
    title="Binder IPC mmap 一次拷贝原理"
    subtitle="对比传统 IPC 两次拷贝，理解虚拟地址映射到同一物理内存页的关键设计"
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
      viewBox="0 0 640 306"
      class="mx-auto w-full min-w-[540px] max-w-[640px]"
      role="img"
      aria-label="Binder mmap 一次拷贝内存映射图"
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

      <!-- Client Process -->
      <rect
        x="24"
        y="30"
        width="176"
        height="110"
        rx="12"
        :fill="isActive('client') ? 'var(--domain-accent-soft)' : 'var(--diagram-surface)'"
        :stroke="isActive('client') ? 'var(--domain-accent)' : 'var(--diagram-stroke)'"
        :stroke-width="isActive('client') ? 2.5 : 1.5"
      />
      <text x="112" y="60" text-anchor="middle" font-size="15" font-weight="700" fill="var(--text-primary)">
        Client 进程
      </text>
      <text x="112" y="84" text-anchor="middle" font-size="12" fill="var(--text-secondary)">
        Proxy / Parcel 数据
      </text>
      <text x="112" y="106" text-anchor="middle" font-size="12" fill="var(--text-secondary)">
        ioctl(BINDER_WRITE)
      </text>

      <!-- Server Process -->
      <rect
        x="440"
        y="30"
        width="176"
        height="110"
        rx="12"
        :fill="isActive('server') ? 'var(--domain-accent-soft)' : 'var(--diagram-surface)'"
        :stroke="isActive('server') ? 'var(--domain-accent)' : 'var(--diagram-stroke)'"
        :stroke-width="isActive('server') ? 2.5 : 1.5"
      />
      <text x="528" y="60" text-anchor="middle" font-size="15" font-weight="700" fill="var(--text-primary)">
        Server 进程
      </text>
      <text x="528" y="84" text-anchor="middle" font-size="12" fill="var(--text-secondary)">
        mmap 接收映射区
      </text>
      <text x="528" y="106" text-anchor="middle" font-size="12" fill="var(--text-secondary)">
        Stub 零拷贝直读
      </text>

      <!-- Kernel Space -->
      <rect
        x="212"
        y="168"
        width="216"
        height="58"
        rx="10"
        :fill="isActive('kernel') ? 'var(--domain-accent-soft)' : 'var(--diagram-surface)'"
        :stroke="isActive('kernel') ? 'var(--domain-accent)' : 'var(--diagram-stroke)'"
        :stroke-width="isActive('kernel') ? 2.5 : 1.5"
      />
      <text x="320" y="194" text-anchor="middle" font-size="14" font-weight="700" fill="var(--text-primary)">
        内核空间 · Binder 驱动
      </text>
      <text x="320" y="214" text-anchor="middle" font-size="12" fill="var(--text-secondary)">
        1 次 copy_from_user()
      </text>

      <!-- Physical Page -->
      <rect
        x="212"
        y="240"
        width="216"
        height="44"
        rx="10"
        :fill="isActive('physical') ? 'var(--domain-accent-soft)' : 'var(--diagram-surface)'"
        :stroke="isActive('physical') ? 'var(--domain-accent)' : 'var(--diagram-stroke)'"
        :stroke-width="isActive('physical') ? 2.5 : 1.5"
      />
      <text x="320" y="267" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text-primary)">
        共享物理内存页 (最大 1MB - 8KB)
      </text>

      <!-- Arrows -->
      <path
        d="M 112 140 L 112 197 L 206 197"
        fill="none"
        stroke="var(--domain-accent)"
        stroke-width="2.2"
        :marker-end="`url(#${arrowId})`"
      />
      <text x="115" y="218" font-size="12" font-weight="600" fill="var(--domain-accent)">1 次拷贝</text>

      <path
        d="M 428 262 L 528 262 L 528 146"
        fill="none"
        stroke="var(--diagram-stroke)"
        stroke-width="2"
        stroke-dasharray="5 4"
        :marker-end="`url(#${arrowId})`"
      />
      <text x="528" y="284" text-anchor="middle" font-size="12" fill="var(--text-secondary)">
        mmap 同页映射 (0 拷贝)
      </text>
    </svg>
  </DiagramShell>
</template>
