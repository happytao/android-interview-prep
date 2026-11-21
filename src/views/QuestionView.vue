<script setup lang="ts">
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home,
} from 'lucide-vue-next'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PriorityBadge from '@/components/common/PriorityBadge.vue'
import CategoryTree from '@/components/layout/CategoryTree.vue'
import MobileBottomBar from '@/components/layout/MobileBottomBar.vue'
import MobileDrawer from '@/components/layout/MobileDrawer.vue'
import PersonalNotes from '@/components/question/PersonalNotes.vue'
import QuestionBody from '@/components/question/QuestionBody.vue'
import ReferenceCards from '@/components/question/ReferenceCards.vue'
import SelfTestPanel from '@/components/question/SelfTestPanel.vue'
import { loadCompiledQuestion } from '@/domains/questionLoader'
import {
  findQuestionBySlugOrAlias,
  getAdjacentQuestions,
  getDomainManifest,
} from '@/domains/registry'
import { useStudyStore } from '@/stores/studyStore'
import type { CompiledQuestion, QuestionSummary, StudyStatus } from '@/types/interview'

const props = defineProps<{
  domainId: string
  slug: string
}>()

const router = useRouter()
const studyStore = useStudyStore()

const drawerOpen = ref(false)
const compiled = ref<CompiledQuestion | null>(null)
const isLoading = ref(true)
const loadError = ref<string | null>(null)
const scrollProgress = ref(0)
const activeHeadingId = ref<string>('')
let loadGen = 0
let tocObserver: IntersectionObserver | null = null

const domainManifest = computed(() => getDomainManifest(props.domainId))

const matchResult = computed(() => findQuestionBySlugOrAlias(props.domainId, props.slug))
const question = computed(() => matchResult.value?.question ?? null)
const isSelfTestCollapsed = computed(() =>
  Boolean(question.value && studyStore.state.selfTestMode && !studyStore.isRevealed(question.value.id)),
)

const adjacent = computed(() => {
  if (!question.value) return { prev: null, next: null, index: -1, total: 0 }
  return getAdjacentQuestions(props.domainId, question.value.id)
})

const setupTocObserver = async () => {
  tocObserver?.disconnect()
  tocObserver = null
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return
  if (isSelfTestCollapsed.value || !compiled.value || compiled.value.toc.length === 0) return

  await nextTick()
  const ids = compiled.value.toc.map((h) => h.id)
  if (ids.length > 0 && !activeHeadingId.value) {
    activeHeadingId.value = ids[0] ?? ''
  }

  const elements = ids
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => Boolean(el))
  if (elements.length === 0) return

  tocObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visible[0]?.target.id) {
        activeHeadingId.value = visible[0].target.id
      }
    },
    { rootMargin: '-80px 0px -65% 0px', threshold: 0 },
  )

  for (const el of elements) {
    tocObserver.observe(el)
  }
}

const loadQuestion = async () => {
  const currentGen = ++loadGen
  activeHeadingId.value = ''
  if (!matchResult.value) {
    isLoading.value = false
    compiled.value = null
    return
  }

  if (matchResult.value.isAliasRedirect) {
    void router.replace(`/${props.domainId}/${matchResult.value.question.slug}`)
    return
  }

  const target = matchResult.value.question
  studyStore.setLastVisited(target.id)
  if (typeof document !== 'undefined') {
    document.title = `${target.title} · 技术面试复习站`
  }

  isLoading.value = true
  loadError.value = null
  try {
    const loaded = await loadCompiledQuestion(target.sourcePath)
    if (currentGen !== loadGen) return
    compiled.value = loaded
    activeHeadingId.value = loaded.toc[0]?.id ?? ''
    void setupTocObserver()
  } catch (err) {
    if (currentGen !== loadGen) return
    loadError.value = err instanceof Error ? err.message : '题目加载失败'
  } finally {
    if (currentGen === loadGen) {
      isLoading.value = false
    }
  }
}

watch([() => props.domainId, () => props.slug], () => {
  void loadQuestion()
}, { immediate: true })

