<script setup lang="ts">
import { h, ref, inject } from 'vue'
import { NLayout, NLayoutHeader, NLayoutContent, NSpace, NButton, NIcon, darkTheme, NTooltip, NDrawer, NDrawerContent, NTabPane, NTabs, NDropdown } from 'naive-ui'
import { RouterView } from 'vue-router'
import TomatoTimer from '../components/TomatoTimer.vue'
import TodoList from '../components/TodoList.vue'
import Navigation from '../components/Navigation.vue'
import SettingsView from '../views/SettingsView.vue'
import MusicPlayer from '../components/MusicPlayer.vue'
import MiniMusicController from '../components/MiniMusicController.vue'
import { Moon, Sunny, Settings, Music, Maximize, Minimize, ChevronDown, ChartLine, CheckmarkFilled, Task } from '@vicons/carbon'
import { useSettingsStore, useTimerStore, useTodoStore } from '../stores'
import { storeToRefs } from 'pinia'

// 从App.vue注入主题状态和切换方法
const theme = inject('theme') as any
const toggleTheme = inject('toggleTheme') as () => void
const showSettings = ref(false)
const showSoundSettings = ref(false)
const isFullscreen = ref(false)
const settingsStore = useSettingsStore()
const timerStore = useTimerStore()
const todoStore = useTodoStore()

// 使用storeToRefs保持响应性
const { currentMode } = storeToRefs(timerStore)

// 功能区域切换
const activeTab = ref('todo')
const tabs = [
    {
        name: 'todo',
        label: '待办事项',
        icon: () => h(Task),
    },
    {
        name: 'stats',
        label: '数据统计',
        icon: () => h(ChartLine),
    }
]

// 模式选项
const modeOptions = [
    {
        label: '番茄工作法专注模式',
        key: 'pomodoro'
    },
    {
        label: '自定义专注模式',
        key: 'custom'
    }
]

const toggleSettings = () => {
    showSettings.value = !showSettings.value
}

const toggleSoundSettings = () => {
    showSoundSettings.value = !showSoundSettings.value
}

const toggleFullscreen = () => {
    // 切换全屏状态
    isFullscreen.value = !isFullscreen.value

    // 延迟短暂时间，确保DOM更新后再执行其他操作
    setTimeout(() => {
        // 如果需要，这里可以添加全屏/退出全屏后的其他操作
        // 但不要重置或修改timerStore中的状态
    }, 100)
}

// 切换计时器模式
const changeTimerMode = (key: string) => {
    if (key === 'pomodoro' || key === 'custom') {
        // 使用新的switchTimerMode方法切换模式
        timerStore.switchTimerMode(key as 'pomodoro' | 'custom')
    }
}
</script>

<template>
    <n-layout position="absolute">
        <n-layout-header class="header" :class="{ 'fullscreen-mode': isFullscreen }">
            <transition name="fade">
                <div class="top-bar" v-if="!isFullscreen">
                    <div class="left-controls">
                        <n-tooltip trigger="hover" placement="bottom">
                            <template #trigger>
                                <n-button circle @click="toggleFullscreen" class="fullscreen-btn">
                                    <n-icon>
                                        <Maximize />
                                    </n-icon>
                                </n-button>
                            </template>
                            <span>全屏模式</span>
                        </n-tooltip>
                    </div>

                    <div class="logo">
                        <div class="tomato-icon"></div>
                        <span class="app-title">MTimer</span>
                    </div>

                    <div class="right-controls">
                        <n-dropdown trigger="hover" :options="modeOptions" @select="changeTimerMode"
                            :value="currentMode">
                            <n-button class="mode-switch-btn">
                                <span>{{ currentMode === 'pomodoro' ? '番茄工作法专注模式' : '自定义专注模式' }}</span>
                                <n-icon style="margin-left: 5px">
                                    <ChevronDown />
                                </n-icon>
                            </n-button>
                        </n-dropdown>

                        <n-space>
                            <n-tooltip trigger="hover" placement="bottom">
                                <template #trigger>
                                    <n-button circle @click="toggleTheme" class="theme-btn">
                                        <n-icon>
                                            <Moon v-if="!theme" />
                                            <Sunny v-else />
                                        </n-icon>
                                    </n-button>
                                </template>
                                <span>{{ theme ? '切换到亮色模式' : '切换到暗色模式' }}</span>
                            </n-tooltip>

                            <n-tooltip trigger="hover" placement="bottom">
                                <template #trigger>
                                    <n-button circle @click="toggleSoundSettings" class="sound-btn">
                                        <n-icon>
                                            <Music />
                                        </n-icon>
                                    </n-button>
                                </template>
                                <span>音乐设置</span>
                            </n-tooltip>

                            <n-tooltip trigger="hover" placement="bottom">
                                <template #trigger>
                                    <n-button circle @click="toggleSettings" class="settings-btn">
                                        <n-icon>
                                            <Settings />
                                        </n-icon>
                                    </n-button>
                                </template>
                                <span>设置</span>
                            </n-tooltip>
                        </n-space>
                    </div>
                </div>
            </transition>

            <!-- 全屏模式下的返回按钮 -->
            <transition name="fade">
                <div class="fullscreen-controls" v-if="isFullscreen">
                    <n-button circle @click="toggleFullscreen" class="exit-fullscreen-btn">
                        <n-icon>
                            <Minimize />
                        </n-icon>
                    </n-button>
                </div>
            </transition>

            <!-- 主内容区 -->
            <div class="main-content" :class="{ 'fullscreen-content': isFullscreen }">
                <!-- 使用单一实例的TomatoTimer组件，通过类名控制样式，避免重新渲染 -->
                <div :class="{ 'centered-timer': isFullscreen, 'left-column': !isFullscreen }">
                    <tomato-timer />
                </div>

                <!-- 正常模式显示右侧列 -->
                <div v-if="!isFullscreen" class="right-column">
                    <n-tabs v-model:value="activeTab" type="line" animated>
                        <n-tab-pane name="todo">
                            <template #tab>
                                <div class="tab-item">
                                    <n-icon size="18">
                                        <Task />
                                    </n-icon>
                                    <span class="tab-label">待办事项</span>
                                </div>
                            </template>
                            <todo-list />
                        </n-tab-pane>
                        <n-tab-pane name="stats">
                            <template #tab>
                                <div class="tab-item">
                                    <n-icon size="18">
                                        <ChartLine />
                                    </n-icon>
                                    <span class="tab-label">数据统计</span>
                                </div>
                            </template>
                            <div class="stats-container">
                                <h3>数据统计</h3>
                                <p>此处将显示专注时长和完成任务的统计图表</p>
                            </div>
                        </n-tab-pane>
                    </n-tabs>
                </div>
            </div>
        </n-layout-header>

        <!-- 设置抽屉 -->
        <n-drawer v-model:show="showSettings" :width="300" placement="right">
            <n-drawer-content title="设置" closable>
                <settings-view />
            </n-drawer-content>
        </n-drawer>

        <!-- 音乐设置抽屉 -->
        <n-drawer v-model:show="showSoundSettings" :width="400" placement="right">
            <n-drawer-content title="音乐设置" closable>
                <div class="sound-settings">
                    <!-- 音乐播放器组件 -->
                    <music-player />
                </div>
            </n-drawer-content>
        </n-drawer>
    </n-layout>
    <!-- 迷你音乐控制器 -->
    <mini-music-controller />
