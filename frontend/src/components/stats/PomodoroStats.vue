<!-- 番茄统计组件 -->
<template>
  <div class="pomodoro-stats">
    <div class="stats-header">
      <h3 class="section-title">番茄统计</h3>
      <button class="refresh-btn" @click="refreshData" :disabled="loading">
        <span v-if="loading" class="loading-spinner-small"></span>
        <span v-else>刷新数据</span>
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载统计数据中...</p>
    </div>

    <div v-else-if="!hasData" class="empty-data">
      <div class="empty-icon">🍅</div>
      <p>暂无番茄专注数据</p>
      <p class="empty-tip">完成一些番茄专注后再来查看吧</p>
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

      <!-- 总结卡片 -->
      <div class="stats-overview">
        <div class="stat-card total-card">
          <div class="stat-icon">🍅</div>
          <div class="stat-label">累计番茄数</div>
          <div class="stat-value">{{ stats.totalPomodoros }}</div>
        </div>

        <div class="best-day-card" v-if="stats.bestDay.date">
          <div class="best-day-title">最佳专注日</div>
          <div class="best-day-date">{{ formatDate(stats.bestDay.date) }}</div>
          <div class="best-day-stats">
            <div class="best-day-item">
              <div class="item-label">番茄数</div>
              <div class="item-value">{{ stats.bestDay.tomatoHarvests }}</div>
            </div>
            <div class="best-day-item">
              <div class="item-label">专注时长</div>
              <div class="item-value">{{ formatMinutes(stats.bestDay.pomodoroMinutes) }}</div>
            </div>
            <div class="best-day-item">
              <div class="item-label">专注次数</div>
              <div class="item-value">{{ stats.bestDay.pomodoroCount }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 图表区域 -->
      <div class="charts-container">
        <!-- 番茄专注趋势图 -->
        <div class="chart-wrapper">
          <h4 class="chart-title">番茄专注趋势</h4>
          <div v-if="stats.trendData.length === 0" class="empty-chart">
            <p>暂无趋势数据</p>
          </div>
          <div v-else ref="pomodoroTrendChart" class="chart"></div>
        </div>

        <!-- 番茄时间分布图 -->
        <div class="chart-wrapper">
          <h4 class="chart-title">一天中专注分布</h4>
          <div v-if="stats.timeDistribution.length === 0" class="empty-chart">
            <p>暂无分布数据</p>
          </div>
          <div v-else ref="timeDistributionChart" class="chart"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed, nextTick, onBeforeUnmount, watch } from 'vue';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart, RadarChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  RadarComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import dbService, { PomodoroStatsResponse } from '../../services/DatabaseService';

// 注册必要的组件
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  RadarComponent,
  BarChart,
  LineChart,
  PieChart,
  RadarChart,
  CanvasRenderer
]);

// 图表引用
const pomodoroTrendChart = ref<HTMLElement | null>(null);
const timeDistributionChart = ref<HTMLElement | null>(null);

// 图表实例
let pomodoroTrendChartInstance: echarts.ECharts | null = null;
let timeDistributionChartInstance: echarts.ECharts | null = null;

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

// 自动刷新标记
const dataRefreshKey = ref(0);

