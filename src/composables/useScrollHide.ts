import { ref, onMounted, onBeforeUnmount, onActivated, onDeactivated, type Ref } from 'vue'

// Shared module-level state — single source of truth for all consumers
const navVisible = ref(true)

/** Read the nav-bar visibility state from any component. */
export function useNavVisible() {
  return navVisible
}

let accumulated = 0
let lastY = 0

function resetNav() {
  accumulated = 0
  navVisible.value = true
}

/**
 * Wire a scroll container (or window when scrollEl is null) to the nav
 * visibility state. Call once at the AppShell level so the listener is
 * registered for the full app lifetime.
 *
 * Hides nav after 60 px of downward scroll; shows immediately on any
 * upward scroll or when content is at the top.
 */
export function useScrollHide(scrollEl: Ref<HTMLElement | null>) {
  function onScroll() {
    const el = scrollEl.value
    const currentY = el ? el.scrollTop : window.scrollY

    if (currentY <= 0) {
      resetNav()
      lastY = 0
      return
    }

    const delta = currentY - lastY
    lastY = currentY

    if (delta > 0) {
      accumulated += delta
      if (accumulated >= 60) navVisible.value = false
    } else if (delta < 0) {
      accumulated = 0
      navVisible.value = true
    }
  }

  function attach() {
    const target: EventTarget = scrollEl.value ?? window
    target.addEventListener('scroll', onScroll, { passive: true })
  }

  function detach() {
    const target: EventTarget = scrollEl.value ?? window
    target.removeEventListener('scroll', onScroll)
    resetNav()
  }

  onMounted(attach)
  onBeforeUnmount(detach)
  // Support keep-alive — re-attach when view is activated
  onActivated(attach)
  onDeactivated(detach)

  return { visible: navVisible }
}
