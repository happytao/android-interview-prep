import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import { getDomainManifest } from '@/domains/registry'

const HomeView = () => import('@/views/HomeView.vue')
const QuestionView = () => import('@/views/QuestionView.vue')
const MockDrillView = () => import('@/views/MockDrillView.vue')
const PlannedDomainView = () => import('@/views/PlannedDomainView.vue')
const NotFoundView = () => import('@/views/NotFoundView.vue')

const history =
  import.meta.env.VITE_ROUTER_MODE === 'hash'
    ? createWebHashHistory(import.meta.env.BASE_URL)
    : createWebHistory(import.meta.env.BASE_URL)

export const router = createRouter({
  history,
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      props: { domainId: 'android' },
    },
    {
      path: '/mock',
      name: 'mock',
      component: MockDrillView,
    },
    {
      path: '/:domain',
      name: 'domain-home',
      component: HomeView,
      beforeEnter: (to) => {
        const domainId = String(to.params.domain ?? '')
        const manifest = getDomainManifest(domainId)
        if (!manifest) {
          return { name: 'not-found' }
        }
        if (manifest.config.status === 'planned') {
          return { name: 'planned-domain', params: { domain: domainId } }
        }
        return true
      },
      props: (route) => ({ domainId: String(route.params.domain ?? 'android') }),
    },
    {
      path: '/:domain/planned',
      name: 'planned-domain',
      component: PlannedDomainView,
      props: (route) => ({ domainId: String(route.params.domain ?? '') }),
    },
    {
      path: '/:domain/:slug',
      name: 'question',
      component: QuestionView,
      props: (route) => ({
        domainId: String(route.params.domain ?? 'android'),
        slug: String(route.params.slug ?? ''),
      }),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
    },
  ],
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) {
      return { el: to.hash, top: 88, behavior: 'smooth' }
    }
    return { top: 0 }
  },
})

export function trySingleChunkReload(): boolean {
  try {
    const key = 'chunk-reload-attempted'
    if (sessionStorage.getItem(key) === '1') {
      return false
    }
    sessionStorage.setItem(key, '1')
    window.location.reload()
    return true
  } catch {
    return false
  }
}

router.onError((err) => {
  const msg = err instanceof Error ? err.message : String(err)
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Unable to preload CSS')
  ) {
    trySingleChunkReload()
  }
})
