<script setup lang="ts">
import { ArrowRight, Search, Sparkles, X } from 'lucide-vue-next'
import { computed, nextTick, onUnmounted, ref, toRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useScrollLock } from '@/composables/useScrollLock'
import { useSearch, type SearchHit } from '@/composables/useSearch'
import { allDomains, getDomainFlatQuestions } from '@/domains/registry'
import { useStudyStore } from '@/stores/studyStore'
import type { Priority } from '@/types/interview'
import { extractHighlightFragments } from '@/utils/tokenizer'
import PriorityBadge from './PriorityBadge.vue'

const props = defineProps<{
  open: boolean
  activeDomain: string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

useScrollLock(toRef(props, 'open'))

const router = useRouter()
const studyStore = useStudyStore()
const { warmup, searchQuestions } = useSearch()

const inputRef = ref<HTMLInputElement | null>(null)
const query = ref('')
const domainFilter = ref<string | 'all'>('all')
const priorityFilter = ref<Priority | 'all'>('all')
const hits = ref<SearchHit[]>([])
const activeIndex = ref(0)
const isSearching = ref(false)

const activeDomains = computed(() => allDomains.filter((d) => d.config.status === 'active'))

const defaultSuggestions = computed(() => {
  const list = getDomainFlatQuestions(
    domainFilter.value === 'all' ? props.activeDomain : domainFilter.value,
  )
  if (priorityFilter.value === 'all') {
    return list.filter((q) => q.priority === 'must-know').slice(0, 8)
  }
  return list.filter((q) => q.priority === priorityFilter.value).slice(0, 10)
})

const fragments = computed(() => extractHighlightFragments(query.value))

function splitHighlighted(text: string): Array<{ text: string; hit: boolean }> {
  const frags = fragments.value
  if (frags.length === 0 || !text) return [{ text, hit: false }]
  const escaped = frags.map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = text.split(re)
  return parts
    .filter((p) => p.length > 0)
    .map((p) => ({
      text: p,
      hit: frags.some((f) => f.toLowerCase() === p.toLowerCase()),
    }))
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
let searchGen = 0

const runSearch = async () => {
  const trimmed = query.value.trim()
  const gen = ++searchGen
  if (!trimmed) {
    hits.value = []
    activeIndex.value = 0
    isSearching.value = false
    return
  }
  isSearching.value = true
  try {
    const results = await searchQuestions(trimmed, {
      domain: domainFilter.value,
      priority: priorityFilter.value,
    })
    if (gen === searchGen) {
      hits.value = results
      activeIndex.value = 0
    }
  } finally {
    if (gen === searchGen) {
      isSearching.value = false
    }
  }
}

watch([query, domainFilter, priorityFilter], () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    void runSearch()
  }, 80)
})

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      void warmup()
      await nextTick()
      inputRef.value?.focus()
    }
  },
)

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer)
})

const visibleItems = computed(() =>
  query.value.trim()
    ? hits.value.map((h) => h.question)
    : defaultSuggestions.value,
)

const close = () => emit('update:open', false)

const navigateTo = (domain: string, slug: string) => {
  close()
  void router.push(`/${domain}/${slug}`)
}

