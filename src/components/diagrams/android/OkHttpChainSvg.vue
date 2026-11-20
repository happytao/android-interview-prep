<script setup lang="ts">
import { useId } from 'vue'
import { useDiagramSteps, type DiagramStep } from '@/composables/useDiagramSteps'
import DiagramShell from '../primitives/DiagramShell.vue'

const arrowId = useId()

const steps: DiagramStep[] = [
  {
    title: '应用拦截器 (addInterceptor)',
    description:
      '位于责任链最前端，每次请求仅执行一次（即使发生重定向/重试）；适合统一注入公共请求头、Token 刷新、日志脱敏与全局加密签名。',
    highlightIds: ['app', 'retry'],
  },
  {
    title: 'RetryAndFollowUp + Bridge + Cache',
    description:
      'Retry 负责失败重试与 3xx 重定向；Bridge 补全 Content-Length/Cookie/Gzip 协议头；CacheInterceptor 根据 Cache-Control 决定直接命中本地缓存还是发送网络验证。',
    highlightIds: ['retry', 'bridge', 'cache'],
  },
  {
    title: 'Connect 与网络拦截器 (addNetworkInterceptor)',
    description:
      'ConnectInterceptor 从 RealConnectionPool 复用或创建 TCP/TLS 连接并获取 HttpCodec；随后触发 NetworkInterceptor，可观察到真实网络帧、重定向中间响应与 IP 细节。',
    highlightIds: ['connect', 'network'],
  },
  {
    title: 'CallServer 请求收发与逆向回溯',
    description:
      'CallServerInterceptor 通过 Okio Sink/Source 写入请求并读取响应流；随后 Response 沿责任链逆序逐层返回，各拦截器依次完成解密、写缓存与回调。',
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
    title="OkHttp 五大内置拦截器与自定义挂载点责任链"
    subtitle="清晰区分 addInterceptor 与 addNetworkInterceptor 的执行时机和重试次数差异"
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
      viewBox="0 0 640 280"
      class="mx-auto w-full max-w-[640px]"
      role="img"
      aria-label="OkHttp 拦截器责任链流程图"
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

      <!-- Row 1: App -> Retry -> Bridge -> Cache -->
      <rect
        x="16"
        y="34"
        width="128"
        height="66"
        rx="10"
        :fill="isActive('app') ? 'var(--domain-accent-soft)' : 'var(--diagram-surface)'"
        :stroke="isActive('app') ? 'var(--domain-accent)' : 'var(--diagram-stroke)'"
        :stroke-width="isActive('app') ? 2.5 : 1.5"
      />
      <text x="80" y="62" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text-primary)">
        App 拦截器
      </text>
      <text x="80" y="82" text-anchor="middle" font-size="11" fill="var(--text-secondary)">
        addInterceptor()
      </text>

      <rect
        x="174"
        y="34"
        width="134"
        height="66"
        rx="10"
        :fill="isActive('retry') ? 'var(--domain-accent-soft)' : 'var(--diagram-surface)'"
        :stroke="isActive('retry') ? 'var(--domain-accent)' : 'var(--diagram-stroke)'"
        :stroke-width="isActive('retry') ? 2.5 : 1.5"
      />
      <text x="241" y="62" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text-primary)">
        1. RetryFollowUp
      </text>
      <text x="241" y="82" text-anchor="middle" font-size="11" fill="var(--text-secondary)">
        重试与重定向
      </text>

      <rect
        x="338"
        y="34"
        width="124"
        height="66"
        rx="10"
        :fill="isActive('bridge') ? 'var(--domain-accent-soft)' : 'var(--diagram-surface)'"
        :stroke="isActive('bridge') ? 'var(--domain-accent)' : 'var(--diagram-stroke)'"
        :stroke-width="isActive('bridge') ? 2.5 : 1.5"
      />
      <text x="400" y="62" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text-primary)">
        2. Bridge
      </text>
      <text x="400" y="82" text-anchor="middle" font-size="11" fill="var(--text-secondary)">
        Cookie/Header/Gzip
      </text>

      <rect
        x="492"
        y="34"
        width="130"
        height="66"
        rx="10"
        :fill="isActive('cache') ? 'var(--domain-accent-soft)' : 'var(--diagram-surface)'"
        :stroke="isActive('cache') ? 'var(--domain-accent)' : 'var(--diagram-stroke)'"
        :stroke-width="isActive('cache') ? 2.5 : 1.5"
      />
      <text x="557" y="62" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text-primary)">
        3. Cache
      </text>
      <text x="557" y="82" text-anchor="middle" font-size="11" fill="var(--text-secondary)">
        HTTP 缓存读写
      </text>

      <!-- Row 2: CallServer <- Network <- Connect -->
      <rect
        x="412"
        y="174"
        width="210"
        height="72"
        rx="10"
        :fill="isActive('connect') ? 'var(--domain-accent-soft)' : 'var(--diagram-surface)'"
        :stroke="isActive('connect') ? 'var(--domain-accent)' : 'var(--diagram-stroke)'"
        :stroke-width="isActive('connect') ? 2.5 : 1.5"
      />
      <text x="517" y="204" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text-primary)">
        4. ConnectInterceptor
      </text>
      <text x="517" y="226" text-anchor="middle" font-size="11" fill="var(--text-secondary)">
        连接池复用 / 建立 Socket+TLS
      </text>

      <rect
        x="212"
        y="174"
        width="166"
        height="72"
        rx="10"
        :fill="isActive('network') ? 'var(--domain-accent-soft)' : 'var(--diagram-surface)'"
        :stroke="isActive('network') ? 'var(--domain-accent)' : 'var(--diagram-stroke)'"
        :stroke-width="isActive('network') ? 2.5 : 1.5"
      />
      <text x="295" y="204" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text-primary)">
        Network 拦截器
      </text>
      <text x="295" y="226" text-anchor="middle" font-size="11" fill="var(--text-secondary)">
        每次真实网络调用均触发
      </text>

      <rect
        x="16"
        y="174"
        width="162"
        height="72"
        rx="10"
        :fill="isActive('server') ? 'var(--domain-accent-soft)' : 'var(--diagram-surface)'"
        :stroke="isActive('server') ? 'var(--domain-accent)' : 'var(--diagram-stroke)'"
        :stroke-width="isActive('server') ? 2.5 : 1.5"
      />
      <text x="97" y="204" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text-primary)">
        5. CallServer
      </text>
      <text x="97" y="226" text-anchor="middle" font-size="11" fill="var(--text-secondary)">
        Okio 读写 HTTP 报文
      </text>

      <!-- Chain Connectors -->
      <line x1="144" y1="67" x2="168" y2="67" stroke="var(--diagram-stroke)" stroke-width="2" :marker-end="`url(#${arrowId})`" />
      <line x1="308" y1="67" x2="332" y2="67" stroke="var(--diagram-stroke)" stroke-width="2" :marker-end="`url(#${arrowId})`" />
      <line x1="462" y1="67" x2="486" y2="67" stroke="var(--diagram-stroke)" stroke-width="2" :marker-end="`url(#${arrowId})`" />
      <line x1="557" y1="100" x2="557" y2="168" stroke="var(--domain-accent)" stroke-width="2.2" :marker-end="`url(#${arrowId})`" />
      <line x1="412" y1="210" x2="384" y2="210" stroke="var(--diagram-stroke)" stroke-width="2" :marker-end="`url(#${arrowId})`" />
      <line x1="212" y1="210" x2="184" y2="210" stroke="var(--diagram-stroke)" stroke-width="2" :marker-end="`url(#${arrowId})`" />
    </svg>
  </DiagramShell>
</template>
