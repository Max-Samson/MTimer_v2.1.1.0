<!-- 事件统计组件 -->
<template>
  <div class="event-stats">
    <h3 class="section-title">事件统计</h3>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载统计数据中...</p>
      <!-- 添加超时按钮，允许用户手动跳过加载 -->
      <button @click="forceStopLoading" class="force-stop-btn">跳过加载</button>
    </div>

    <div v-else-if="stats.totalEvents === 0 && (!stats.trendData || stats.trendData.length === 0)" class="empty-data">
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
        <div class="refresh-controls">
          <button
            class="refresh-btn"
            @click="loadData"
            :disabled="loading"
            title="立即刷新数据"
          >
            <span class="refresh-icon" :class="{ 'spinning': loading }">🔄</span>
          </button>
          <button
            class="auto-refresh-btn"
            :class="{ active: autoRefresh }"
            @click="toggleAutoRefresh"
            title="每分钟自动刷新数据"
          >
            {{ autoRefresh ? '停止自动刷新' : '自动刷新' }}
          </button>
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
          <div v-if="!chartVisible || (stats.totalEvents === 0 && parseFloat(stats.completionRate.replace('%', '')) === 0)" class="empty-chart">
            <p>暂无完成率数据</p>
          </div>
          <div v-else ref="completionRateChart" class="chart"></div>
        </div>

        <!-- 工作量趋势图 -->
        <div class="chart-wrapper">
          <h4 class="chart-title">工作量趋势</h4>
          <div v-if="!chartVisible || !stats.trendData || stats.trendData.length === 0" class="empty-chart">
            <p>暂无趋势数据</p>
          </div>
          <div v-else ref="workloadTrendChart" class="chart"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed, nextTick, onBeforeUnmount, inject } from 'vue';
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

// 获取全局数据状态方法
const setGlobalLoading = inject('setGlobalLoading') as ((loading: boolean) => void) | undefined;
const setGlobalError = inject('setGlobalError') as ((message: string) => void) | undefined;
const updateLastRefreshTime = inject('updateLastRefreshTime') as (() => void) | undefined;

// 加载状态
const loading = ref(true);
const autoRefresh = ref(false);
let refreshTimer: number | null = null;

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
  // 添加调试日志
  console.log('检查数据状态:', {
    totalEvents: stats.totalEvents,
    completedEvents: stats.completedEvents,
    completionRate: stats.completionRate,
    trendDataLength: stats.trendData?.length || 0,
    hasTrendData: Array.isArray(stats.trendData) && stats.trendData.length > 0
  });

  // 直接简化判断逻辑，只要有任何一种统计数据，就认为有数据
  const hasTotalEvents = stats.totalEvents > 0;
  const hasTrendData = Array.isArray(stats.trendData) && stats.trendData.length > 0;

  // 放宽条件，在有趋势数据的情况下，不再检查数据是否都为0
  return hasTotalEvents || hasTrendData;
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

// 检查当前主题
const isDarkTheme = computed(() => {
  return document.documentElement.getAttribute('data-theme') === 'dark';
});

// 监听主题变化
const updateChartsTheme = () => {
  if (completionRateChartInstance) {
    completionRateChartInstance.dispose();
    completionRateChartInstance = null;
    if (completionRateChart.value && parseFloat(stats.completionRate) > 0) {
      initCompletionRateChart();
    }
  }

  if (workloadTrendChartInstance) {
    workloadTrendChartInstance.dispose();
    workloadTrendChartInstance = null;
    if (workloadTrendChart.value && stats.trendData && stats.trendData.length > 0) {
      initWorkloadTrendChart();
    }
  }
};

