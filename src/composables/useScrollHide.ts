import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'

const THRESHOLD = 40

export function useScrollHide(scrollEl: Ref<HTMLElement | null>) {
  const visible = ref(true)
  let lastY = 0

  function onScroll() {
    const el = scrollEl.value ?? document.documentElement
    const currentY = el.scrollTop
    const delta = currentY - lastY
    if (Math.abs(delta) < THRESHOLD) return
    visible.value = delta < 0 // scrolling up → show
    lastY = currentY
  }

  onMounted(() => {
    const el = scrollEl.value ?? window
    el.addEventListener('scroll', onScroll, { passive: true })
  })
  onBeforeUnmount(() => {
    const el = scrollEl.value ?? window
    el.removeEventListener('scroll', onScroll)
  })

  return { visible }
}