watch(isSelfTestCollapsed, (collapsed) => {
  if (!collapsed) {
    void setupTocObserver()
  }
})

const updateScrollProgress = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const docEl = document.documentElement
  const scrollable = docEl.scrollHeight - window.innerHeight
  if (scrollable <= 0) {
    scrollProgress.value = 0
    return
  }
  scrollProgress.value = Math.min(100, Math.max(0, Math.round((window.scrollY / scrollable) * 100)))
}

onMounted(() => {
  window.addEventListener('scroll', updateScrollProgress, { passive: true })
  updateScrollProgress()
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateScrollProgress)
  tocObserver?.disconnect()
  tocObserver = null
})

const navigateTo = (target: QuestionSummary) => {
  void router.push(`/${target.domain}/${target.slug}`)
}

const setStudyStatus = (status: StudyStatus) => {
  if (question.value) {
    studyStore.setStatus(question.value.id, status)
  }
}

const statusButtonClass = (value: StudyStatus, active: boolean) => {
  if (!active) {
    return 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
  }
  if (value === 'mastered') {
    return 'border-transparent bg-[var(--status-mastered)] text-white shadow-[0_1px_4px_rgba(30,142,62,0.28)]'
  }
  if (value === 'reviewing') {
    return 'border-transparent bg-[var(--status-reviewing)] text-white shadow-[0_1px_4px_rgba(217,119,6,0.28)]'
  }
  return 'border-transparent bg-[var(--brand-blue)] text-white shadow-[0_1px_4px_rgba(0,113,227,0.28)]'
}
</script>