// 加载数据
const loadData = async () => {
  // 如果已经在加载中，则跳过
  if (loading.value) {
    console.log('数据正在加载中，跳过此次刷新');
    return;
  }

  // 设置加载超时定时器 - 10秒后自动停止加载
  let loadingTimeout: number | null = window.setTimeout(() => {
    console.warn('加载数据超时（10秒）');
    forceStopLoading();
  }, 10000);

  console.log(`开始加载事件统计数据，时间范围: ${startDate.value} - ${endDate.value}`);
  loading.value = true;
  // 同步更新全局加载状态
  setGlobalLoading?.(true);

  try {
    // 直接使用eventStats接口获取数据
    const response = await Promise.race([
      dbService.getEventStats(startDate.value, endDate.value),
      // 5秒后自动返回空数据，避免永久等待
      new Promise<EventStatsResponse>((resolve) => {
        setTimeout(() => {
          console.warn('API请求超时，返回空数据');
          resolve({
            totalEvents: 0,
            completedEvents: 0,
            completionRate: '0%',
            trendData: []
          });
        }, 5000);
      })
    ]);

    // 清除超时定时器
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      loadingTimeout = null;
    }

    // 记录到控制台，便于调试
    console.log('收到事件统计数据:', JSON.stringify(response));

    // 更新数据，确保所有字段都有有效值
    const processedData = {
      totalEvents: typeof response.totalEvents === 'number' ? response.totalEvents : 0,
      completedEvents: typeof response.completedEvents === 'number' ? response.completedEvents : 0,
      completionRate: typeof response.completionRate === 'string' ? response.completionRate : '0%',
      trendData: Array.isArray(response.trendData) ? [...response.trendData] : []
    };

    // 如果数据是空的，显示样例数据以便于调试
    if (processedData.totalEvents === 0 && (!processedData.trendData || processedData.trendData.length === 0)) {
      console.log('接收到空数据，停止加载');
      Object.assign(stats, processedData);
      completeLoading();
      return;
    }

    // 如果完成率不是百分数格式，添加百分号
    if (processedData.completionRate && !processedData.completionRate.includes('%')) {
      processedData.completionRate = `${processedData.completionRate}%`;
    }

    // 确保趋势数据中的每项都有日期和专注时间
    if (processedData.trendData.length > 0) {
      processedData.trendData = processedData.trendData.map(item => ({
        date: item.date || new Date().toISOString().split('T')[0],
        totalFocusMinutes: typeof item.totalFocusMinutes === 'number' ? item.totalFocusMinutes : 0
      })).filter(item => !!item.date); // 过滤掉没有日期的项
    }

    console.log('处理后的数据:', JSON.stringify(processedData));

    // 更新响应式数据对象
    Object.assign(stats, processedData);

    console.log('数据更新后状态:', {
      totalEvents: stats.totalEvents,
      completedEvents: stats.completedEvents,
      completionRate: stats.completionRate,
      trendDataLength: stats.trendData?.length || 0
    });

    // 确保趋势数据是按日期排序的
    if (stats.trendData && stats.trendData.length > 0) {
      stats.trendData.sort((a, b) => {
        const dateA = new Date(a.date || '1970-01-01');
        const dateB = new Date(b.date || '1970-01-01');
        return dateA.getTime() - dateB.getTime();
      });
    }

    // 更新最后刷新时间
    updateLastRefreshTime?.();

    // 重置错误状态
    setGlobalError?.('');

    // 使用通用的完成加载方法
    completeLoading();
  } catch (error) {
    // 清除超时定时器
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      loadingTimeout = null;
    }

    console.error('加载事件统计数据失败:', error);
    // 设置错误状态
    setGlobalError?.('加载事件统计数据失败，请稍后重试');

    // 重置数据，确保显示暂无数据
    Object.assign(stats, {
      totalEvents: 0,
      completedEvents: 0,
      completionRate: '0%',
      trendData: []
    });

    // 确保加载状态结束
    completeLoading();
  }
};

// 图表可见性状态
const chartVisible = ref(false);

// 完成加载的通用方法
const completeLoading = () => {
  // 延迟一点初始化图表，确保DOM已更新
  setTimeout(() => {
    // 结束加载状态
    loading.value = false;
    setGlobalLoading?.(false);

    // 手动触发界面更新
    nextTick(() => {
      // 设置图表为可见
      chartVisible.value = true;

      // 刷新图表（如果有数据）
      if (stats.totalEvents > 0 || (stats.trendData && stats.trendData.length > 0)) {
        try {
          refreshCharts();
        } catch (error) {
          console.error('刷新图表失败:', error);
        }
      }

      // 确保界面刷新
      window.dispatchEvent(new Event('resize'));
    });
  }, 300);
};

// 强制停止加载
const forceStopLoading = () => {
  console.log('强制停止加载');

  // 生成样例数据以确保UI正常显示
  const today = new Date();
  const sampleData = {
    totalEvents: 5,
    completedEvents: 3,
    completionRate: '60%',
    trendData: Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i));
      return {
        date: date.toISOString().split('T')[0],
        totalFocusMinutes: Math.floor(Math.random() * 120) + 30 // 30-150分钟
      };
    })
  };

  Object.assign(stats, sampleData);

  // 使用通用方法完成加载
  completeLoading();

  // 显示提示
  setGlobalError?.('数据加载超时，显示示例数据');
};

