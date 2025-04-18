<!-- 事件统计组件 -->
<template>
  <div class="event-stats">
    <h3 class="section-title">事件统计</h3>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载统计数据中...</p>
    </div>

    <div v-else-if="!hasData" class="empty-data">
      <div class="empty-icon">📋</div>
      <p>暂无事件统计数据</p>
      <p class="empty-tip">完成一些任务后再来查看吧</p>
    </div>

    <div v-else>
      <!-- 时间筛选 -->
      <div class="time-filter">
        <div class="filter-label">时间范围：</div>
        <div class="filter-buttons">
          <button
            v-for="filter in timeFilters"
            :key="filter.value"
            :class="['filter-btn', { active: currentFilter === filter.value }]"
            @click="changeTimeFilter(filter.value)"
          >
            {{ filter.label }}
          </button>
        </div>
        <div class="custom-date-range" v-if="currentFilter === 'custom'">
          <input type="date" v-model="startDate" @change="loadData" />
          <span>至</span>
          <input type="date" v-model="endDate" @change="loadData" />
        </div>
      </div>

      <!-- 统计卡片 -->
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-icon">📝</div>
          <div class="stat-label">事件总数</div>
          <div class="stat-value">{{ stats.totalEvents }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-label">已完成事件</div>
          <div class="stat-value">{{ stats.completedEvents }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏆</div>
          <div class="stat-label">完成率</div>
          <div class="stat-value">{{ stats.completionRate }}</div>
        </div>
      </div>

      <!-- 图表区域 -->
      <div class="charts-container">
        <!-- 完成率环形图 -->
        <div class="chart-wrapper">
          <h4 class="chart-title">事件完成率</h4>
          <div v-if="parseFloat(stats.completionRate) === 0" class="empty-chart">
            <p>暂无完成率数据</p>
          </div>
          <div v-else ref="completionRateChart" class="chart"></div>
        </div>

        <!-- 工作量趋势图 -->
        <div class="chart-wrapper">
          <h4 class="chart-title">工作量趋势</h4>
          <div v-if="stats.trendData.length === 0" class="empty-chart">
            <p>暂无趋势数据</p>
          </div>
          <div v-else ref="workloadTrendChart" class="chart"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed, nextTick, onBeforeUnmount } from 'vue';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import dbService, { EventStatsResponse } from '../../services/DatabaseService';

// 注册必要的组件
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  BarChart,
  LineChart,
  PieChart,
  CanvasRenderer
]);

// 图表引用
const completionRateChart = ref<HTMLElement | null>(null);
const workloadTrendChart = ref<HTMLElement | null>(null);

// 图表实例
let completionRateChartInstance: echarts.ECharts | null = null;
let workloadTrendChartInstance: echarts.ECharts | null = null;

// 加载状态
const loading = ref(true);

// 时间过滤器选项
const timeFilters = [
  { label: '近7天', value: '7days' },
  { label: '近30天', value: '30days' },
  { label: '本月', value: 'thisMonth' },
  { label: '自定义', value: 'custom' }
];

// 当前选中的过滤器
const currentFilter = ref('7days');

// 自定义日期范围
const today = new Date();
const startDate = ref(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
const endDate = ref(today.toISOString().split('T')[0]);

// 初始化数据
const stats = reactive<EventStatsResponse>({
  totalEvents: 0,
  completedEvents: 0,
  completionRate: "0.00",
  trendData: []
});

// 检查是否有数据
const hasData = computed(() => {
  return stats.totalEvents > 0 || stats.trendData.length > 0;
});

// 格式化分钟为时:分格式
const formatMinutes = (minutes: number): string => {
  if (minutes === 0) return '0分钟';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0
    ? `${hours}小时${mins > 0 ? mins + '分钟' : ''}`
    : `${mins}分钟`;
};

// 初始化完成率环形图
const initCompletionRateChart = () => {
  if (!completionRateChart.value) return;
  if (parseFloat(stats.completionRate) === 0) return;

  // 初始化图表
  if (!completionRateChartInstance) {
    completionRateChartInstance = echarts.init(completionRateChart.value);
  }

  // 准备数据
  const completionRate = parseFloat(stats.completionRate);
  const pendingRate = 100 - completionRate;

  // 配置选项
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'horizontal',
      bottom: 0,
      data: ['已完成', '未完成']
    },
    series: [
      {
        name: '事件状态',
        type: 'pie',
        radius: ['50%', '70%'],
        avoidLabelOverlap: false,
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: [
          {
            value: completionRate,
            name: '已完成',
            itemStyle: { color: '#67C23A' }
          },
          {
            value: pendingRate,
            name: '未完成',
            itemStyle: { color: '#E6A23C' }
          }
        ]
      }
    ]
  };

  // 设置选项并渲染
  completionRateChartInstance.setOption(option);
};

