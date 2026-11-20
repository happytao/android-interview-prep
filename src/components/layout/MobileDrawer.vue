<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { onUnmounted, watch } from 'vue'
import type { CategoryNode, QuestionSummary } from '@/types/interview'
import CategoryTree from './CategoryTree.vue'

const props = defineProps<{
  open: boolean
  domainId: string
  domainName: string
  categories: CategoryNode[]
  activeSlug?: string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'select', question: QuestionSummary): void
}>()

const close = () => emit('update:open', false)

watch(
  () => props.open,
  (isOpen) => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.overflow = isOpen ? 'hidden' : ''
    }
  },
)

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.documentElement.style.overflow = ''
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-40 flex flex-col justify-end bg-black/50 backdrop-blur-xs md:flex-row md:justify-start lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="题目目录"
      @click.self="close"
    >
      <aside
        class="flex max-h-[82vh] w-full flex-col rounded-t-2xl border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl md:h-full md:max-h-none md:w-80 md:rounded-none md:border-t-0 md:border-r"
      >
        <div class="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
          <div>
            <div class="text-sm font-bold text-[var(--text-primary)]">{{ domainName }} · 知识目录</div>
            <div class="text-[11px] text-[var(--text-muted)]">点击任一题目快速跳转</div>
          </div>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--bg-surface-muted)] text-[var(--text-primary)]"
            aria-label="关闭目录"
            @click="close"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-3 pb-8">
          <CategoryTree
            :domain-id="domainId"
            :categories="categories"
            :active-slug="activeSlug"
            @select="
              (q) => {
                emit('select', q)
                close()
              }
            "
          />
        </div>
      </aside>
    </div>
  </Teleport>
</template>
