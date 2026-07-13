import { createRouter, createWebHashHistory } from 'vue-router'
import { getStorageMode, getCurrentMode } from '@/services/storage'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/today'
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/AuthLogin.vue'),
      meta: { showTabBar: false }
    },
    {
      path: '/start',
      name: 'start',
      component: () => import('@/views/StartTraining.vue'),
      meta: { showTabBar: false }
    },
    {
      path: '/today',
      name: 'today',
      component: () => import('@/views/TodayTraining.vue'),
      meta: { showTabBar: true }
    },
    {
      path: '/training/execute',
      name: 'training-execute',
      component: () => import('@/views/TrainingExecution.vue'),
      meta: { showTabBar: false }
    },
    {
      path: '/training/complete',
      name: 'training-complete',
      component: () => import('@/views/TrainingComplete.vue'),
      meta: { showTabBar: false }
    },
    {
      path: '/training/detail',
      name: 'training-detail',
      component: () => import('@/views/TrainingDetail.vue'),
      meta: { showTabBar: false }
    },
    {
      path: '/plan',
      name: 'plan',
      component: () => import('@/views/TrainingPlan.vue'),
      meta: { showTabBar: true }
    },
    {
      path: '/calendar',
      name: 'calendar',
      component: () => import('@/views/TrainingCalendar.vue'),
      meta: { showTabBar: true }
    },
    {
      path: '/cycle',
      name: 'cycle',
      component: () => import('@/views/CycleManagement.vue'),
      meta: { showTabBar: true }
    },
    {
      path: '/1rm',
      name: '1rm',
      component: () => import('@/views/OneRMSetup.vue'),
      meta: { showTabBar: false }
    },
    {
      path: '/pause',
      name: 'pause',
      component: () => import('@/views/PauseCycle.vue'),
      meta: { showTabBar: false }
    },
    {
      path: '/missed',
      name: 'missed',
      component: () => import('@/views/MissedWorkouts.vue'),
      meta: { showTabBar: false }
    },
    {
      path: '/week6',
      name: 'week6',
      component: () => import('@/views/Week6Decision.vue'),
      meta: { showTabBar: false }
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('@/views/ProgressStats.vue'),
      meta: { showTabBar: true }
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsExport.vue'),
      meta: { showTabBar: true }
    },
    {
      path: '/weight',
      name: 'weight',
      component: () => import('@/views/WeightRecord.vue'),
      meta: { showTabBar: false }
    },
    {
      path: '/custom-exercise',
      name: 'custom-exercise',
      component: () => import('@/views/CustomExercise.vue'),
      meta: { showTabBar: false }
    },
  ]
})

// 路由守卫：偏好云端但未登录时重定向到登录页
router.beforeEach((to) => {
  if (to.name === 'login') return true
  const preferredMode = getStorageMode()
  const actualMode = getCurrentMode()
  if (preferredMode === 'cloud' && actualMode === 'local') {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
