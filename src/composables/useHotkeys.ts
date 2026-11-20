import { onMounted, onUnmounted } from 'vue'

export function useHotkeys(handlers: {
  onOpenSearch?: () => void
  onEscape?: () => void
}) {
  const onKeydown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      handlers.onOpenSearch?.()
      return
    }
    if (e.key === 'Escape') {
      handlers.onEscape?.()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown)
  })
}