// 开启自动刷新
const startAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  // 设置更长的刷新间隔（5分钟），减少频繁刷新引起的数据波动
  refreshTimer = window.setInterval(() => {
    console.log('自动刷新事件统计数据...');
    // 检查当前日期是否包含在选定范围内
    const today = new Date().toISOString().split('T')[0];
    if (today >= startDate.value && today <= endDate.value) {
      console.log('当前日期在选定范围内，执行刷新');
      loadData();
    } else {
      console.log('当前日期不在选定范围内，跳过刷新');
    }
  }, 300000); // 5分钟刷新一次

  autoRefresh.value = true;
};

// 停止自动刷新
const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }

  autoRefresh.value = false;
};

// 切换自动刷新状态
const toggleAutoRefresh = () => {
  if (autoRefresh.value) {
    stopAutoRefresh();
  } else {
    startAutoRefresh();
  }
};

// 初始化完成率环形图
const initCompletionRateChart = () => {
  if (!completionRateChart.value) {
    console.warn('找不到完成率图表DOM元素');
    return;
  }

  try {
    // 解析完成率，去掉可能的百分号
    const completionRateStr = stats.completionRate || '0%';
    console.log('完成率字符串:', completionRateStr);
    const completionRate = parseFloat(completionRateStr.replace('%', ''));
    console.log('解析后的完成率数值:', completionRate);

    // 检查完成率是否有效
    if (isNaN(completionRate)) {
      console.warn('完成率数据无效:', completionRateStr);
      return;
    }

    // 如果完成率为0且没有事件总数，显示暂无数据
    if (completionRate === 0 && stats.totalEvents === 0) {
      console.warn('完成率为0且没有事件总数，不初始化图表');
      return;
    }

    // 初始化图表
    if (completionRateChartInstance) {
      completionRateChartInstance.dispose();
    }

    console.log('开始初始化完成率环形图');
    completionRateChartInstance = echarts.init(completionRateChart.value);

    // 计算未完成率
    const pendingRate = 100 - completionRate;

    // 主题适配的颜色
    const textColor = isDarkTheme.value ? '#E5EAF3' : '#606266';
    const completedColor = '#67C23A';
    const pendingColor = '#E6A23C';
    const backgroundColor = isDarkTheme.value ? '#252D3C' : 'transparent';

    // 配置选项
    const option = {
      backgroundColor: backgroundColor,
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c}%',
        textStyle: {
          color: textColor
        }
      },
      legend: {
        orient: 'horizontal',
        bottom: 0,
        data: ['已完成', '未完成'],
        textStyle: {
          color: textColor
        }
      },
      series: [
        {
          name: '事件状态',
          type: 'pie',
          radius: ['50%', '70%'],
          avoidLabelOverlap: false,
          label: {
            show: false,
            position: 'center',
            color: textColor
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: 'bold',
              color: textColor
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          labelLine: {
            show: false
          },
          data: [
            {
              value: completionRate,
              name: '已完成',
              itemStyle: { color: completedColor }
            },
            {
              value: pendingRate,
              name: '未完成',
              itemStyle: { color: pendingColor }
            }
          ],
          animationType: 'scale'
        }
      ],
      color: [completedColor, pendingColor]
    };

    // 设置选项并渲染
    completionRateChartInstance.setOption(option);
    console.log('完成率环形图初始化完成');
  } catch (e) {
    console.error('初始化完成率图表时出错:', e);
  }
};

