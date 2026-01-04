<template>
  <div class="stats-view">
    <n-card class="stats-card">
      <n-tabs type="line" animated>
        <n-tab-pane name="daily" tab="每日小结">
          <DailySummary />
        </n-tab-pane>
        <n-tab-pane name="pomodoro" tab="番茄统计">
          <PomodoroStats />
        </n-tab-pane>
        <n-tab-pane name="event" tab="任务统计">
          <EventStats />
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { NCard, NTabs, NTabPane } from 'naive-ui';
import DailySummary from './DailySummary.vue';
import PomodoroStats from './PomodoroStats.vue';
import EventStats from './EventStats.vue';
import { provide, ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
// 导入必要的API函数
import { UpdateStats } from '../../../wailsjs/go/main/App';
// 导入事件总线
import { eventBus, EventNames } from '../../utils/eventBus';

// 提供全局加载状态
const isLoading = ref(false);
const errorMessage = ref('');
const lastRefreshTime = ref(Date.now());

// 提供给子组件
provide('isLoading', isLoading);
provide('errorMessage', errorMessage);
provide('lastRefreshTime', lastRefreshTime);

// 设置全局加载状态
const setGlobalLoading = (loading: boolean) => {
  isLoading.value = loading;
};

// 设置错误消息
const setGlobalError = (message: string) => {
  errorMessage.value = message;
};

// 更新最后刷新时间
const updateLastRefreshTime = () => {
  lastRefreshTime.value = Date.now();
};

// 提供给子组件的方法
provide('setGlobalLoading', setGlobalLoading);
provide('setGlobalError', setGlobalError);
provide('updateLastRefreshTime', updateLastRefreshTime);

// 刷新统计数据的方法
const refreshStats = async () => {
  console.log('[StatsView] 开始刷新统计数据');
  isLoading.value = true;
  errorMessage.value = '';

  try {
    // 使用导入的API函数更新统计
    await UpdateStats('');
    console.log('[StatsView] 统计数据更新成功');
    
    // 更新最后刷新时间
    updateLastRefreshTime();
    
    // 通过事件总线通知所有子组件刷新
    eventBus.emit(EventNames.STATS_UPDATED);
    
    // 延迟一小段时间再关闭加载状态，确保子组件有时间获取新数据
    setTimeout(() => {
      isLoading.value = false;
    }, 200);
  } catch (error) {
    console.error('[StatsView] 更新统计数据失败:', error);
    errorMessage.value = '无法更新统计数据，请稍后重试';
    isLoading.value = false;
  }
};

// 监听来自其他组件的刷新请求
const handleRefreshRequest = () => {
  console.log('[StatsView] 收到数据刷新请求');
  refreshStats();
};

// 组件挂载时初始化
onMounted(async () => {
  // 订阅刷新请求事件
  eventBus.on(EventNames.REQUEST_DATA_REFRESH, handleRefreshRequest);
  eventBus.on(EventNames.FOCUS_SESSION_COMPLETED, handleRefreshRequest);
  eventBus.on(EventNames.POMODORO_COMPLETED, handleRefreshRequest);
  eventBus.on(EventNames.TODO_COMPLETED, handleRefreshRequest);
  
  // 初始化时刷新一次
  await refreshStats();
});

// 组件卸载前清理
onBeforeUnmount(() => {
  // 取消事件订阅
  eventBus.off(EventNames.REQUEST_DATA_REFRESH, handleRefreshRequest);
  eventBus.off(EventNames.FOCUS_SESSION_COMPLETED, handleRefreshRequest);
  eventBus.off(EventNames.POMODORO_COMPLETED, handleRefreshRequest);
  eventBus.off(EventNames.TODO_COMPLETED, handleRefreshRequest);
});
</script>

<style scoped>
.stats-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.stats-card {
  border-radius: 8px;
  overflow: hidden; /* 防止内容溢出 */
}

:deep(.n-tabs-nav) {
  padding: 0 10px;
}

:deep(.n-tab-pane) {
  padding: 10px 0;
}

@media (max-width: 768px) {
  .stats-view {
    padding: 10px;
  }
}

:root[data-theme="dark"] .stats-view {
  background-color: transparent;
}
</style>