const onKeydown = (e: KeyboardEvent) => {
  const count = visibleItems.value.length
  if (e.key === 'ArrowDown' && count > 0) {
    e.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % count
  } else if (e.key === 'ArrowUp' && count > 0) {
    e.preventDefault()
    activeIndex.value = (activeIndex.value - 1 + count) % count
  } else if (e.key === 'Enter' && count > 0) {
    e.preventDefault()
    const item = visibleItems.value[activeIndex.value]
    if (item) navigateTo(item.domain, item.slug)
  } else if (e.key === 'Escape') {
    close()
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-start justify-center bg-black/55 px-3 pt-12 pb-6 backdrop-blur-xs sm:pt-20"
      role="dialog"
      aria-modal="true"
      aria-label="全站搜索题目"
      @click.self="close"
    >
      <div
        class="flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl"
        @keydown="onKeydown"
      >
        <!-- Input Bar -->
        <div class="flex items-center gap-2.5 border-b border-[var(--border-subtle)] px-4 py-3">
          <Search class="h-5 w-5 shrink-0 text-[var(--domain-accent)]" />
          <input
            ref="inputRef"
            v-model="query"
            type="search"
            class="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none sm:text-base"
            placeholder="搜索面试题、关键词或源码机制（如：Handler内存泄漏、事件分发、OkHttp）"
            aria-label="搜索关键词"
          />
          <button
            v-if="query"
            type="button"
            class="shrink-0 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            @click="query = ''"
          >
            清空
          </button>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]"
            aria-label="关闭搜索"
            @click="close"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Filters -->
        <div
          class="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] px-4 py-2 text-xs"
        >
          <div class="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              class="rounded-md px-2 py-1 font-medium transition"
              :class="
                domainFilter === 'all'
                  ? 'bg-[var(--domain-accent)] text-[var(--domain-accent-fg)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              "
              @click="domainFilter = 'all'"
            >
              全部领域
            </button>
            <button
              v-for="d in activeDomains"
              :key="d.config.id"
              type="button"
              class="rounded-md px-2 py-1 font-medium transition"
              :class="
                domainFilter === d.config.id
                  ? 'bg-[var(--domain-accent)] text-[var(--domain-accent-fg)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              "
              @click="domainFilter = d.config.id"
            >
              {{ d.config.name }}
            </button>
          </div>

          <div class="flex items-center gap-1">
            <button
              v-for="opt in [
                { value: 'all', label: '不限级别' },
                { value: 'must-know', label: '高频必考' },
                { value: 'core', label: '核心常考' },
                { value: 'bonus', label: '中级加分' },
              ]"
              :key="opt.value"
              type="button"
              class="shrink-0 whitespace-nowrap rounded-md px-2 py-1 font-medium transition"
              :class="
                priorityFilter === opt.value
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              "
              @click="priorityFilter = opt.value as Priority | 'all'"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Results -->
        <div class="flex-1 overflow-y-auto p-2">
          <div
            v-if="!query.trim()"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--text-muted)]"
          >
            <Sparkles class="h-3.5 w-3.5 text-[var(--domain-accent)]" />
            <span>{{ priorityFilter === 'all' ? '高频必考直达' : '按重要度直达' }}（直接输入关键词过滤全部题目）</span>
          </div>

          <div
            v-else-if="hits[0]?.isRelaxedFallback"
            class="mx-2 mb-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300"
          >
            未找到全部关键词同时命中的题目，以下展示部分相关性匹配结果：
          </div>

          <div
            v-if="query.trim() && !isSearching && visibleItems.length === 0"
            class="py-12 text-center text-sm text-[var(--text-muted)]"
          >
            未找到匹配「{{ query }}」的题目，可尝试缩短或拆分关键词。
          </div>

          <ul v-else class="space-y-1">
            <li v-for="(item, idx) in visibleItems" :key="item.id">
              <button
                type="button"
                class="flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition"
                :class="
                  idx === activeIndex
                    ? 'bg-[var(--domain-accent-soft)]'
                    : 'hover:bg-[var(--bg-surface-muted)]'
                "
                @mouseenter="activeIndex = idx"
                @click="navigateTo(item.domain, item.slug)"
              >
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-xs text-[var(--text-muted)]">
                      {{ item.categoryName }} / {{ item.subcategoryName }}
                    </span>
                    <PriorityBadge
                      compact
                      :priority="item.priority"
                      :status="studyStore.getStatus(item.id)"
                    />
                  </div>
                  <div class="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                    <template v-for="(part, pIdx) in splitHighlighted(item.title)" :key="pIdx">
                      <mark
                        v-if="part.hit"
                        class="rounded bg-amber-300/60 px-0.5 text-[var(--text-primary)] dark:bg-amber-400/30"
                      >{{ part.text }}</mark>
                      <span v-else>{{ part.text }}</span>
                    </template>
                  </div>
                  <p class="mt-0.5 line-clamp-1 text-xs text-[var(--text-secondary)]">
                    {{ item.summary }}
                  </p>
                </div>
                <ArrowRight class="mt-2 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              </button>
            </li>
          </ul>
        </div>

        <footer
          class="hidden items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] px-4 py-2 text-[11px] text-[var(--text-muted)] sm:flex"
        >
          <span>↑↓ 选择 · Enter 打开 · Esc 关闭</span>
          <span>支持中英文混合 / 驼峰分词（如 OkHttp、事件分发）</span>
        </footer>
      </div>
    </div>
  </Teleport>
</template>
