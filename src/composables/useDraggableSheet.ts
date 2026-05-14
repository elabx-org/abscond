import { ref } from 'vue'

interface SheetOptions { initial: number; min: number; max: number }

export function useDraggableSheet({ initial, min, max }: SheetOptions) {
  const heightPct = ref(initial)
  const isDragging = ref(false)
  let startY = 0
  let startH = initial

  function onPointerDown(e: PointerEvent) {
    isDragging.value = true
    startY = e.clientY
    startH = heightPct.value
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging.value) return
    const dy = startY - e.clientY
    const vh = window.innerHeight
    const delta = (dy / vh) * 100
    heightPct.value = Math.min(max, Math.max(min, startH + delta))
  }

  function onPointerUp() {
    isDragging.value = false
    const mid = (min + initial) / 2
    if (heightPct.value < mid) heightPct.value = min
    else if (heightPct.value < (initial + max) / 2) heightPct.value = initial
    else heightPct.value = max
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  }

  return { heightPct, isDragging, onPointerDown }
}