// 初始化工作量趋势图
const initWorkloadTrendChart = () => {
  if (!workloadTrendChart.value) {
    console.warn('找不到工作量趋势图表DOM元素');
    return;
  }

  try {
    // 检查是否有趋势数据
    if (!stats.trendData || !Array.isArray(stats.trendData) || stats.trendData.length === 0) {
      console.warn('无趋势数据，跳过图表初始化');
      return;
    }

    console.log('趋势数据:', JSON.stringify(stats.trendData));

    // 初始化图表
    if (workloadTrendChartInstance) {
      workloadTrendChartInstance.dispose();
    }

    console.log('开始初始化工作量趋势图');
    workloadTrendChartInstance = echarts.init(workloadTrendChart.value);

    // 准备数据
    const dates = stats.trendData.map(item => {
      if (!item.date) {
        console.warn('趋势数据中存在无日期记录:', item);
        return '未知日期';
      }
      // 简化日期显示，只保留月/日格式
      const dateParts = item.date.split('-');
      if (dateParts.length >= 3) {
        return `${parseInt(dateParts[1])}/${parseInt(dateParts[2])}`;
      }
      return item.date.substring(5).replace('-', '/');
    });

    const focusData = stats.trendData.map(item => {
      const minutes = item.totalFocusMinutes || 0;
      console.log(`日期 ${item.date} 的专注时长: ${minutes}分钟`);
      return minutes;
    });

    // 检查数据有效性，避免全0数据
    const hasValidData = focusData.some(value => value > 0);
    if (!hasValidData) {
      console.warn('所有专注时长数据均为0，使用默认图表数据');
      // 可以添加一些示例数据，以便显示图表而不是空白
      focusData.fill(1); // 填充1分钟的数据，确保图表能够显示
    }

    // 找到最大值，设置合适的Y轴范围
    const maxValue = Math.max(...focusData, 60);

    // 主题适配的颜色
    const textColor = isDarkTheme.value ? '#E5EAF3' : '#606266';
    const lineColor = '#3A82F6';
    const axisFontColor = isDarkTheme.value ? '#909399' : '#666';
    const axisLineColor = isDarkTheme.value ? '#4C5D7A' : '#ddd';
    const splitLineColor = isDarkTheme.value ? 'rgba(76, 93, 122, 0.2)' : 'rgba(220, 220, 220, 0.5)';
    const areaColorTop = 'rgba(58, 130, 246, 0.6)';
    const areaColorBottom = isDarkTheme.value ? 'rgba(58, 130, 246, 0.1)' : 'rgba(58, 130, 246, 0.05)';
    const backgroundColor = isDarkTheme.value ? '#252D3C' : 'transparent';

    // 配置选项
    const option = {
      backgroundColor: backgroundColor,
      tooltip: {
        trigger: 'axis',
        formatter: function(params: Array<any>) {
          let result = params[0].name + '<br/>';
          params.forEach((item: any) => {
            result += item.seriesName + ': ' + formatMinutes(item.value) + '<br/>';
          });
          return result;
        },
        textStyle: {
          color: textColor
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '5%',
        top: '5%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLabel: {
          formatter: '{value}',
          color: axisFontColor
        },
        axisLine: {
          lineStyle: {
            color: axisLineColor
          }
        },
        axisTick: {
          alignWithLabel: true,
          lineStyle: {
            color: axisLineColor
          }
        }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: Math.ceil(maxValue * 1.2 / 60) * 60, // 向上取整小时
        axisLabel: {
          formatter: (value: number) => {
            return Math.floor(value / 60) + 'h';
          },
          color: axisFontColor
        },
        axisLine: {
          lineStyle: {
            color: axisLineColor
          }
        },
        splitLine: {
          lineStyle: {
            color: splitLineColor,
            type: 'dashed'
          }
        }
      },
      series: [
        {
          name: '专注时长',
          type: 'line',
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
                  color: areaColorTop
                },
                {
                  offset: 1,
                  color: areaColorBottom
                }
              ]
            }
          },
          itemStyle: {
            color: lineColor,
            borderWidth: 2
          },
          lineStyle: {
            width: 3
          },
          smooth: true,
          symbolSize: 7,
          emphasis: {
            scale: true,
            itemStyle: {
              borderColor: isDarkTheme.value ? '#fff' : lineColor,
              borderWidth: 2
            }
          }
        }
      ],
      animationDuration: 1000
    };

    // 设置选项并渲染
    workloadTrendChartInstance.setOption(option);
    console.log('工作量趋势图初始化完成');
  } catch (e) {
    console.error('初始化工作量趋势图时出错:', e);
  }
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

// 窗口大小改变时重绘图表
const handleResize = () => {
  completionRateChartInstance?.resize();
  workloadTrendChartInstance?.resize();
};

window.addEventListener('resize', handleResize);

// 组件卸载时移除事件监听
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  document.documentElement.removeEventListener('data-theme-changed', updateChartsTheme);

  // 清除自动刷新定时器
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }

  // 销毁图表实例
  completionRateChartInstance?.dispose();
  workloadTrendChartInstance?.dispose();

  // 清除加载状态
  setGlobalLoading?.(false);
  setGlobalError?.('');
});

