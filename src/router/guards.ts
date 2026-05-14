import type { NavigationGuardWithThis, RouteLocationNormalized } from 'vue-router'
import type { useAuthStore } from '@/stores/auth'

const PUBLIC_ROUTES = ['login', 'auth-callback']

export function createAuthGuard(
  getStore: () => ReturnType<typeof useAuthStore>
): NavigationGuardWithThis<undefined> {
  return async (to: RouteLocationNormalized, _from, next) => {
    if (PUBLIC_ROUTES.includes(to.name as string)) return next()
    const auth = getStore()
    if (!auth.token) return next({ name: 'login' })
    next()
  }
}