// 自定义日期范围
const today = new Date();
const startDate = ref(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
const endDate = ref(today.toISOString().split('T')[0]);

// 初始化数据
const stats = reactive<PomodoroStatsResponse>({
  totalPomodoros: 0,
  bestDay: {
    date: '',
    pomodoroCount: 0,
    customCount: 0,
    totalFocusSessions: 0,
    pomodoroMinutes: 0,
    customMinutes: 0,
    totalFocusMinutes: 0,
    totalBreakMinutes: 0,
    tomatoHarvests: 0,
    timeRanges: []
  },
  trendData: [],
  timeDistribution: []
});

// 检查是否有数据
const hasData = computed(() => {
  return stats.totalPomodoros > 0 || stats.trendData.length > 0;
});

// 格式化日期
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

// 格式化分钟为时:分格式
const formatMinutes = (minutes: number): string => {
  if (minutes === 0) return '0分钟';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0
    ? `${hours}小时${mins > 0 ? mins + '分钟' : ''}`
    : `${mins}分钟`;
};

// 初始化番茄专注趋势图
const initPomodoroTrendChart = () => {
  if (!pomodoroTrendChart.value || stats.trendData.length === 0) return;

  console.log("正在初始化番茄趋势图，数据条数:", stats.trendData.length);

  // 初始化图表
  if (!pomodoroTrendChartInstance) {
    pomodoroTrendChartInstance = echarts.init(pomodoroTrendChart.value);
  }

  try {
    // 标准化数据，确保所有必要字段都是有效值
    const normalizedData = stats.trendData.map(item => ({
      date: item.date || '',
      pomodoroCount: typeof item.pomodoroCount === 'number' ? item.pomodoroCount : 0,
      tomatoHarvests: typeof item.tomatoHarvests === 'number' ? item.tomatoHarvests : 0,
      totalFocusMinutes: typeof item.totalFocusMinutes === 'number' ? item.totalFocusMinutes : 0
    }));

    // 准备数据
    const dates = normalizedData.map(item => {
      // 简化日期显示，只保留月/日格式
      const dateParts = item.date.split('-');
      if (dateParts.length >= 3) {
        return `${parseInt(dateParts[1])}/${parseInt(dateParts[2])}`;
      }
      return item.date.substring(5).replace('-', '/');
    });
    const pomodoroCountData = normalizedData.map(item => item.pomodoroCount || 0);
    const tomatoHarvestsData = normalizedData.map(item => item.tomatoHarvests || 0);

    // 计算合适的Y轴最大值
    const maxCount = Math.max(...pomodoroCountData, ...tomatoHarvestsData, 1);
    const maxY = Math.ceil(maxCount * 1.2); // 增加20%的空间

    // 图表主题色定义
    const pomodoroColor = '#ff6b6b';
    const harvestColor = '#ff9f43';

    // 配置选项
    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: function(params: Array<any>) {
          let result = params[0].name + '<br/>';
          params.forEach(item => {
            const markerSpan = `<span style="display:inline-block;margin-right:5px;border-radius:50%;width:10px;height:10px;background-color:${item.color};"></span>`;
            result += `${markerSpan}${item.seriesName}: ${item.value}<br/>`;
          });
          return result;
        }
      },
      legend: {
        data: ['专注次数', '番茄收成'],
        bottom: 0,
        textStyle: {
          color: '#333'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '3%',
        containLabel: true
      },
      xAxis: [
        {
          type: 'category',
          data: dates,
          axisLabel: {
            formatter: '{value}',
            color: '#666',
            interval: 0,
            rotate: dates.length > 7 ? 30 : 0 // 当数据过多时旋转标签
          },
          axisLine: {
            lineStyle: {
              color: '#ddd'
            }
          }
        }
      ],
      yAxis: [
        {
          type: 'value',
          name: '次数',
          min: 0,
          max: maxY,
          interval: Math.ceil(maxY / 5),
          minInterval: 1,
          axisLabel: {
            formatter: '{value}',
            color: '#666'
          },
          axisLine: {
            lineStyle: {
              color: '#ddd'
            }
          },
          splitLine: {
            lineStyle: {
              color: 'rgba(220,220,220,0.5)'
            }
          }
        }
      ],
      series: [
        {
          name: '专注次数',
          type: 'bar',
          barWidth: '40%',
          data: pomodoroCountData,
          itemStyle: {
            color: pomodoroColor,
            borderRadius: [3, 3, 0, 0]
          }
        },
        {
          name: '番茄收成',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          data: tomatoHarvestsData,
          itemStyle: {
            color: harvestColor
          },
          lineStyle: {
            width: 3,
            color: harvestColor
          }
        }
      ]
    };

    pomodoroTrendChartInstance.setOption(option);
  } catch (error) {
    console.error("初始化番茄趋势图失败:", error);
  }
};

