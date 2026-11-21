import { computed, onMounted, onUnmounted, ref } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

const THEME_STORAGE_KEY = 'interview-theme'
const LIGHT_BG = '#F5F5F7'
const DARK_BG = '#0B0D11'

function readStoredMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    // Private browsing or blocked storage
  }
  return 'system'
}

function getSystemDark(): boolean {
  try {
    return Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  } catch {
    return false
  }
}

const mode = ref<ThemeMode>(typeof window !== 'undefined' ? readStoredMode() : 'system')
const systemDark = ref<boolean>(typeof window !== 'undefined' ? getSystemDark() : false)

function applyThemeToDom(nextMode: ThemeMode, isSystemDark: boolean) {
  if (typeof document === 'undefined') return
  const resolved = nextMode === 'system' ? (isSystemDark ? 'dark' : 'light') : nextMode
  const root = document.documentElement
  const changed = root.dataset.theme && root.dataset.theme !== resolved
  if (changed) {
    root.classList.add('theme-switching')
  }
  root.dataset.theme = resolved
  root.dataset.themeMode = nextMode
  root.style.colorScheme = resolved
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', resolved === 'dark' ? DARK_BG : LIGHT_BG)
  }
  if (changed) {
    // Force a single synchronous style recalc so all buttons/surfaces switch atomically without a white flash
    void root.offsetHeight
    requestAnimationFrame(() => {
      root.classList.remove('theme-switching')
    })
  }
}

let listenerCount = 0
let mediaQuery: MediaQueryList | null = null

const onMediaChange = (e: MediaQueryListEvent) => {
  systemDark.value = e.matches
  applyThemeToDom(mode.value, systemDark.value)
}

const onStorageChange = (e: StorageEvent) => {
  if (e.key === THEME_STORAGE_KEY) {
    mode.value = readStoredMode()
    applyThemeToDom(mode.value, systemDark.value)
  }
}

export function useTheme() {
  const resolvedTheme = computed<'light' | 'dark'>(() =>
    mode.value === 'system' ? (systemDark.value ? 'dark' : 'light') : mode.value,
  )

  const setTheme = (nextMode: ThemeMode) => {
    mode.value = nextMode
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextMode)
    } catch {
      // Ignore write failures
    }
    applyThemeToDom(nextMode, systemDark.value)
  }

  const cycleTheme = () => {
    const order: ThemeMode[] = ['light', 'dark', 'system']
    const idx = order.indexOf(mode.value)
    setTheme(order[(idx + 1) % order.length]!)
  }

  onMounted(() => {
    listenerCount += 1
    if (listenerCount === 1 && typeof window !== 'undefined') {
      mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)') ?? null
      mediaQuery?.addEventListener('change', onMediaChange)
      window.addEventListener('storage', onStorageChange)
      applyThemeToDom(mode.value, systemDark.value)
    }
  })

  onUnmounted(() => {
    listenerCount -= 1
    if (listenerCount === 0 && typeof window !== 'undefined') {
      mediaQuery?.removeEventListener('change', onMediaChange)
      window.removeEventListener('storage', onStorageChange)
      mediaQuery = null
    }
  })

  return {
    mode,
    resolvedTheme,
    setTheme,
    cycleTheme,
  }
}
