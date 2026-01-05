<!-- 昨日小结组件 -->
<template>
  <div class="daily-summary">
    <div class="stats-header">
      <div class="section-header">昨日小结</div>
      <!-- 修改刷新按钮为大图标风格 -->
      <button class="refresh-btn" @click="refreshData" :disabled="loading" title="刷新数据">
        <n-icon v-if="!loading" :size="28" class="refresh-icon">
          <ArrowSyncCircle24Regular />
        </n-icon>
        <span v-else class="loading-spinner-small"></span>
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <n-spin size="medium" />
      <span class="loading-text">加载数据中...</span>
    </div>

    <!-- 无数据状态 -->
    <div v-else-if="!hasSummaryData" class="empty-container">
      <n-empty description="暂无专注数据" size="small">
        <!-- 移除这里的刷新按钮，因为已经在顶部添加了 -->
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { NIcon, NSpin, NEmpty, NButton } from 'naive-ui';
import { Timer, CheckmarkDone, TimeOutline } from '@vicons/ionicons5';
import { ArrowSyncCircle24Regular } from '@vicons/fluent';
import WeekTrendChart from './WeekTrendChart.vue';
import dbService from '../../services/DatabaseService';
import type { DailyTrendData } from '../../services/DatabaseService';
import { eventBus, EventNames } from '../../utils/eventBus';

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
const fetchData = async (force: boolean = false) => {
  loading.value = true;
  try {
    // 获取统计摘要
    const summaryData = await dbService.getStatsSummary(force);
    if (summaryData) {
      summary.value = summaryData;
      console.log('摘要数据加载成功:', JSON.stringify(summary.value));
    } else {
      console.warn('摘要数据为空');
    }

    // 获取周趋势数据
    console.log('开始获取周趋势数据...');
    const trendData = await dbService.getDailySummary(force);
    console.log('DailySummary 组件收到的周趋势数据:', JSON.stringify(trendData));

    // 验证weekTrend属性
    if (!trendData || !trendData.weekTrend) {
      console.warn('周趋势数据无效或为空');
      weekTrend.value = [];
    } else if (!Array.isArray(trendData.weekTrend)) {
      console.warn('周趋势数据不是数组', trendData.weekTrend);
      weekTrend.value = [];
    } else if (trendData.weekTrend.length === 0) {
      console.warn('周趋势数据数组为空');
      weekTrend.value = [];
    } else {
      console.log(`获取到 ${trendData.weekTrend.length} 天的趋势数据`);

      // 标准化每一天的数据，确保所有必要的字段都存在且类型正确
      weekTrend.value = trendData.weekTrend.map(item => {
        // 创建新对象，避免直接修改原始数据
        const normalizedItem = {
          date: item.date || '',
          totalFocusMinutes: typeof item.totalFocusMinutes === 'number' ? item.totalFocusMinutes : 0,
          pomodoroMinutes: typeof item.pomodoroMinutes === 'number' ? item.pomodoroMinutes : 0,
          customMinutes: typeof item.customMinutes === 'number' ? item.customMinutes : 0,
          pomodoroCount: typeof item.pomodoroCount === 'number' ? item.pomodoroCount : 0,
          tomatoHarvests: typeof item.tomatoHarvests === 'number' ? item.tomatoHarvests : 0,
          completedTasks: typeof item.completedTasks === 'number' ? item.completedTasks : 0
        };

        // 记录每天的专注分钟数，方便调试
        console.log(`日期 ${normalizedItem.date} 的专注时长: ${normalizedItem.totalFocusMinutes}分钟`);

        return normalizedItem;
      });

      console.log('处理后的周趋势数据:', JSON.stringify(weekTrend.value));

      // 验证处理后的数据是否有效
      const hasValidData = weekTrend.value.some(item =>
        (item.totalFocusMinutes ?? 0) > 0 ||
        (item.pomodoroCount ?? 0) > 0 ||
        (item.completedTasks ?? 0) > 0
      );
      if (!hasValidData) {
        console.warn('处理后的趋势数据没有有效值，图表可能显示为空');
      }
    }
  } catch (error) {
    console.error('获取统计数据失败:', error);
    weekTrend.value = []; // 错误时重置数据
  } finally {
    // 使用setTimeout确保DOM更新和数据绑定完成后再结束加载状态
    setTimeout(() => {
      loading.value = false;
    }, 300);
  }
};

// 刷新数据
const refreshData = () => {
  loading.value = true;
  fetchData(true).finally(() => {
    loading.value = false;
  });
};

// 处理统计数据更新事件
const handleStatsUpdated = () => {
  console.log('[DailySummary] 收到统计数据更新通知，强制刷新数据');
  fetchData(true);
};

// 设置自动刷新
let refreshInterval: number | null = null;

const setupAutoRefresh = () => {
  // 当窗口重新获得焦点时刷新数据
  const handleFocus = () => {
    console.log('[DailySummary] 窗口获得焦点，自动刷新数据');
    refreshData();
  };
  window.addEventListener('focus', handleFocus);

  // 设置定时器定期刷新数据（每30秒一次）
  refreshInterval = window.setInterval(() => {
    console.log('[DailySummary] 定时自动刷新数据');
    refreshData();
  }, 30 * 1000); // 从5分钟改为30秒

  // 组件卸载时清理
  onBeforeUnmount(() => {
    window.removeEventListener('focus', handleFocus);
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });
};

// 组件挂载时获取数据
onMounted(() => {
  // 订阅统计数据更新事件
  eventBus.on(EventNames.STATS_UPDATED, handleStatsUpdated);
  
  // 使用setTimeout确保DOM已渲染
  setTimeout(() => {
    console.log('[DailySummary] 组件已挂载，开始获取数据');
    fetchData().then(() => {
      console.log('[DailySummary] 初始数据加载完成');
    }).catch(error => {
      console.error('[DailySummary] 初始数据加载失败:', error);
    });
    setupAutoRefresh();
  }, 100);
});

// 组件卸载前清理
onBeforeUnmount(() => {
  // 取消事件订阅
  eventBus.off(EventNames.STATS_UPDATED, handleStatsUpdated);
});
</script>

<style scoped>
.daily-summary {
  padding: 20px;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.section-header {
  font-size: 18px;
  font-weight: 600;
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

/* 刷新按钮样式 */
.refresh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 50%;
  border: none;
  background-color: transparent;
  cursor: pointer;
  transition: all 0.2s;
  color: #606266;
  width: 36px;
  height: 36px;
}

.refresh-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-icon {
  font-size: 14px;
  /* 移除旋转动画 */
}

.loading-spinner-small {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #333;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 深色主题适配 */
:root[data-theme="dark"] .section-header {
  color: #e5eaf3;
}

:root[data-theme="dark"] .refresh-btn {
  color: #e5eaf3;
}

:root[data-theme="dark"] .refresh-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

:root[data-theme="dark"] .loading-spinner-small {
  border-color: rgba(255, 255, 255, 0.1);
  border-top-color: #e5eaf3;
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
