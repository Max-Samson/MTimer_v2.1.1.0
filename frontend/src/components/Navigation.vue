<script setup lang="ts">
import {
  ArrowLeft,
  ArrowRight,
  ChartColumn,
  List,
  Time,
  User,
} from '@vicons/carbon'
import { NBadge, NButton, NIcon, NSpace, NTooltip } from 'naive-ui'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const history = ref<string[]>([])
const currentIndex = ref(-1)

// 导航到指定路由
function navigateTo(path: string) {
  // 如果不是通过前进后退按钮导航，则添加到历史记录
  if (route.path !== path) {
    // 清除当前位置之后的历史记录
    if (currentIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, currentIndex.value + 1)
    }

    // 导航到新路径
    router.push(path)

    // 导航后记录新路径到历史记录中
    history.value.push(path)
    currentIndex.value = history.value.length - 1
  }
}

// 后退
function goBack() {
  if (currentIndex.value > 0) {
    currentIndex.value--
    router.push(history.value[currentIndex.value])
  }
}

// 前进
function goForward() {
  if (currentIndex.value < history.value.length - 1) {
    currentIndex.value++
    router.push(history.value[currentIndex.value])
  }
}

// 初始化历史记录
if (history.value.length === 0 && route.path) {
  history.value.push(route.path)
  currentIndex.value = 0
}
</script>

<template>
  <div class="navigation">
    <NSpace justify="center" align="center" class="nav-container">
      <!-- 后退按钮 -->
      <NTooltip trigger="hover" placement="bottom">
        <template #trigger>
          <NButton circle secondary :disabled="currentIndex <= 0" class="nav-btn" @click="goBack">
            <template #icon>
              <NIcon>
                <ArrowLeft />
              </NIcon>
            </template>
          </NButton>
        </template>
        返回
      </NTooltip>

      <!-- 计时器按钮 -->
      <NTooltip trigger="hover" placement="bottom">
        <template #trigger>
          <NButton
            circle secondary :type="route.path === '/' ? 'primary' : 'default'"
            class="nav-btn" @click="navigateTo('/')"
          >
            <template #icon>
              <NIcon>
                <Time />
              </NIcon>
            </template>
          </NButton>
        </template>
        专注计时器
      </NTooltip>

      <!-- 待办事项按钮 -->
      <NTooltip trigger="hover" placement="bottom">
        <template #trigger>
          <NBadge :value="0" :show="false" processing>
            <NButton
              circle secondary :type="route.path === '/todo' ? 'primary' : 'default'"
              class="nav-btn" @click="navigateTo('/todo')"
            >
              <template #icon>
                <NIcon>
                  <List />
                </NIcon>
              </template>
            </NButton>
          </NBadge>
        </template>
        待办事项
      </NTooltip>

      <!-- 统计按钮 -->
      <NTooltip trigger="hover" placement="bottom">
        <template #trigger>
          <NButton
            circle secondary :type="route.path === '/statistics' ? 'primary' : 'default'"
            class="nav-btn" @click="navigateTo('/statistics')"
          >
            <template #icon>
              <NIcon>
                <ChartColumn />
              </NIcon>
            </template>
          </NButton>
        </template>
        统计
      </NTooltip>

      <!-- AI助手按钮 -->
      <NTooltip trigger="hover" placement="bottom">
        <template #trigger>
          <NButton
            circle secondary :type="route.path === '/ai-assistant' ? 'primary' : 'default'"
            class="nav-btn" @click="navigateTo('/ai-assistant')"
          >
            <template #icon>
              <NIcon>
                <User />
              </NIcon>
            </template>
          </NButton>
        </template>
        AI专注助手
      </NTooltip>

      <!-- 前进按钮 -->
      <NTooltip trigger="hover" placement="bottom">
        <template #trigger>
          <NButton
            circle secondary :disabled="currentIndex >= history.value.length - 1" class="nav-btn"
            @click="goForward"
          >
            <template #icon>
              <NIcon>
                <ArrowRight />
              </NIcon>
            </template>
          </NButton>
        </template>
        前进
      </NTooltip>
    </NSpace>
  </div>
</template>

<style scoped>
.navigation {
  width: 100%;
  max-width: 500px;
  padding: 5px 0;
  margin: 0 auto;
}

.nav-container {
  padding: 8px;
  border-radius: 12px;
  background-color: transparent;
  /* 移除背景色，让MainLayout控制背景 */
  display: flex;
  justify-content: space-around;
  width: 100%;
}

.nav-btn {
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  background-color: transparent;
  border: none;
  /* 移除边框 */
}

.nav-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  /* 增强阴影效果 */
}

.nav-btn:active {
  transform: translateY(0);
}

.nav-btn::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 5px;
  height: 5px;
  background: rgba(255, 255, 255, 0.5);
  opacity: 0;
  border-radius: 100%;
  transform: scale(1, 1) translate(-50%);
  transform-origin: 50% 50%;
}

.nav-btn:hover::after {
  animation: ripple 1s ease-out;
}

@keyframes ripple {
  0% {
    transform: scale(0, 0);
    opacity: 0.5;
  }

  100% {
    transform: scale(20, 20);
    opacity: 0;
  }
}
</style>
