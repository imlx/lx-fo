import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/voice'
  },
  {
    path: '/voice',
    name: 'Voice',
    component: () => import('@/views/VoicePage.vue')
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('@/views/ChatPage.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router