<script setup lang="ts">
import { ChevronDown, ChevronRight } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useStudyStore } from '@/stores/studyStore'
import type { CategoryNode, QuestionSummary } from '@/types/interview'

const props = defineProps<{
  domainId: string
  categories: CategoryNode[]
  activeSlug?: string
}>()

const emit = defineEmits<{
  (e: 'select', question: QuestionSummary): void
}>()

const studyStore = useStudyStore()
const expandedL1 = ref<Set<string>>(new Set())
const filterMode = ref<'all' | 'must-know' | 'reviewing' | 'bookmarked'>('all')
const dueSet = computed(() => new Set(studyStore.dueReviewIds))

// Auto-expand L1 containing activeSlug (or first L1 by default)
watch(
  [() => props.categories, () => props.activeSlug],
  ([cats, slug]) => {
    if (slug) {
      for (const cat of cats) {
        if (cat.subcategories.some((s) => s.questions.some((q) => q.slug === slug))) {
          expandedL1.value.add(cat.id)
          return
        }
      }
    }
    if (expandedL1.value.size === 0 && cats[0]) {
      expandedL1.value.add(cats[0].id)
    }
  },
  { immediate: true },
)

const toggleL1 = (id: string) => {
  if (expandedL1.value.has(id)) {
    expandedL1.value.delete(id)
  } else {
    expandedL1.value.add(id)
  }
}

const matchesFilter = (q: QuestionSummary): boolean => {
  if (filterMode.value === 'all') return true
  if (filterMode.value === 'must-know') return q.priority === 'must-know'
  if (filterMode.value === 'reviewing') {
    return studyStore.getStatus(q.id) === 'reviewing' || dueSet.value.has(q.id)
  }
  return studyStore.isBookmarked(q.id)
}

const categoryHasMatches = (cat: CategoryNode): boolean =>
  cat.subcategories.some((sub) => sub.questions.some(matchesFilter))

const categoryStats = (cat: CategoryNode) => {
  let total = 0
  let mastered = 0
  for (const sub of cat.subcategories) {
    for (const q of sub.questions) {
      total += 1
      if (studyStore.getStatus(q.id) === 'mastered') mastered += 1
    }
  }
  return { total, mastered }
}

const statusDotClass = (id: string) => {
  const s = studyStore.getStatus(id)
  if (s === 'mastered') return 'bg-[var(--domain-accent)]'
  if (s === 'reviewing') return 'bg-amber-500'
  return 'bg-zinc-300 dark:bg-zinc-700'
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Minimal Segmented Filter -->
    <div
      class="grid grid-cols-4 gap-0.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] p-0.5 text-[11px]"
    >
      <button
        v-for="f in [
          { id: 'all', label: '全部' },
          { id: 'must-know', label: '必考' },
          { id: 'reviewing', label: '待复习' },
          { id: 'bookmarked', label: '收藏' },
        ]"
        :key="f.id"
        type="button"
        class="rounded py-1 font-medium transition"
        :class="
          filterMode === f.id
            ? 'border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)]'
            : 'border border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
        "
        @click="filterMode = f.id as typeof filterMode"
      >
        {{ f.label }}
      </button>
    </div>

    <!-- Flat Divided Sidebar Tree -->
    <nav class="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]" aria-label="知识分类目录">
      <div
        v-if="!categories.some(categoryHasMatches)"
        class="px-2 py-6 text-center text-xs text-[var(--text-muted)]"
      >
        当前筛选下暂无匹配题目
      </div>

      <div
        v-for="cat in categories"
        :key="cat.id"
        v-show="categoryHasMatches(cat)"
      >
        <button
          type="button"
          class="flex w-full items-center justify-between gap-2 px-1.5 py-2.5 text-left transition-colors hover:bg-[var(--bg-hover)]"
          @click="toggleL1(cat.id)"
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="font-mono text-[11px] tabular-nums text-[var(--text-muted)]">
                {{ String(cat.order).padStart(2, '0') }}
              </span>
              <span class="truncate text-xs font-semibold text-[var(--text-primary)]">
                {{ cat.name }}
              </span>
            </div>
            <div class="mt-1.5 flex items-center gap-2">
              <div class="h-0.5 flex-1 overflow-hidden bg-[var(--bg-surface-muted)]">
                <div
                  class="h-full bg-[var(--domain-accent)] transition-all duration-300"
                  :style="{
                    width: `${categoryStats(cat).total ? (categoryStats(cat).mastered / categoryStats(cat).total) * 100 : 0}%`,
                  }"
                />
              </div>
              <span class="font-mono text-[10px] tabular-nums text-[var(--text-muted)]">
                {{ categoryStats(cat).mastered }}/{{ categoryStats(cat).total }}
              </span>
            </div>
          </div>
          <ChevronDown
            v-if="expandedL1.has(cat.id) || filterMode !== 'all'"
            class="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]"
          />
          <ChevronRight v-else class="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
        </button>

        <div
          v-if="expandedL1.has(cat.id) || filterMode !== 'all'"
          class="border-t border-[var(--border-subtle)] py-1.5 pl-1"
        >
          <div
            v-for="sub in cat.subcategories"
            :key="sub.id"
            class="mb-2 last:mb-0"
          >
            <template v-if="sub.questions.some(matchesFilter)">
              <div
                class="px-2 py-1 font-mono text-[10px] font-medium tracking-wide text-[var(--text-muted)]"
              >
                {{ String(cat.order).padStart(2, '0') }}-{{ String(sub.order).padStart(2, '0') }} · {{ sub.name }}
              </div>
              <ul class="mt-0.5 space-y-0.5">
                <li
                  v-for="q in sub.questions.filter(matchesFilter)"
                  :key="q.id"
                >
                  <button
                    type="button"
                    class="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors"
                    :class="
                      activeSlug === q.slug
                        ? 'bg-[var(--bg-surface-muted)] font-semibold text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                    "
                    @click="emit('select', q)"
                  >
                    <span
                      class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      :class="statusDotClass(q.id)"
                    />
                    <span class="min-w-0 flex-1 leading-snug">{{ q.title }}</span>
                  </button>
                </li>
              </ul>
            </template>
          </div>
        </div>
      </div>
    </nav>
  </div>
</template>
