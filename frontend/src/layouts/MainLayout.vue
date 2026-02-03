<script setup lang="ts">
import type { Emitter } from 'mitt'
import { ChartLine, ChevronDown, Help, Maximize, Minimize, Moon, Music, Rocket, Settings, Sunny, Task } from '@vicons/carbon'
import mitt from 'mitt'
import { NButton, NDrawer, NDrawerContent, NDropdown, NIcon, NLayoutHeader, NSpace, NTabPane, NTabs, NTooltip } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { computed, inject, nextTick, onMounted, onUnmounted, provide, ref } from 'vue'
import MiniMusicController from '../components/MiniMusicController.vue'
import MusicPlayer from '../components/MusicPlayer.vue'
import PomodoroInfoModal from '../components/PomodoroInfoModal.vue'
import TodoList from '../components/TodoList.vue'
import TomatoTimer from '../components/TomatoTimer.vue'
import { useTimerStore, useTodoStore } from '../stores'
import AIAssistantView from '../views/AIAssistantView.vue'
import SettingsView from '../views/SettingsView.vue'
import StatisticsView from '../views/StatisticsView.vue'

// 事件总线
type Events = {
  'show-pomodoro-info': void
  [key: string]: unknown
  [key: symbol]: unknown
}

const emitter: Emitter<Events> = mitt()
provide('emitter', emitter)

emitter.on('show-pomodoro-info', () => {
  showPomodoroInfo.value = true
})

// 主题相关
const theme = inject('theme') as any
const toggleTheme = inject('toggleTheme') as () => void

// 状态管理
const showSettings = ref(false)
const showSoundSettings = ref(false)
const isFullscreen = ref(false)
const showPomodoroInfo = ref(false)
const activeTab = ref('todo')

// Stores
const timerStore = useTimerStore()
const todoStore = useTodoStore()
const { currentMode } = storeToRefs(timerStore)

// 模式选项
const modeOptions = [
  { label: '番茄工作法专注模式', key: 'pomodoro' },
  { label: '自定义专注模式', key: 'custom' },
]

// 标签页切换处理
function handleTabChange(tabName: string) {
  const currentTaskId = todoStore.currentTodo?.id
  const isTimerRunning = timerStore.isRunning

  if (currentTaskId) {
    activeTab.value = tabName

    const currentTodo = todoStore.currentTodo
    const currentTime = timerStore.time
    const initialTime = timerStore.initialTime
    const currentMode = timerStore.currentMode
    const isBreak = timerStore.isBreak

    nextTick(() => {
      if (currentTodo) {
        todoStore.setCurrentTodo(currentTodo.id)

        const todoItem = todoStore.todos.find(t => t.id === currentTodo.id)
        if (todoItem) {
          todoStore.setTodoStatus(todoItem.id, 'inProgress')
        }

        if (isTimerRunning) {
          timerStore.restoreTimerState({
            time: currentTime,
            initialTime,
            isRunning: true,
            isBreak,
            currentMode,
          })
        }
      }
    })
  }
  else {
    activeTab.value = tabName
  }
}

// 切换计时器模式
function changeTimerMode(key: string) {
  if (key === 'pomodoro' || key === 'custom') {
    timerStore.switchTimerMode(key as 'pomodoro' | 'custom')
  }
}

