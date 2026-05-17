import { ref, type Ref } from 'vue'

export function useSwipeToDismiss(
  onDismiss: () => void,
  scrollEl?: Ref<HTMLElement | null>
) {
  const dragY  = ref(0)
  const active = ref(false)
  let startY = 0, startTime = 0

  function onPointerDown(e: PointerEvent) {
    if (scrollEl?.value && scrollEl.value.scrollTop > 0) return
    active.value = true
    startY    = e.clientY
    startTime = Date.now()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: PointerEvent) {
    if (!active.value) return
    dragY.value = Math.max(0, e.clientY - startY)
  }

  function onPointerUp() {
    if (!active.value) return
    active.value = false
    const elapsed       = Date.now() - startTime
    const velocity      = elapsed > 0 ? dragY.value / elapsed : 0
    const pastThreshold = dragY.value > window.innerHeight * 0.4
    if (pastThreshold || velocity > 0.5) {
      if ('vibrate' in navigator) navigator.vibrate(30)
      dragY.value = 0
      onDismiss()
    } else {
      dragY.value = 0
    }
  }

  return { dragY, active, onPointerDown, onPointerMove, onPointerUp }
}