const initTimeDistributionChart = () => {
  if (!timeDistributionChart.value || stats.timeDistribution.length === 0) return;

  // 初始化图表
  if (!timeDistributionChartInstance) {
    timeDistributionChartInstance = echarts.init(timeDistributionChart.value);
  }

  // 准备数据
  const hours = stats.timeDistribution.map(item => item.hour);
  const counts = stats.timeDistribution.map(item => item.count);

  // 计算最大值以设置合适的Y轴
  const maxCount = Math.max(...counts, 1);
  const maxY = Math.ceil(maxCount * 1.2);

  // 为每个小时准备标签
  const hourLabels = hours.map(hour => {
    return `${hour}:00`;
  });

  // 为柱状图设置渐变色
  const gradientColors = {
    morning: ['#ffeaa7', '#fdcb6e'],    // 早晨 (6-12点)
    afternoon: ['#81ecec', '#00cec9'],  // 下午 (12-18点)
    evening: ['#a29bfe', '#6c5ce7'],    // 晚上 (18-24点)
    night: ['#636e72', '#2d3436']       // 凌晨 (0-6点)
  };

  // 根据时间段设置不同的颜色
  const itemColors = hours.map(hour => {
    if (hour >= 6 && hour < 12) return {
      type: 'linear',
      x: 0, y: 0, x2: 0, y2: 1,
      colorStops: [
        {offset: 0, color: gradientColors.morning[0]},
        {offset: 1, color: gradientColors.morning[1]}
      ]
    };
    else if (hour >= 12 && hour < 18) return {
      type: 'linear',
      x: 0, y: 0, x2: 0, y2: 1,
      colorStops: [
        {offset: 0, color: gradientColors.afternoon[0]},
        {offset: 1, color: gradientColors.afternoon[1]}
      ]
    };
    else if (hour >= 18 && hour < 24) return {
      type: 'linear',
      x: 0, y: 0, x2: 0, y2: 1,
      colorStops: [
        {offset: 0, color: gradientColors.evening[0]},
        {offset: 1, color: gradientColors.evening[1]}
      ]
    };
    else return {
      type: 'linear',
      x: 0, y: 0, x2: 0, y2: 1,
      colorStops: [
        {offset: 0, color: gradientColors.night[0]},
        {offset: 1, color: gradientColors.night[1]}
      ]
    };
  });

  // 配置选项
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: function(params: Array<any>) {
        const item = params[0];
        const hour = hours[item.dataIndex];
        const nextHour = (hour + 1) % 24;
        return `${hour}:00 - ${nextHour}:00<br>${item.seriesName}: ${item.value}`;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '3%',
      containLabel: true
    },
    xAxis: [
      {
        type: 'category',
        data: hourLabels,
        // 确保刻度线与数据中心对齐
        axisTick: {
          alignWithLabel: true
        },
        axisLabel: {
          color: '#666',
          interval: function(index: number, value: string) {
            // 每4小时显示一次，或者是特殊时间点（如6:00, 12:00, 18:00, 0:00）
            return index % 4 === 0 || [0, 6, 12, 18].includes(hours[index]);
          },
          rotate: 0,
          fontSize: 11
        },
        axisLine: {
          lineStyle: {
            color: '#ddd'
          }
        }
      }
    ],
    yAxis: [
      {
        type: 'value',
        name: '专注次数',
        min: 0,
        max: maxY,
        interval: Math.ceil(maxY / 5),
        minInterval: 1,
        axisLabel: {
          color: '#666'
        },
        axisLine: {
          lineStyle: {
            color: '#ddd'
          }
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(220,220,220,0.5)'
          }
        }
      }
    ],
    series: [
      {
        name: '专注次数',
        type: 'bar',
        barWidth: '60%', // 更宽的柱形使显示更清晰
        // 确保柱子与刻度对齐
        barCategoryGap: '10%',
        data: counts.map((count, index) => ({
          value: count,
          itemStyle: {
            color: itemColors[index],
            borderRadius: [4, 4, 0, 0]
          }
        }))
      }
    ]
  };

  timeDistributionChartInstance.setOption(option);
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

// 加载番茄数据
const loadData = async () => {
  loading.value = true;

  try {
    // 获取日期范围
    let start = '';
    let end = '';

    switch (currentFilter.value) {
      case '7days':
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        start = sevenDaysAgo.toISOString().split('T')[0];
        end = new Date().toISOString().split('T')[0];
        break;
      case '30days':
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
        start = thirtyDaysAgo.toISOString().split('T')[0];
        end = new Date().toISOString().split('T')[0];
        break;
      case 'thisMonth':
        const firstDay = new Date();
        firstDay.setDate(1);
        start = firstDay.toISOString().split('T')[0];
        end = new Date().toISOString().split('T')[0];
        break;
      case 'custom':
        start = startDate.value;
        end = endDate.value;
        break;
    }

    console.log(`加载番茄统计数据，开始日期: ${start}, 结束日期: ${end}`);

    // 调用API获取数据
    const data = await dbService.getPomodoroStats(start, end);
    console.log("获取到的番茄统计数据:", data);

    // 检查数据是否为空
    if (!data ||
        !data.trendData || data.trendData.length === 0 ||
        !data.timeDistribution || data.timeDistribution.length === 0) {
      console.warn("获取到的数据为空或无效");
    }

    // 更新数据
    stats.totalPomodoros = data.totalPomodoros;
    stats.bestDay = data.bestDay;
    stats.trendData = data.trendData;
    stats.timeDistribution = data.timeDistribution;

    // 确保界面更新后绘制图表
    nextTick(() => {
      console.log("数据加载完成，绘制图表");
      initPomodoroTrendChart();
      initTimeDistributionChart();
    });
  } catch (error) {
    console.error("加载番茄统计数据失败:", error);
  } finally {
    loading.value = false;
  }
};