// 响应式窗口宽度
const windowWidth = ref(window.innerWidth)
const handleResize = () => windowWidth.value = window.innerWidth
const drawerWidth = computed(() => windowWidth.value > 1200 ? 1200 : '100%')

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="layout-wrapper">
    <NLayoutHeader class="header" :class="{ 'fullscreen-mode': isFullscreen }">
      <transition name="fade">
        <div v-if="!isFullscreen" class="top-bar">
          <div class="left-controls">
            <NTooltip trigger="hover" placement="bottom">
              <template #trigger>
                <NButton circle class="fullscreen-btn" @click="isFullscreen = true">
                  <NIcon><Maximize /></NIcon>
                </NButton>
              </template>
              <span>全屏模式</span>
            </NTooltip>
          </div>

          <div class="logo">
            <div class="tomato-icon" />
            <span class="app-title">MTimer</span>
          </div>

          <div class="right-controls">
            <NDropdown trigger="hover" :options="modeOptions" :value="currentMode" @select="changeTimerMode">
              <NButton class="mode-switch-btn">
                <span>{{ currentMode === 'pomodoro' ? '番茄工作法专注模式' : '自定义专注模式' }}</span>
                <NIcon style="margin-left: 5px">
                  <ChevronDown />
                </NIcon>
              </NButton>
            </NDropdown>

            <NSpace>
              <NTooltip trigger="hover" placement="bottom">
                <template #trigger>
                  <NButton circle class="pomodoro-info-btn" @click="showPomodoroInfo = true">
                    <NIcon><Help /></NIcon>
                  </NButton>
                </template>
                <span>番茄工作法介绍</span>
              </NTooltip>

              <NTooltip trigger="hover" placement="bottom">
                <template #trigger>
                  <NButton circle class="theme-btn" @click="toggleTheme">
                    <NIcon>
                      <Moon v-if="!theme" />
                      <Sunny v-else />
                    </NIcon>
                  </NButton>
                </template>
                <span>{{ theme ? '切换到亮色模式' : '切换到暗色模式' }}</span>
              </NTooltip>

              <NTooltip trigger="hover" placement="bottom">
                <template #trigger>
                  <NButton circle class="sound-btn" @click="showSoundSettings = !showSoundSettings">
                    <NIcon><Music /></NIcon>
                  </NButton>
                </template>
                <span>音乐设置</span>
              </NTooltip>

              <NTooltip trigger="hover" placement="bottom">
                <template #trigger>
                  <NButton circle class="settings-btn" @click="showSettings = !showSettings">
                    <NIcon><Settings /></NIcon>
                  </NButton>
                </template>
                <span>设置</span>
              </NTooltip>
            </NSpace>
          </div>
        </div>
      </transition>

      <transition name="fade">
        <div v-if="isFullscreen" class="fullscreen-controls">
          <NButton circle class="exit-fullscreen-btn" @click="isFullscreen = false">
            <NIcon><Minimize /></NIcon>
          </NButton>
        </div>
      </transition>

      <div class="main-content" :class="{ 'fullscreen-content': isFullscreen }">
        <div :class="{ 'centered-timer': isFullscreen, 'left-column': !isFullscreen }">
          <TomatoTimer />
        </div>

        <div v-if="!isFullscreen" class="right-column">
          <NTabs v-model:value="activeTab" type="line" animated @update:value="handleTabChange">
            <NTabPane name="todo">
              <template #tab>
                <div class="tab-item">
                  <NIcon size="18">
                    <Task />
                  </NIcon>
                  <span class="tab-label">待办事项</span>
                </div>
              </template>
              <TodoList />
            </NTabPane>
            <NTabPane name="stats">
              <template #tab>
                <div class="tab-item">
                  <NIcon size="18">
                    <ChartLine />
                  </NIcon>
                  <span class="tab-label">数据统计</span>
                </div>
              </template>
              <StatisticsView />
            </NTabPane>
            <NTabPane name="ai">
              <template #tab>
                <div class="tab-item">
                  <NIcon size="18">
                    <Rocket />
                  </NIcon>
                  <span class="tab-label">AI助手</span>
                </div>
              </template>
              <AIAssistantView />
            </NTabPane>
          </NTabs>
        </div>
      </div>
    </NLayoutHeader>

    <!-- 设置抽屉 -->
    <NDrawer v-model:show="showSettings" :width="drawerWidth" placement="right">
      <NDrawerContent title="设置" closable>
        <SettingsView />
      </NDrawerContent>
    </NDrawer>

    <NDrawer v-model:show="showSoundSettings" :width="400" placement="right">
      <NDrawerContent title="音乐设置" closable>
        <MusicPlayer />
      </NDrawerContent>
    </NDrawer>

    <PomodoroInfoModal v-model:show="showPomodoroInfo" />
  </div>

  <MiniMusicController />
</template>

<style scoped>
/* 禁止最外层滚动 */
.layout-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  overscroll-behavior: none;
}

.header {
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  background-color: white;
  transition: background-color var(--transition-time) ease;
}

/* 暗色主题样式 */
:root[data-theme='dark'] .header {
  background-color: var(--bg-dark);
}

.fullscreen-mode {
  background-color: rgba(255, 245, 240, 0.5);
  transition: background-color var(--transition-time) ease;
}