// 初始化工作量趋势图
const initWorkloadTrendChart = () => {
  if (!workloadTrendChart.value || stats.trendData.length === 0) return;

  // 初始化图表
  if (!workloadTrendChartInstance) {
    workloadTrendChartInstance = echarts.init(workloadTrendChart.value);
  }

  // 准备数据
  const dates = stats.trendData.map(item => {
    // 简化日期显示，只保留月/日格式
    const dateParts = item.date.split('-');
    if (dateParts.length >= 3) {
      return `${parseInt(dateParts[1])}/${parseInt(dateParts[2])}`;
    }
    return item.date.substring(5).replace('-', '/');
  });
  const focusData = stats.trendData.map(item => item.totalFocusMinutes || 0);

  // 配置选项
  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: function(params: any) {
        let result = params[0].name + '<br/>';
        params.forEach((item: any) => {
          result += item.seriesName + ': ' + formatMinutes(item.value) + '<br/>';
        });
        return result;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '5%',
      top: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLabel: {
        formatter: '{value}'
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => {
          return Math.floor(value / 60) + 'h';
        }
      }
    },
    series: [
      {
        name: '专注时长',
        type: 'line',
        stack: 'Total',
        data: focusData,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: 'rgba(58, 130, 246, 0.6)'
              },
              {
                offset: 1,
                color: 'rgba(58, 130, 246, 0.1)'
              }
            ]
          }
        },
        itemStyle: {
          color: '#3A82F6'
        },
        smooth: true
      }
    ]
  };

  // 设置选项并渲染
  workloadTrendChartInstance.setOption(option);
};

// 切换时间过滤器
const changeTimeFilter = (filterValue: string) => {
  currentFilter.value = filterValue;

  // 设置日期范围
  const today = new Date();
  switch (filterValue) {
    case '7days':
      startDate.value = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      endDate.value = today.toISOString().split('T')[0];
      break;
    case '30days':
      startDate.value = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      endDate.value = today.toISOString().split('T')[0];
      break;
    case 'thisMonth':
      startDate.value = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      endDate.value = today.toISOString().split('T')[0];
      break;
    // 自定义日期不需要在这里设置
  }

  // 加载数据
  loadData();
};

// 加载数据
const loadData = async () => {
  loading.value = true;
  try {
    const response = await dbService.getEventStats(startDate.value, endDate.value);
    // 更新数据
    Object.assign(stats, response);

    // 重新初始化图表
    nextTick(() => {
      initCompletionRateChart();
      initWorkloadTrendChart();
      loading.value = false;
    });
  } catch (error) {
    console.error('加载事件统计数据失败:', error);
    loading.value = false;
  }
};

// 窗口大小改变时重绘图表
const handleResize = () => {
  completionRateChartInstance?.resize();
  workloadTrendChartInstance?.resize();
};

window.addEventListener('resize', handleResize);

// 组件卸载时移除事件监听
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);

  // 销毁图表实例
  completionRateChartInstance?.dispose();
  workloadTrendChartInstance?.dispose();
});

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.event-stats {
  padding: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 20px;
  color: #333;
}

.time-filter {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-label {
  margin-right: 10px;
  font-size: 14px;
  color: #606266;
}

.filter-buttons {
  display: flex;
  gap: 10px;
}

.filter-btn {
  padding: 6px 12px;
  border: 1px solid #DCDFE6;
  border-radius: 4px;
  background-color: white;
  color: #606266;
  cursor: pointer;
  transition: all 0.3s;
}

.filter-btn:hover {
  border-color: #C0C4CC;
}

.filter-btn.active {
  background-color: #3A82F6;
  color: white;
  border-color: #3A82F6;
}

.custom-date-range {
  margin-left: 10px;
  display: flex;
  align-items: center;
}

.custom-date-range input {
  padding: 6px;
  border: 1px solid #DCDFE6;
  border-radius: 4px;
}

.custom-date-range span {
  margin: 0 5px;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-3px);
}

.stat-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #3A82F6;
}

.charts-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.chart-wrapper {
  background-color: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.chart-title {
  font-size: 16px;
  margin-bottom: 16px;
  text-align: center;
  color: #333;
}

.chart {
  height: 300px;
  width: 100%;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #909399;
}

.loading-spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border-left-color: #3A82F6;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.empty-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #909399;
}

.empty-chart {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
  color: #909399;
}

.empty-icon {
  font-size: 36px;
  margin-bottom: 16px;
}

.empty-tip {
  font-size: 14px;
  color: #C0C4CC;
  margin-top: 8px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .charts-container {
    grid-template-columns: 1fr;
  }

  .time-filter {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .custom-date-range {
    margin-left: 0;
  }
}

:root[data-theme="dark"] .section-title,
:root[data-theme="dark"] .chart-title {
  color: #E5EAF3;
}

:root[data-theme="dark"] .stat-card,
:root[data-theme="dark"] .chart-wrapper {
  background-color: #252D3C;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
}

:root[data-theme="dark"] .filter-btn {
  background-color: #252D3C;
  border-color: #4C5D7A;
  color: #E5EAF3;
}

:root[data-theme="dark"] .custom-date-range input {
  background-color: #252D3C;
  border-color: #4C5D7A;
  color: #E5EAF3;
}

:root[data-theme="dark"] .empty-chart,
:root[data-theme="dark"] .empty-data {
  color: #909399;
}
</style>