</template>

<style scoped>
.header {
    height: auto;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    padding: 0;
    overflow: hidden;
    background-color: white;
    transition: background-color var(--transition-time) ease;
}

/* 暗色主题样式 */
:root[data-theme="dark"] .header {
    background-color: var(--bg-dark);
}

.fullscreen-mode {
    background-color: rgba(255, 245, 240, 0.5);
    transition: background-color var(--transition-time) ease;
}

:root[data-theme="dark"] .fullscreen-mode {
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
    transition: background-color var(--transition-time) ease, box-shadow var(--transition-time) ease;
}

:root[data-theme="dark"] .top-bar {
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

:root[data-theme="dark"] .app-title {
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

:root[data-theme="dark"] .mode-switch-btn {
    background-color: rgba(255, 99, 71, 0.15);
    border: 1px solid rgba(255, 99, 71, 0.3);
    color: var(--primary-dark);
}

.mode-switch-btn:hover {
    background-color: rgba(255, 99, 71, 0.2);
}

:root[data-theme="dark"] .mode-switch-btn:hover {
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

:root[data-theme="dark"] .theme-btn:hover,
:root[data-theme="dark"] .sound-btn:hover,
:root[data-theme="dark"] .settings-btn:hover {
    box-shadow: 0 0 15px rgba(255, 99, 71, 0.6);
}

.main-content {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 20px;
    height: calc(100vh - 70px);
    overflow: auto;
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
}

.right-column {
    flex: 1;
    background-color: rgba(255, 255, 255, 0.6);
    border-radius: 16px;
    padding: 20px;
    box-shadow: var(--shadow-light);
    max-height: 100%;
    overflow: auto;
    transition: background-color var(--transition-time) ease, box-shadow var(--transition-time) ease;
}

:root[data-theme="dark"] .right-column {
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

.stats-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 300px;
    color: #666;
    transition: color var(--transition-time) ease;
}

:root[data-theme="dark"] .stats-container {
    color: #aaa;
}

.sound-settings {
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 20px;
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
    color: #32CD32;
}

:root[data-theme="dark"] .right-column :deep(.n-tabs-tab:hover) {
    color: var(--secondary-dark);
}

.right-column :deep(.n-tabs-tab.n-tabs-tab--active) {
    color: #32CD32;
}

:root[data-theme="dark"] .right-column :deep(.n-tabs-tab.n-tabs-tab--active) {
    color: var(--secondary-dark);
}

.right-column :deep(.n-tabs-nav__bar) {
    background-color: #32CD32 !important;
}

:root[data-theme="dark"] .right-column :deep(.n-tabs-nav__bar) {
    background-color: var(--secondary-dark) !important;
    box-shadow: 0 0 10px rgba(50, 205, 50, 0.5);
}

@media (max-width: 992px) {
    .two-column-layout {
        flex-direction: column;
        gap: 30px;
    }

    .left-column {
        flex: 0 0 auto;
        width: 100%;
    }

    .right-column {
        width: 100%;
    }
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
:root[data-theme="dark"] .theme-btn,
:root[data-theme="dark"] .sound-btn,
:root[data-theme="dark"] .settings-btn {
    position: relative;
    overflow: hidden;
}

:root[data-theme="dark"] .theme-btn::after,
:root[data-theme="dark"] .sound-btn::after,
:root[data-theme="dark"] .settings-btn::after {
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

:root[data-theme="dark"] .theme-btn:hover::after,
:root[data-theme="dark"] .sound-btn:hover::after,
:root[data-theme="dark"] .settings-btn:hover::after {
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
</style>