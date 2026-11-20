<script setup lang="ts">
import { Check, Copy, Download, Globe, RotateCcw, Upload, X } from 'lucide-vue-next'
import { ref, watch } from 'vue'
import type { ImportParseResult } from '@/schemas/content'
import { useStudyStore } from '@/stores/studyStore'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const studyStore = useStudyStore()
const copied = ref(false)
const pasteText = ref('')
const importPreview = ref<ImportParseResult | null>(null)
const importError = ref<string | null>(null)
const importSuccess = ref<string | null>(null)
const confirmReset = ref(false)

watch(
  () => props.open,
  (isOpen) => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.overflow = isOpen ? 'hidden' : ''
    }
    if (!isOpen) {
      importPreview.value = null
      importError.value = null
      importSuccess.value = null
      confirmReset.value = false
    }
  },
)

const close = () => emit('update:open', false)

const downloadJson = () => {
  const json = studyStore.exportPayload()
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `interview-progress-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const copyJson = async () => {
  const json = studyStore.exportPayload()
  try {
    await navigator.clipboard.writeText(json)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    pasteText.value = json
  }
}

const inspectRawImport = (raw: string) => {
  importError.value = null
  importSuccess.value = null
  try {
    importPreview.value = studyStore.previewImport(raw)
  } catch (err) {
    importPreview.value = null
    importError.value = err instanceof Error ? err.message : 'JSON 解析或校验失败'
  }
}

const onFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    importError.value = '备份文件大小超过 2MB 上限'
    return
  }
  const text = await file.text()
  pasteText.value = text
  inspectRawImport(text)
  input.value = ''
}

const commitImport = (strategy: 'merge' | 'overwrite') => {
  if (!importPreview.value) return
  studyStore.applyImport(importPreview.value, strategy)
  importSuccess.value =
    strategy === 'merge'
      ? `已安全合并 ${importPreview.value.validRecordCount} 条学习记录与 ${importPreview.value.validNoteCount} 条笔记。`
      : `已覆盖恢复 ${importPreview.value.validRecordCount} 条学习记录。`
  importPreview.value = null
  pasteText.value = ''
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="学习数据备份与偏好设置"
      @click.self="close"
    >
      <div
        class="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xl"
      >
        <header class="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
          <div>
            <h2 class="text-base font-bold text-[var(--text-primary)]">学习备份与阅读设置</h2>
            <p class="mt-0.5 text-xs text-[var(--text-secondary)]">
              数据存储在本地浏览器（已请求持久化保护）；建议定期导出跨设备备份
            </p>
          </div>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]"
            aria-label="关闭设置"
            @click="close"
          >
            <X class="h-4 w-4" />
          </button>
        </header>

        <div class="mt-4 space-y-5">
          <!-- Reference Mirror Setting -->
          <section class="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] p-3.5">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-start gap-2.5">
                <Globe class="mt-0.5 h-4 w-4 shrink-0 text-[var(--domain-accent)]" />
                <div>
                  <div class="text-sm font-semibold text-[var(--text-primary)]">
                    Android 官方文档国内镜像
                  </div>
                  <p class="text-xs text-[var(--text-secondary)]">
                    开启后自动将参考卡片的 developer.android.com 链接转为 .google.cn 直连地址
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                :aria-checked="studyStore.state.useCnAndroidDocs"
                class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition"
                :class="studyStore.state.useCnAndroidDocs ? 'bg-[var(--domain-accent)]' : 'bg-[var(--border-strong)]'"
                @click="studyStore.setUseCnAndroidDocs(!studyStore.state.useCnAndroidDocs)"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition"
                  :class="studyStore.state.useCnAndroidDocs ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>
          </section>

          <!-- Export -->
          <section class="space-y-2.5">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-[var(--text-primary)]">导出进度与笔记</h3>
              <span class="text-xs text-[var(--text-muted)]">
                {{
                  studyStore.daysSinceBackup === null
                    ? '尚未备份'
                    : `上次备份：${studyStore.daysSinceBackup} 天前`
                }}
              </span>
            </div>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--domain-accent)] px-3.5 py-2 text-sm font-semibold text-[var(--domain-accent-fg)]"
                @click="downloadJson"
              >
                <Download class="h-4 w-4" />
                <span>下载 JSON 备份文件</span>
              </button>
              <button
                type="button"
                class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] hover:border-[var(--domain-accent)]"
                @click="copyJson"
              >
                <Check v-if="copied" class="h-4 w-4 text-emerald-500" />
                <Copy v-else class="h-4 w-4" />
                <span>{{ copied ? '已复制 JSON 到剪贴板' : '复制 JSON（手机跨端同步）' }}</span>
              </button>
            </div>
          </section>

          <!-- Import -->
          <section class="space-y-2.5">
            <h3 class="text-sm font-semibold text-[var(--text-primary)]">导入恢复（支持校验与合并预览）</h3>
            <div class="flex flex-wrap items-center gap-2">
              <label
                class="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--domain-accent)]"
              >
                <Upload class="h-3.5 w-3.5" />
                <span>选择 .json 文件</span>
                <input type="file" accept=".json,application/json" class="sr-only" @change="onFileChange" />
              </label>
              <button
                v-if="pasteText.trim()"
                type="button"
                class="min-h-9 rounded-lg bg-[var(--domain-accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--domain-accent)]"
                @click="inspectRawImport(pasteText)"
              >
                校验粘贴的 JSON
              </button>
            </div>

            <textarea
              v-model="pasteText"
              rows="3"
              placeholder="也可以直接粘贴从其他设备复制的备份 JSON 文本..."
              class="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2.5 font-mono text-xs text-[var(--text-primary)] focus:border-[var(--domain-accent)] focus:outline-none"
            />

            <div
              v-if="importError"
              class="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-600 dark:text-rose-300"
            >
              导入失败：{{ importError }}
            </div>

            <div
              v-if="importSuccess"
              class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-300"
            >
              {{ importSuccess }}
            </div>

            <div
              v-if="importPreview"
              class="space-y-2 rounded-xl border border-[var(--domain-accent)]/40 bg-[var(--domain-accent-soft)] p-3 text-xs"
            >
              <div class="font-semibold text-[var(--text-primary)]">
                校验通过：发现 {{ importPreview.validRecordCount }} 条学习进度、
                {{ importPreview.validBookmarkCount }} 个收藏、{{ importPreview.validNoteCount }} 条笔记。
              </div>
              <div v-if="importPreview.orphanedIds.length > 0" class="text-amber-700 dark:text-amber-300">
                注意：有 {{ importPreview.orphanedIds.length }} 个旧题目 ID 已不在当前题库中（{{
                  importPreview.orphanedIds.slice(0, 5).join(', ')
                }}），已自动跳过。
              </div>
              <div class="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  class="rounded-lg bg-[var(--domain-accent)] px-3 py-1.5 font-semibold text-[var(--domain-accent-fg)]"
                  @click="commitImport('merge')"
                >
                  智能合并到当前记录（推荐）
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 font-medium text-[var(--text-primary)]"
                  @click="commitImport('overwrite')"
                >
                  完全覆盖当前记录
                </button>
              </div>
            </div>
          </section>

          <!-- Danger zone -->
          <section class="border-t border-[var(--border-subtle)] pt-3">
            <div v-if="!confirmReset" class="flex items-center justify-between">
              <span class="text-xs text-[var(--text-muted)]">清空本地掌握记录与笔记</span>
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                @click="confirmReset = true"
              >
                <RotateCcw class="h-3.5 w-3.5" />
                <span>重置学习数据</span>
              </button>
            </div>
            <div v-else class="flex items-center justify-between gap-2 rounded-xl bg-rose-500/10 p-2.5 text-xs">
              <span class="font-medium text-rose-700 dark:text-rose-300">确认清除全部本地进度与笔记？不可恢复！</span>
              <div class="flex gap-1.5">
                <button
                  type="button"
                  class="rounded-md bg-[var(--bg-surface)] px-2.5 py-1 font-medium text-[var(--text-primary)]"
                  @click="confirmReset = false"
                >
                  取消
                </button>
                <button
                  type="button"
                  class="rounded-md bg-rose-600 px-2.5 py-1 font-semibold text-white"
                  @click="
                    () => {
                      studyStore.resetProgress()
                      confirmReset = false
                    }
                  "
                >
                  确认重置
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </Teleport>
</template>
