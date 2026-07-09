import { ref, computed, onUnmounted } from 'vue'

export function useTimer() {
  const elapsedSeconds = ref(0)
  const restSeconds = ref(0)
  const isRunning = ref(false)
  const isResting = ref(false)
  const defaultRestSeconds = ref(90)

  let elapsedInterval: ReturnType<typeof setInterval> | null = null
  let restInterval: ReturnType<typeof setInterval> | null = null

  function clearElapsed(): void {
    if (elapsedInterval !== null) {
      clearInterval(elapsedInterval)
      elapsedInterval = null
    }
  }

  function clearRest(): void {
    if (restInterval !== null) {
      clearInterval(restInterval)
      restInterval = null
    }
  }

  function start(): void {
    if (isRunning.value) return
    clearElapsed()
    isRunning.value = true
    elapsedInterval = setInterval(() => {
      elapsedSeconds.value++
    }, 1000)
  }

  function stop(): void {
    clearElapsed()
    clearRest()
    isRunning.value = false
    isResting.value = false
  }

  function pause(): void {
    clearElapsed()
    isRunning.value = false
  }

  function startRest(duration?: number): void {
    clearRest()
    restSeconds.value = duration ?? defaultRestSeconds.value
    if (restSeconds.value <= 0) return
    isResting.value = true
    restInterval = setInterval(() => {
      if (restSeconds.value > 0) {
        restSeconds.value--
      } else {
        clearRest()
        isResting.value = false
      }
    }, 1000)
  }

  function stopRest(): void {
    clearRest()
    isResting.value = false
    restSeconds.value = 0
  }

  function reset(): void {
    stop()
    elapsedSeconds.value = 0
    restSeconds.value = 0
  }

  const elapsedFormatted = computed(() => formatTime(elapsedSeconds.value))

  const restFormatted = computed(() => formatTime(restSeconds.value))

  const restPercentage = computed(() => {
    if (defaultRestSeconds.value <= 0) return 0
    return ((defaultRestSeconds.value - restSeconds.value) / defaultRestSeconds.value) * 100
  })

  function formatTime(totalSeconds: number): string {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  onUnmounted(() => {
    stop()
  })

  return {
    elapsedSeconds,
    restSeconds,
    isRunning,
    isResting,
    elapsedFormatted,
    restFormatted,
    restPercentage,
    start,
    stop,
    pause,
    startRest,
    stopRest,
    reset,
    defaultRestSeconds,
  }
}
