import { computed, onUnmounted, ref, watch } from 'vue'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

export interface DiagramStep {
  title: string
  description: string
  highlightIds: string[]
}

export function useDiagramSteps(steps: DiagramStep[]) {
  const currentStep = ref(0)
  const isPlaying = ref(false)
  const prefersReduced = usePrefersReducedMotion()
  let timer: ReturnType<typeof setInterval> | null = null

  const activeStep = computed(() => steps[currentStep.value] ?? steps[0]!)
  const activeHighlights = computed(() => new Set(activeStep.value?.highlightIds ?? []))

  const stopAutoPlay = () => {
    isPlaying.value = false
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  const next = () => {
    currentStep.value = (currentStep.value + 1) % steps.length
  }

  const prev = () => {
    currentStep.value = (currentStep.value - 1 + steps.length) % steps.length
  }

  const reset = () => {
    stopAutoPlay()
    currentStep.value = 0
  }

  const setStep = (idx: number) => {
    if (idx >= 0 && idx < steps.length) {
      currentStep.value = idx
    }
  }

  const toggleAutoPlay = () => {
    if (prefersReduced.value) return
    if (isPlaying.value) {
      stopAutoPlay()
      return
    }
    isPlaying.value = true
    timer = setInterval(() => {
      next()
    }, 2200)
  }

  watch(prefersReduced, (reduced) => {
    if (reduced) stopAutoPlay()
  })

  onUnmounted(() => {
    stopAutoPlay()
  })

  return {
    currentStep,
    activeStep,
    activeHighlights,
    isPlaying,
    prefersReduced,
    next,
    prev,
    reset,
    setStep,
    toggleAutoPlay,
    stopAutoPlay,
  }
}