// 初始化和刷新图表
const refreshCharts = () => {
  console.log('强制刷新图表');

  // 强制设置图表可见
  chartVisible.value = true;

  // 销毁现有图表实例
  if (completionRateChartInstance) {
    completionRateChartInstance.dispose();
    completionRateChartInstance = null;
  }

  if (workloadTrendChartInstance) {
    workloadTrendChartInstance.dispose();
    workloadTrendChartInstance = null;
  }

  // 确保有数据可以显示
  const hasDataToShow = stats.totalEvents > 0 || (stats.trendData && stats.trendData.length > 0);
  if (!hasDataToShow) {
    console.log('无数据可以显示，生成演示数据');
    // 生成一些演示数据用于显示
    forceStopLoading();
    return;
  }

  // 立即初始化图表，不依赖于nextTick
  setTimeout(() => {
    console.log('开始初始化图表...');

    // 强制初始化完成率图表
    if (completionRateChart.value && parseFloat(stats.completionRate.replace('%', '')) > 0) {
      try {
        console.log('初始化完成率图表');
        initCompletionRateChart();
      } catch (e) {
        console.error('初始化完成率图表失败:', e);
      }
    }

    // 强制初始化趋势图表
    if (workloadTrendChart.value && stats.trendData && stats.trendData.length > 0) {
      try {
        console.log('初始化趋势图表');
        initWorkloadTrendChart();
      } catch (e) {
        console.error('初始化趋势图表失败:', e);
      }
    }

    // 触发窗口resize事件以确保图表正确渲染
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }, 200);
};

onMounted(() => {
  console.log('组件已挂载，立即开始加载数据');

  // 设置一个定时器，如果数据在短时间内未加载完成，则强制显示样例数据
  const initialLoadTimer = setTimeout(() => {
    if (loading.value) {
      console.warn('初始加载超时，显示样例数据');
      forceStopLoading();
    }
  }, 3000); // 3秒后如果还在加载，则显示样例数据

  // 确保在DOM渲染后立即加载数据
  setTimeout(() => {
    try {
      loadData();
    } catch (e) {
      console.error('加载数据失败:', e);
      forceStopLoading();
    }

    // 监听主题变化事件
    document.documentElement.addEventListener('data-theme-changed', updateChartsTheme);

    // 初始检查是否有主题变化
    updateChartsTheme();

    // 开启自动刷新
    startAutoRefresh();

    // 图表区域可能需要重新调整大小
    window.dispatchEvent(new Event('resize'));
  }, 100);

  // 组件卸载时清除定时器
  onBeforeUnmount(() => {
    clearTimeout(initialLoadTimer);
  });
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
  gap: 10px;
  justify-content: space-between;
}

.filter-label {
  margin-right: 10px;
  font-size: 14px;
  color: #606266;
}

.filter-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.refresh-controls {
  display: flex;
  gap: 10px;
  margin-left: auto;
}

.refresh-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: white;
  border: 1px solid #DCDFE6;
  cursor: pointer;
  transition: all 0.3s;
}

.refresh-btn:hover {
  background-color: #f5f7fa;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-icon {
  font-size: 16px;
  display: inline-block;
}

.refresh-icon.spinning {
  animation: spin 1s linear infinite;
}

.auto-refresh-btn {
  padding: 6px 12px;
  border: 1px solid #DCDFE6;
  border-radius: 4px;
  background-color: white;
  color: #606266;
  cursor: pointer;
  transition: all 0.3s;
}

.auto-refresh-btn:hover {
  border-color: #C0C4CC;
}

.auto-refresh-btn.active {
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
  min-height: 350px; /* 确保有足够的高度容纳图表 */
  display: flex;
  flex-direction: column;
}

.chart-title {
  font-size: 16px;
  margin-bottom: 16px;
  text-align: center;
  color: #333;
  flex: 0 0 auto;
}

.chart {
  height: 300px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
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
  width: 100%;
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
  color: #909399;
  text-align: center;
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
  }

  .filter-buttons {
    width: 100%;
  }

  .refresh-controls {
    margin-left: 0;
    width: 100%;
    justify-content: flex-end;
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

:root[data-theme="dark"] .refresh-btn,
:root[data-theme="dark"] .auto-refresh-btn {
  background-color: #252D3C;
  border-color: #4C5D7A;
  color: #E5EAF3;
}

:root[data-theme="dark"] .refresh-btn:hover,
:root[data-theme="dark"] .auto-refresh-btn:hover {
  background-color: #33415a;
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

.force-stop-btn {
  margin-top: 16px;
  padding: 8px 16px;
  background-color: #f56c6c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.force-stop-btn:hover {
  background-color: #e74c3c;
}

:root[data-theme="dark"] .force-stop-btn {
  background-color: #d63031;
}

:root[data-theme="dark"] .force-stop-btn:hover {
  background-color: #c0392b;
}
</style>
