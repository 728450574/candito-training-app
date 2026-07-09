import { onMounted, onUnmounted } from 'vue'

export function useSwipe(
  elementRef: { value: HTMLElement | null },
  callbacks: {
    onSwipeLeft?: () => void
    onSwipeRight?: () => void
  },
  threshold = 60,
) {
  let startX = 0
  let startY = 0
  let isSwiping = false

  function onTouchStart(e: TouchEvent): void {
    if (e.touches.length !== 1) return
    startX = e.touches[0].clientX
    startY = e.touches[0].clientY
    isSwiping = true
  }

  function onTouchMove(e: TouchEvent): void {
    if (!isSwiping) return
    const dx = Math.abs(e.touches[0].clientX - startX)
    const dy = Math.abs(e.touches[0].clientY - startY)
    if (dx > dy) {
      e.preventDefault()
    }
  }

  function onTouchEnd(e: TouchEvent): void {
    if (!isSwiping) return
    isSwiping = false
    const dx = e.changedTouches[0].clientX - startX
    const dy = e.changedTouches[0].clientY - startY
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    if (absDx < threshold || absDy > absDx) return

    if (dx < 0) {
      callbacks.onSwipeLeft?.()
    } else {
      callbacks.onSwipeRight?.()
    }
  }

  onMounted(() => {
    const el = elementRef.value
    if (!el) return
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
  })

  onUnmounted(() => {
    const el = elementRef.value
    if (!el) return
    el.removeEventListener('touchstart', onTouchStart)
    el.removeEventListener('touchmove', onTouchMove)
    el.removeEventListener('touchend', onTouchEnd)
  })
}
