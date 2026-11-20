import { onUnmounted, watch, type Ref } from 'vue'

let activeLocks = 0

function syncBodyOverflow() {
  if (typeof document === 'undefined') return
  document.documentElement.style.overflow = activeLocks > 0 ? 'hidden' : ''
}

/**
 * Ref-counted document scroll lock shared across modals/drawers so closing one
 * overlapping overlay never prematurely unlocks scroll for another still-open overlay.
 */
export function useScrollLock(isLocked: Ref<boolean>) {
  let holdingLock = false

  const acquire = () => {
    if (holdingLock) return
    holdingLock = true
    activeLocks += 1
    syncBodyOverflow()
  }

  const release = () => {
    if (!holdingLock) return
    holdingLock = false
    activeLocks = Math.max(0, activeLocks - 1)
    syncBodyOverflow()
  }

  watch(
    isLocked,
    (locked) => {
      if (locked) acquire()
      else release()
    },
    { immediate: true },
  )

  onUnmounted(() => {
    release()
  })
}
