<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { onUnmounted, toRef, watch } from 'vue'
import { useScrollLock } from '@/composables/useScrollLock'
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
useScrollLock(toRef(props, 'open'))

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.open) {
    close()
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (typeof window === 'undefined') return
    if (isOpen) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  },
)

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeydown)
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-40 flex flex-col justify-end bg-black/45 backdrop-blur-xs md:flex-row md:justify-start lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="题目目录"
      @click.self="close"
    >
      <aside
        class="flex max-h-[82vh] w-full flex-col rounded-t-[20px] border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl md:h-full md:max-h-none md:w-80 md:rounded-none md:border-t-0 md:border-r"
      >
        <div class="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3.5">
          <div>
            <div class="text-sm font-semibold text-[var(--text-primary)]">{{ domainName }} · 知识目录</div>
            <div class="text-[11px] text-[var(--text-muted)]">点击任一题目快速跳转</div>
          </div>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--bg-surface-muted)] text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)]"
            aria-label="关闭目录"
            @click="close"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-3.5 pb-8">
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
