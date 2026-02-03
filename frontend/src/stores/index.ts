import { createPinia } from 'pinia'

// 导出store实例
export const pinia = createPinia()

export * from './settingsStore'
// 导出所有store
export * from './timerStore'
export * from './todoStore'