<template>
  <div class="relative">
    <!-- Top 2px Tech-Blue Reading Progress Line -->
    <div class="fixed top-14 right-0 left-0 z-20 h-[2px] bg-transparent">
      <div
        class="h-full bg-[var(--brand-blue)] transition-[width] duration-150"
        :style="{ width: `${scrollProgress}%` }"
      />
    </div>

    <!-- Missing Question -->
    <main v-if="!question" class="mx-auto max-w-xl px-4 py-16 text-center">
      <div class="bento-card rounded-[20px] p-8">
        <h1 class="text-xl font-bold text-[var(--text-primary)]">未找到对应面试题</h1>
        <p class="mt-2 text-sm text-[var(--text-secondary)]">
          路径 “{{ domainId }}/{{ slug }}” 不存在或已迁移。
        </p>
        <RouterLink
          to="/"
          class="mt-6 inline-flex h-9 items-center gap-2 rounded-full bg-[var(--btn-primary-bg)] px-5 text-sm font-medium text-[var(--btn-primary-fg)] transition hover:bg-[var(--btn-primary-hover)]"
        >
          <Home class="h-4 w-4" />
          <span>返回知识地图</span>
        </RouterLink>
      </div>
    </main>

    <!-- 3-Column Android Developers Docs Workspace -->
    <div
      v-else
      class="mx-auto flex max-w-[1760px] gap-6 px-4 pt-6 pb-24 sm:px-6 lg:gap-8 lg:px-8 lg:pb-16"
    >
      <!-- Left Desktop Sidebar with Sleek Hover Scrollbar -->
      <aside class="hidden w-[300px] shrink-0 lg:block">
        <div class="sidebar-scroll sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
          <CategoryTree
            v-if="domainManifest"
            :domain-id="domainId"
            :categories="domainManifest.categories"
            :active-slug="question.slug"
            @select="navigateTo"
          />
        </div>
      </aside>

      <!-- Main Reading Paper Column -->
      <main class="min-w-0 flex-1">
        <article
          class="bento-card mx-auto max-w-[960px] rounded-[20px] px-5 py-6 sm:px-9 sm:py-8 lg:px-11 lg:py-10"
        >
          <!-- Breadcrumb -->
          <div class="flex flex-wrap items-center gap-1.5 font-mono text-xs text-[var(--text-muted)]">
            <RouterLink :to="`/${domainId}`" class="transition hover:text-[var(--brand-blue)]">
              {{ domainManifest?.config.name ?? domainId }}
            </RouterLink>
            <span>/</span>
            <span>{{ question.categoryName }}</span>
            <span>/</span>
            <span class="text-[var(--text-secondary)]">{{ question.subcategoryName }}</span>
          </div>

          <!-- Editorial Question Header -->
          <header class="mt-4 border-b border-[var(--border-subtle)] pb-6">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <PriorityBadge
                :priority="question.priority"
                :status="studyStore.getStatus(question.id)"
              />
              <div class="flex items-center gap-2 font-mono text-xs text-[var(--text-muted)]">
                <span class="inline-flex items-center gap-1">
                  <Clock class="h-3.5 w-3.5" />
                  约 {{ question.estimatedMinutes }} min
                </span>
                <span>·</span>
                <span class="tabular-nums">{{ adjacent.index + 1 }} / {{ adjacent.total }}</span>
              </div>
            </div>

            <h1 class="mt-4 text-2xl leading-snug font-bold tracking-tight text-[var(--text-primary)] sm:text-[30px]">
              {{ question.title }}
            </h1>

            <p
              v-if="!isSelfTestCollapsed"
              class="mt-3 text-sm leading-relaxed text-[var(--text-secondary)] sm:text-[15px]"
            >
              {{ question.summary }}
            </p>

            <!-- Keywords Pill Strip (hidden while Self-Test is collapsed) -->
            <div
              v-if="!isSelfTestCollapsed"
              class="mt-4 flex flex-wrap items-center gap-1.5"
            >
              <span
                v-for="kw in question.keywords"
                :key="kw"
                class="rounded-full bg-[var(--bg-surface-muted)] px-2.5 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]"
              >
                {{ kw }}
              </span>
            </div>

            <!-- Action Controls -->
            <div class="mt-5 flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="opt in [
                    { value: 'unlearned', label: '未学' },
                    { value: 'reviewing', label: '需复习' },
                    { value: 'mastered', label: '已掌握' },
                  ]"
                  :key="opt.value"
                  type="button"
                  class="h-8 rounded-[10px] border px-3 text-xs font-medium transition"
                  :class="statusButtonClass(opt.value as StudyStatus, studyStore.getStatus(question.id) === opt.value)"
                  @click="setStudyStatus(opt.value as StudyStatus)"
                >
                  {{ opt.label }}
                </button>
              </div>

              <button
                type="button"
                class="inline-flex h-8 items-center gap-1.5 rounded-[10px] border px-3 text-xs font-medium transition"
                :class="
                  studyStore.isBookmarked(question.id)
                    ? 'border-transparent bg-[var(--brand-blue-soft)] text-[var(--brand-blue-text)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                "
                @click="studyStore.toggleBookmark(question.id)"
              >
                <Bookmark
                  class="h-3.5 w-3.5"
                  :class="studyStore.isBookmarked(question.id) ? 'fill-current' : ''"
                />
                <span>{{ studyStore.isBookmarked(question.id) ? '已收藏' : '收藏本题' }}</span>
              </button>
            </div>
          </header>

          <!-- Body Area -->
          <div v-if="isLoading" class="mt-6 space-y-3 py-4">
            <div class="h-5 w-1/3 animate-pulse rounded-[8px] bg-[var(--bg-surface-muted)]" />
            <div class="h-4 w-full animate-pulse rounded-[8px] bg-[var(--bg-surface-muted)]" />
            <div class="h-4 w-5/6 animate-pulse rounded-[8px] bg-[var(--bg-surface-muted)]" />
            <div class="h-32 w-full animate-pulse rounded-[14px] bg-[var(--bg-surface-muted)]" />
          </div>

          <div
            v-else-if="loadError"
            class="mt-6 rounded-[14px] border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300"
          >
            {{ loadError }}
          </div>

          <SelfTestPanel
            v-else-if="compiled"
            :question-id="question.id"
            :keywords="question.keywords"
            :blocks="compiled.blocks"
            :references="compiled.references"
            :title="question.title"
            class="mt-6"
          >
            <QuestionBody :key="compiled.id" :blocks="compiled.blocks" :title="question.title" />
            <ReferenceCards :references="compiled.references" />
          </SelfTestPanel>

          <PersonalNotes :question-id="question.id" />

          <!-- Prev / Next Pagination -->
          <nav class="mt-10 grid grid-cols-1 gap-3 border-t border-[var(--border-subtle)] pt-6 sm:grid-cols-2" aria-label="上下题切换">
            <RouterLink
              v-if="adjacent.prev"
              :to="`/${adjacent.prev.domain}/${adjacent.prev.slug}`"
              class="group flex items-center gap-3 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)]/55 p-3.5 transition hover:border-[var(--brand-blue)]/40 hover:bg-[var(--bg-surface)]"
            >
              <ChevronLeft class="h-4 w-4 shrink-0 text-[var(--text-muted)] transition group-hover:-translate-x-0.5 group-hover:text-[var(--brand-blue)]" />
              <div class="min-w-0">
                <div class="font-mono text-[11px] text-[var(--text-muted)]">上一题</div>
                <div class="truncate text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--brand-blue)]">
                  {{ adjacent.prev.title }}
                </div>
              </div>
            </RouterLink>
            <div v-else />

            <RouterLink
              v-if="adjacent.next"
              :to="`/${adjacent.next.domain}/${adjacent.next.slug}`"
              class="group flex items-center justify-end gap-3 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)]/55 p-3.5 text-right transition hover:border-[var(--brand-blue)]/40 hover:bg-[var(--bg-surface)]"
            >
              <div class="min-w-0">
                <div class="font-mono text-[11px] text-[var(--text-muted)]">下一题</div>
                <div class="truncate text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--brand-blue)]">
                  {{ adjacent.next.title }}
                </div>
              </div>
              <ChevronRight class="h-4 w-4 shrink-0 text-[var(--text-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--brand-blue)]" />
            </RouterLink>
          </nav>
        </article>
      </main>

      <!-- Right Desktop Documentation Outline (ON THIS PAGE) -->
      <aside class="hidden w-60 shrink-0 xl:block">
        <div class="sticky top-20 space-y-6">
          <div v-if="!isSelfTestCollapsed && compiled && compiled.toc.length > 0">
            <div class="px-3 font-mono text-[11px] font-semibold tracking-wider text-[var(--text-muted)] uppercase">
              On this page
            </div>
            <ul class="mt-2.5 border-l border-[var(--border-subtle)] text-xs">
              <li
                v-for="h in compiled.toc"
                :key="h.id"
              >
                <a
                  :href="`#${h.id}`"
                  class="-ml-px block truncate border-l-2 py-1.5 pr-2 transition-colors"
                  :class="[
                    h.level === 3 ? 'pl-6' : 'pl-3.5',
                    activeHeadingId === h.id
                      ? 'border-[var(--brand-blue)] font-semibold text-[var(--brand-blue)]'
                      : 'border-transparent text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]',
                  ]"
                  @click="activeHeadingId = h.id"
                >
                  {{ h.text }}
                </a>
              </li>
            </ul>
          </div>

          <!-- Apple / Google Docs Callout Tip -->
          <div
            class="rounded-r-[12px] border-l-[3px] border-[var(--callout-border)] bg-[var(--callout-bg)] p-3.5 text-xs"
          >
            <div class="font-semibold text-[var(--text-primary)]">面试答题原则</div>
            <p class="mt-1.5 leading-relaxed text-[var(--text-secondary)]">
              先讲「为什么这样设计 + 核心链路」，再点出关键类与边界取舍，避免背诵式贴源码。
            </p>
          </div>
        </div>
      </aside>
    </div>

    <MobileDrawer
      v-if="domainManifest && question"
      v-model:open="drawerOpen"
      :domain-id="domainId"
      :domain-name="domainManifest.config.name"
      :categories="domainManifest.categories"
      :active-slug="question.slug"
      @select="navigateTo"
    />

    <MobileBottomBar
      v-if="question"
      :question-id="question.id"
      :prev="adjacent.prev"
      :next="adjacent.next"
      @open-drawer="drawerOpen = true"
      @navigate="navigateTo"
    />
  </div>
</template>