// 用于强制刷新数据
const refreshData = () => {
  console.log("手动刷新数据");
  dataRefreshKey.value++;
  loadData();
};

// 设置自动刷新
const setupAutoRefresh = () => {
  // 当窗口重新获得焦点时刷新数据
  window.addEventListener('focus', () => {
    console.log("窗口获得焦点，自动刷新数据");
    refreshData();
  });

  // 设置定时器定期刷新数据（每5分钟一次）
  const interval = setInterval(() => {
    console.log("定时刷新数据");
    refreshData();
  }, 5 * 60 * 1000);

  // 组件卸载时清理
  onBeforeUnmount(() => {
    window.removeEventListener('focus', refreshData);
    clearInterval(interval);
  });
};

// 组件挂载时获取数据
onMounted(() => {
  loadData();
  setupAutoRefresh();
});

// 监听刷新键，自动重载数据
watch(dataRefreshKey, () => {
  if (dataRefreshKey.value > 0) {
    loadData();
  }
});

// 窗口大小改变时重绘图表
const handleResize = () => {
  pomodoroTrendChartInstance?.resize();
  timeDistributionChartInstance?.resize();
};

window.addEventListener('resize', handleResize);

// 组件卸载时移除事件监听
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);

  // 销毁图表实例
  pomodoroTrendChartInstance?.dispose();
  timeDistributionChartInstance?.dispose();
});
</script>

<style scoped>
.pomodoro-stats {
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
  background-color: #FF6347;
  color: white;
  border-color: #FF6347;
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

.stats-overview {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 20px;
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

.total-card {
  background: linear-gradient(135deg, #FF6347, #FF8C69);
  color: white;
}

.stat-icon {
  font-size: 36px;
  margin-bottom: 10px;
}

.stat-label {
  font-size: 16px;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
}

.best-day-card {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.best-day-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 8px;
  color: #333;
}

.best-day-date {
  font-size: 20px;
  font-weight: bold;
  color: #FF6347;
  margin-bottom: 16px;
}

.best-day-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.best-day-item {
  background-color: rgba(255, 99, 71, 0.1);
  padding: 10px;
  border-radius: 6px;
  text-align: center;
}

.item-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.item-value {
  font-size: 18px;
  font-weight: bold;
  color: #FF6347;
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
  border-left-color: #FF6347;
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
  .stats-overview {
    grid-template-columns: 1fr;
  }

  .charts-container {
    grid-template-columns: 1fr;
  }
}

:root[data-theme="dark"] .section-title,
:root[data-theme="dark"] .chart-title,
:root[data-theme="dark"] .best-day-title {
  color: #E5EAF3;
}

:root[data-theme="dark"] .stat-card,
:root[data-theme="dark"] .best-day-card,
:root[data-theme="dark"] .chart-wrapper {
  background-color: #252D3C;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
}

:root[data-theme="dark"] .filter-btn {
  background-color: #252D3C;
  border-color: #4C5D7A;
  color: #E5EAF3;
}

:root[data-theme="dark"] .best-day-item {
  background-color: rgba(255, 99, 71, 0.15);
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

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.refresh-btn {
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
}

.refresh-btn:hover {
  background-color: #e8e8e8;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner-small {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #333;
  animation: spin 1s linear infinite;
}

/* 成功提示样式 */
:global(.success-toast) {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(46, 204, 113, 0.9);
  color: white;
  padding: 10px 20px;
  border-radius: 4px;
  z-index: 9999;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16);
  animation: toast-fade-in 0.3s ease;
}

:global(.toast-fade-out) {
  opacity: 0;
  transition: opacity 0.3s ease;
}

@keyframes toast-fade-in {
  from { opacity: 0; transform: translate(-50%, 20px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
