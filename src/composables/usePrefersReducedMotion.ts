import { onMounted, onUnmounted, ref } from 'vue'

export function usePrefersReducedMotion() {
  const prefersReduced = ref(false)
  let mq: MediaQueryList | null = null

  const update = (e: MediaQueryListEvent | MediaQueryList) => {
    prefersReduced.value = e.matches
  }

  onMounted(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      prefersReduced.value = mq.matches
      mq.addEventListener('change', update)
    }
  })

  onUnmounted(() => {
    mq?.removeEventListener('change', update)
    mq = null
  })

  return prefersReduced
}
