<!-- 昨日小结组件 -->
<template>
  <div class="daily-summary">
    <div class="section-header">昨日小结</div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <n-spin size="medium" />
      <span class="loading-text">加载数据中...</span>
    </div>

    <!-- 无数据状态 -->
    <div v-else-if="!hasSummaryData" class="empty-container">
      <n-empty description="暂无专注数据" size="small">
        <template #extra>
          <n-button size="small" @click="refreshData">刷新数据</n-button>
        </template>
      </n-empty>
    </div>

    <!-- 数据展示 -->
    <div v-else class="summary-content">
      <div class="summary-item">
        <div class="item-count">{{ summary.todayCompletedPomodoros || 0 }}</div>
        <div class="item-title">
          <n-icon class="item-icon tomato"><Timer /></n-icon>
          <span>完成番茄</span>
        </div>
      </div>
      <div class="summary-item">
        <div class="item-count">{{ summary.todayCompletedTasks || 0 }}</div>
        <div class="item-title">
          <n-icon class="item-icon task"><CheckmarkDone /></n-icon>
          <span>完成任务</span>
        </div>
      </div>
      <div class="summary-item">
        <div class="item-count">{{ formatTotalTime }}</div>
        <div class="item-title">
          <n-icon class="item-icon time"><TimeOutline /></n-icon>
          <span>专注时长</span>
        </div>
      </div>
    </div>

    <!-- 周趋势图 -->
    <div v-if="!loading && hasTrendData" class="trend-section">
      <div class="section-title">本周趋势</div>
      <WeekTrendChart :week-data="weekTrend" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { NIcon, NSpin, NEmpty, NButton } from 'naive-ui';
import { Timer, CheckmarkDone, TimeOutline } from '@vicons/ionicons5';
import WeekTrendChart from './WeekTrendChart.vue';
import dbService from '../../services/DatabaseService';
import type { DailyTrendData } from '../../services/DatabaseService';

// 定义StatSummary类型
interface StatSummary {
  todayCompletedPomodoros: number;
  todayCompletedTasks: number;
  todayFocusTime: number;
  weekCompletedPomodoros: number;
  weekCompletedTasks: number;
  weekFocusTime: number;
}

// 加载状态
const loading = ref(true);
// 统计摘要数据
const summary = ref<StatSummary>({
  todayCompletedPomodoros: 0,
  todayCompletedTasks: 0,
  todayFocusTime: 0,
  weekCompletedPomodoros: 0,
  weekCompletedTasks: 0,
  weekFocusTime: 0
});
// 周趋势数据
const weekTrend = ref<DailyTrendData[]>([]);

// 格式化专注时长
const formatTotalTime = computed(() => {
  const minutes = Math.floor((summary.value.todayFocusTime || 0) / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  } else {
    return `${minutes}m`;
  }
});

// 判断是否有摘要数据
const hasSummaryData = computed(() => {
  return (
    (summary.value.todayCompletedPomodoros || 0) > 0 ||
    (summary.value.todayCompletedTasks || 0) > 0 ||
    (summary.value.todayFocusTime || 0) > 0
  );
});

// 判断是否有趋势数据
const hasTrendData = computed(() => {
  return weekTrend.value && weekTrend.value.length > 0;
});

// 获取统计数据
const fetchData = async () => {
  loading.value = true;
  try {
    // 获取统计摘要
    const summaryData = await dbService.getStatsSummary();
    if (summaryData) {
      summary.value = summaryData;
    }

    // 获取周趋势数据
    const trendData = await dbService.getDailySummary();
    if (trendData && trendData.weekTrend && trendData.weekTrend.length > 0) {
      weekTrend.value = trendData.weekTrend;
    }
  } catch (error) {
    console.error('获取统计数据失败:', error);
  } finally {
    loading.value = false;
  }
};

// 刷新数据
const refreshData = () => {
  fetchData();
};

// 组件挂载时获取数据
onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.daily-summary {
  padding: 20px;
}

.section-header {
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 20px;
  color: #333;
}

.summary-content {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 30px;
}

.summary-item {
  flex: 1;
  background: white;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.item-count {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 10px;
}

.item-title {
  display: flex;
  align-items: center;
  color: #606266;
  font-size: 14px;
}

.item-icon {
  margin-right: 5px;
}

.item-icon.tomato {
  color: #ff6b6b;
}

.item-icon.task {
  color: #20bf6b;
}

.item-icon.time {
  color: #4b7bec;
}

.trend-section {
  margin-top: 20px;
}

.section-title {
  font-size: 16px;
  margin-bottom: 15px;
  color: #606266;
}

.loading-container, .empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 10px;
}

.loading-text {
  color: #909399;
  margin-top: 10px;
}

:root[data-theme="dark"] .section-header {
  color: #E5EAF3;
}

:root[data-theme="dark"] .summary-item {
  background: #252D3C;
}

:root[data-theme="dark"] .item-title {
  color: #A3ABB2;
}

:root[data-theme="dark"] .section-title {
  color: #A3ABB2;
}
</style>
