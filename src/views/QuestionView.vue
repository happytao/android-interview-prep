<script setup lang="ts">
import {
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home,
  Sparkles,
} from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
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
let loadGen = 0

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

const loadQuestion = async () => {
  const currentGen = ++loadGen
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
})

const navigateTo = (target: QuestionSummary) => {
  void router.push(`/${target.domain}/${target.slug}`)
}

const setStudyStatus = (status: StudyStatus) => {
  if (question.value) {
    studyStore.setStatus(question.value.id, status)
  }
}
</script>

<template>
  <div class="relative">
    <!-- Top Reading Progress Bar -->
    <div class="fixed top-14 right-0 left-0 z-20 h-0.5 bg-transparent">
      <div
        class="h-full bg-[var(--domain-accent)] transition-[width] duration-150"
        :style="{ width: `${scrollProgress}%` }"
      />
    </div>

    <!-- Missing Question -->
    <main v-if="!question" class="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 class="text-xl font-bold text-[var(--text-primary)]">未找到对应面试题</h1>
      <p class="mt-2 text-sm text-[var(--text-secondary)]">
        路径 “{{ domainId }}/{{ slug }}” 不存在或已迁移。
      </p>
      <RouterLink
        to="/"
        class="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--domain-accent)] px-4 py-2 text-sm font-semibold text-[var(--domain-accent-fg)]"
      >
        <Home class="h-4 w-4" />
        <span>返回知识地图</span>
      </RouterLink>
    </main>

    <!-- 3-Column Workspace -->
    <div
      v-else
      class="mx-auto flex max-w-[1440px] gap-6 px-3 pt-5 pb-24 sm:px-5 lg:pb-14"
    >
      <!-- Left Desktop Sidebar -->
      <aside class="hidden w-72 shrink-0 lg:block">
        <div class="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
          <CategoryTree
            v-if="domainManifest"
            :domain-id="domainId"
            :categories="domainManifest.categories"
            :active-slug="question.slug"
            @select="navigateTo"
          />
        </div>
      </aside>

      <!-- Main Reading Column -->
      <main class="min-w-0 flex-1">
        <article class="mx-auto max-w-[74ch]">
          <!-- Breadcrumb -->
          <div class="flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <RouterLink :to="`/${domainId}`" class="hover:text-[var(--domain-accent)]">
              {{ domainManifest?.config.name ?? domainId }}
            </RouterLink>
            <span>/</span>
            <span>{{ question.categoryName }}</span>
            <span>/</span>
            <span class="font-medium text-[var(--text-secondary)]">{{ question.subcategoryName }}</span>
          </div>

          <!-- Header Card -->
          <header class="mt-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-xs sm:p-6">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <PriorityBadge
                :priority="question.priority"
                :status="studyStore.getStatus(question.id)"
              />
              <div class="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <span class="inline-flex items-center gap-1">
                  <Clock class="h-3.5 w-3.5" />
                  约 {{ question.estimatedMinutes }} 分钟
                </span>
                <span>·</span>
                <span class="font-mono">{{ adjacent.index + 1 }} / {{ adjacent.total }}</span>
              </div>
            </div>

            <h1 class="mt-3 text-xl leading-snug font-extrabold text-[var(--text-primary)] sm:text-2xl">
              {{ question.title }}
            </h1>
            <p
              v-if="!isSelfTestCollapsed"
              class="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]"
            >
              {{ question.summary }}
            </p>

            <!-- Keywords Strip (hidden when Self-Test mode collapses answer to avoid spoiling hints) -->
            <div
              v-if="!isSelfTestCollapsed"
              class="mt-3.5 flex flex-wrap items-center gap-1.5"
            >
              <Sparkles class="h-3.5 w-3.5 text-[var(--domain-accent)]" />
              <span
                v-for="kw in question.keywords"
                :key="kw"
                class="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] px-2 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]"
              >
                {{ kw }}
              </span>
            </div>

            <!-- Action Controls -->
            <div class="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3.5">
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="opt in [
                    { value: 'unlearned', label: '未学' },
                    { value: 'reviewing', label: '需复习' },
                    { value: 'mastered', label: '已掌握' },
                  ]"
                  :key="opt.value"
                  type="button"
                  class="min-h-8 rounded-lg border px-2.5 py-1 text-xs font-medium transition"
                  :class="
                    studyStore.getStatus(question.id) === opt.value
                      ? 'border-[var(--domain-accent)] bg-[var(--domain-accent-soft)] text-[var(--domain-accent)] font-semibold'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  "
                  @click="setStudyStatus(opt.value as StudyStatus)"
                >
                  {{ opt.label }}
                </button>
              </div>

              <button
                type="button"
                class="inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-medium transition"
                :class="
                  studyStore.isBookmarked(question.id)
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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
          <div v-if="isLoading" class="mt-6 space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
            <div class="h-5 w-1/3 animate-pulse rounded bg-[var(--bg-surface-muted)]" />
            <div class="h-4 w-full animate-pulse rounded bg-[var(--bg-surface-muted)]" />
            <div class="h-4 w-5/6 animate-pulse rounded bg-[var(--bg-surface-muted)]" />
            <div class="h-32 w-full animate-pulse rounded-xl bg-[var(--bg-surface-muted)]" />
          </div>

          <div
            v-else-if="loadError"
            class="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-700 dark:text-rose-300"
          >
            {{ loadError }}
          </div>

          <SelfTestPanel
            v-else-if="compiled"
            :question-id="question.id"
            :keywords="question.keywords"
            class="mt-6"
          >
            <div class="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-xs sm:p-7">
              <QuestionBody :key="compiled.id" :blocks="compiled.blocks" :title="question.title" />
              <ReferenceCards :references="compiled.references" />
            </div>
          </SelfTestPanel>

          <PersonalNotes :question-id="question.id" />

          <!-- Prev / Next Cards -->
          <nav class="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="上下题切换">
            <RouterLink
              v-if="adjacent.prev"
              :to="`/${adjacent.prev.domain}/${adjacent.prev.slug}`"
              class="group flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 transition hover:border-[var(--domain-accent)]"
            >
              <ChevronLeft class="h-5 w-5 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--domain-accent)]" />
              <div class="min-w-0">
                <div class="text-[11px] text-[var(--text-muted)]">上一题</div>
                <div class="truncate text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--domain-accent)]">
                  {{ adjacent.prev.title }}
                </div>
              </div>
            </RouterLink>
            <div v-else />

            <RouterLink
              v-if="adjacent.next"
              :to="`/${adjacent.next.domain}/${adjacent.next.slug}`"
              class="group flex items-center justify-end gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-right transition hover:border-[var(--domain-accent)]"
            >
              <div class="min-w-0">
                <div class="text-[11px] text-[var(--text-muted)]">下一题</div>
                <div class="truncate text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--domain-accent)]">
                  {{ adjacent.next.title }}
                </div>
              </div>
              <ChevronRight class="h-5 w-5 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--domain-accent)]" />
            </RouterLink>
          </nav>
        </article>
      </main>

      <!-- Right Desktop TOC Sidebar -->
      <aside class="hidden w-56 shrink-0 xl:block">
        <div class="sticky top-20 space-y-4">
          <div
            v-if="!isSelfTestCollapsed && compiled && compiled.toc.length > 0"
            class="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
          >
            <div class="text-xs font-bold tracking-wide text-[var(--text-primary)]">本页大纲</div>
            <ul class="mt-2.5 space-y-1.5 text-xs">
              <li
                v-for="h in compiled.toc"
                :key="h.id"
                :class="h.level === 3 ? 'pl-3' : ''"
              >
                <a
                  :href="`#${h.id}`"
                  class="block truncate py-0.5 text-[var(--text-secondary)] hover:text-[var(--domain-accent)]"
                >
                  {{ h.text }}
                </a>
              </li>
            </ul>
          </div>

          <div class="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-xs">
            <div class="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
              <CheckCircle2 class="h-4 w-4 text-[var(--domain-accent)]" />
              <span>复习小贴士</span>
            </div>
            <p class="mt-2 leading-relaxed text-[var(--text-secondary)]">
              中级岗位面试不看死记源码行数，先讲「为什么这样设计 + 核心链路」，再点出关键类与边界取舍即可拿高分。
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