:root[data-theme='dark'] .fullscreen-mode {
  background-color: rgba(18, 24, 36, 0.95);
  backdrop-filter: blur(5px);
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 15px 20px;
  background-color: rgba(255, 235, 230, 0.8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition:
    background-color var(--transition-time) ease,
    box-shadow var(--transition-time) ease;
}

:root[data-theme='dark'] .top-bar {
  background-color: rgba(25, 32, 45, 0.9);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tomato-icon {
  width: 24px;
  height: 24px;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="70" r="40" fill="%23ff6347"/><path d="M50,30 C50,30 40,10 50,0 C60,10 50,30 50,30" fill="%23228B22" /><path d="M50,30 C50,30 20,20 10,5 C30,15 50,30 50,30" fill="%2332CD32" /><path d="M50,30 C50,30 80,20 90,5 C70,15 50,30 50,30" fill="%2332CD32" /></svg>');
  background-repeat: no-repeat;
}

.app-title {
  font-size: 22px;
  font-weight: bold;
  color: #ff6347;
  transition: color var(--transition-time) ease;
}

:root[data-theme='dark'] .app-title {
  color: var(--primary-dark);
  text-shadow: 0 0 8px rgba(255, 99, 71, 0.4);
}

.left-controls,
.right-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.fullscreen-btn,
.exit-fullscreen-btn {
  transition: all 0.3s ease;
}

.fullscreen-btn:hover,
.exit-fullscreen-btn:hover {
  transform: scale(1.1);
}

.mode-switch-btn {
  border-radius: 16px;
  padding: 6px 16px;
  background-color: rgba(255, 99, 71, 0.1);
  border: 1px solid rgba(255, 99, 71, 0.2);
  color: #ff6347;
  font-weight: 500;
  transition: all var(--transition-time) ease;
}

:root[data-theme='dark'] .mode-switch-btn {
  background-color: rgba(255, 99, 71, 0.15);
  border: 1px solid rgba(255, 99, 71, 0.3);
  color: var(--primary-dark);
}

.mode-switch-btn:hover {
  background-color: rgba(255, 99, 71, 0.2);
}

:root[data-theme='dark'] .mode-switch-btn:hover {
  background-color: rgba(255, 99, 71, 0.25);
  box-shadow: 0 0 10px rgba(255, 99, 71, 0.3);
}

.theme-btn,
.sound-btn,
.settings-btn {
  transition: all 0.3s ease;
}

.theme-btn:hover {
  transform: rotate(30deg);
}

.sound-btn:hover,
.settings-btn:hover {
  transform: scale(1.1);
}

:root[data-theme='dark'] .theme-btn:hover,
:root[data-theme='dark'] .sound-btn:hover,
:root[data-theme='dark'] .settings-btn:hover {
  box-shadow: 0 0 15px rgba(255, 99, 71, 0.6);
}

.main-content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 20px;
  height: auto;
  overflow: hidden;
  min-height: 0;
}

.fullscreen-content {
  align-items: center;
  justify-content: center;
  height: 100vh;
}

.fullscreen-controls {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 100;
}

.centered-timer {
  transform: scale(1.2);
  transition: transform 0.3s ease;
}

.left-column {
  flex: 0 0 500px;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.3s ease;
  overflow: hidden;
}

.right-column {
  flex: 1;
  background-color: rgba(255, 255, 255, 0.6);
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--shadow-light);
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  transition:
    background-color var(--transition-time) ease,
    box-shadow var(--transition-time) ease;
}

:root[data-theme='dark'] .right-column {
  background-color: rgba(30, 38, 52, 0.7);
  box-shadow: var(--shadow-dark);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.right-column :deep(.n-tabs-nav) {
  padding: 0 20px;
}

.right-column :deep(.n-tab-pane) {
  padding: 10px 0;
}

.tab-label {
  margin-left: 8px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.3s;
}

.n-tabs-nav__bar {
  height: 3px !important;
}

.right-column :deep(.n-tabs-tab) {
  padding: 8px 16px;
  transition: all 0.3s;
}

.right-column :deep(.n-tabs-tab:hover) {
  color: #32cd32;
}

:root[data-theme='dark'] .right-column :deep(.n-tabs-tab:hover) {
  color: var(--secondary-dark);
}

.right-column :deep(.n-tabs-tab.n-tabs-tab--active) {
  color: #32cd32;
}

:root[data-theme='dark'] .right-column :deep(.n-tabs-tab.n-tabs-tab--active) {
  color: var(--secondary-dark);
}

.right-column :deep(.n-tabs-nav__bar) {
  background-color: #32cd32 !important;
}

:root[data-theme='dark'] .right-column :deep(.n-tabs-nav__bar) {
  background-color: var(--secondary-dark) !important;
  box-shadow: 0 0 10px rgba(50, 205, 50, 0.5);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }

  to {
    opacity: 0;
  }
}

.fade-enter-active {
  animation: fadeIn 0.3s ease-out;
}

.fade-leave-active {
  animation: fadeOut 0.3s ease-in;
}

/* 暗色模式下的渐入动画 */
:root[data-theme='dark'] .theme-btn,
:root[data-theme='dark'] .sound-btn,
:root[data-theme='dark'] .settings-btn {
  position: relative;
  overflow: hidden;
}

:root[data-theme='dark'] .theme-btn::after,
:root[data-theme='dark'] .sound-btn::after,
:root[data-theme='dark'] .settings-btn::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 5px;
  height: 5px;
  background: rgba(255, 255, 255, 0.8);
  opacity: 0;
  border-radius: 100%;
  transform: scale(1, 1) translate(-50%, -50%);
  transform-origin: 50% 50%;
}

:root[data-theme='dark'] .theme-btn:hover::after,
:root[data-theme='dark'] .sound-btn:hover::after,
:root[data-theme='dark'] .settings-btn:hover::after {
  animation: ripple 1s ease-out;
}

@keyframes ripple {
  0% {
    transform: scale(0, 0);
    opacity: 0.5;
  }
  20% {
    transform: scale(25, 25);
    opacity: 0.3;
  }
  100% {
    opacity: 0;
    transform: scale(40, 40);
  }
}

/* 番茄工作法按钮样式 */
.pomodoro-info-btn {
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  border: none;
  color: #ff6347;
}

.pomodoro-info-btn:hover {
  transform: translateY(-3px) rotate(15deg);
  box-shadow: 0 4px 8px rgba(255, 99, 71, 0.4);
  background-color: rgba(255, 99, 71, 0.1);
}
</style>
