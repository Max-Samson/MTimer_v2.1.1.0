<script setup lang="ts">
import { DownloadOutline } from '@vicons/ionicons5'
import { NButton, NCard, NIcon, NTabPane, NTabs, useMessage } from 'naive-ui'
import { computed, onBeforeUnmount, onMounted, provide, ref } from 'vue'
// 导入必要的API函数
import { UpdateStats } from '../../../wailsjs/go/main/App'
// 导入事件总线
import { eventBus, EventNames } from '../../utils/eventBus'
// 导入图表导出工具
import { ChartExporter } from '../../utils/chartExporter'
import DailySummary from './DailySummary.vue'
import EventStats from './EventStats.vue'
import PomodoroStats from './PomodoroStats.vue'

// 消息提示
const message = useMessage()

// 提供全局加载状态
const isLoading = ref(false)
const errorMessage = ref('')
const lastRefreshTime = ref(Date.now())

// 当前激活的标签页
const activeTab = ref('daily')

// 标签页名称映射
const tabNameMap: Record<string, string> = {
  daily: '每日小结',
  pomodoro: '番茄统计',
  event: '任务统计',
}

// 当前标签页的显示名称
const currentTabName = computed(() => tabNameMap[activeTab.value] || '当前')

// 子组件引用
const dailySummaryRef = ref<InstanceType<typeof DailySummary> | null>(null)
const pomodoroStatsRef = ref<InstanceType<typeof PomodoroStats> | null>(null)
const eventStatsRef = ref<InstanceType<typeof EventStats> | null>(null)

// 提供给子组件
provide('isLoading', isLoading)
provide('errorMessage', errorMessage)
provide('lastRefreshTime', lastRefreshTime)

// 设置全局加载状态
function setGlobalLoading(loading: boolean) {
  isLoading.value = loading
}

// 设置错误消息
function setGlobalError(message: string) {
  errorMessage.value = message
}

// 更新最后刷新时间
function updateLastRefreshTime() {
  lastRefreshTime.value = Date.now()
}

// 提供给子组件的方法
provide('setGlobalLoading', setGlobalLoading)
provide('setGlobalError', setGlobalError)
provide('updateLastRefreshTime', updateLastRefreshTime)

// 刷新统计数据的方法
async function refreshStats() {
  console.log('[StatsView] 开始刷新统计数据')
  isLoading.value = true
  errorMessage.value = ''

  try {
    // 使用导入的API函数更新统计 (后端重新计算)
    await UpdateStats('')
    console.log('[StatsView] 统计数据后端同步成功')

    // 更新最后刷新时间
    updateLastRefreshTime()

    // 通过事件总线通知所有子组件强制刷新
    console.log('[StatsView] 触发 STATS_UPDATED 事件通知子组件')
    eventBus.emit(EventNames.STATS_UPDATED)

    // 延迟一小段时间再关闭加载状态，确保子组件有时间获取新数据
    setTimeout(() => {
      isLoading.value = false
    }, 500) // 增加一点等待时间
  }
  catch (error) {
    console.error('[StatsView] 更新统计数据失败:', error)
    errorMessage.value = '无法更新统计数据，请稍后重试'
    isLoading.value = false
  }
}

// 监听来自其他组件的刷新请求
function handleRefreshRequest() {
  console.log('[StatsView] 收到数据刷新请求')
  refreshStats()
}

// 组件挂载时初始化
onMounted(async () => {
  // 订阅刷新请求事件
  eventBus.on(EventNames.REQUEST_DATA_REFRESH, handleRefreshRequest)
  eventBus.on(EventNames.FOCUS_SESSION_COMPLETED, handleRefreshRequest)
  eventBus.on(EventNames.POMODORO_COMPLETED, handleRefreshRequest)
  eventBus.on(EventNames.TODO_COMPLETED, handleRefreshRequest)

  // 初始化时刷新一次
  await refreshStats()
})

// 导出当前标签页的图表
async function exportCurrentTab() {
  const loadingMsg = message.loading('正在生成图片...', { duration: 0 })

  try {
    console.log('[StatsView] 开始导出当前标签页:', activeTab.value)
    const timestamp = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')

    if (activeTab.value === 'daily') {
      // 导出每日小结
        console.log('[StatsView] 导出每日小结')
        const weekTrendChart = dailySummaryRef.value?.weekTrendChartRef?.chartContainer
        console.log('[StatsView] 周趋势图表容器:', weekTrendChart)
        
        if (!weekTrendChart) {
          throw new Error('图表未加载完成，请稍后再试')
        }

        await ChartExporter.exportMultipleCharts({
          charts: [
            {
              chartRef: weekTrendChart,
              title: '本周趋势',
              // 不指定 height，使用自动计算的合理高度
            },
          ],
          filename: `每日小结_${timestamp}.png`,
          mainTitle: '每日小结',
        })
    }
    else if (activeTab.value === 'pomodoro') {
      // 导出番茄统计
      console.log('[StatsView] 导出番茄统计')
      const pomodoroTrendChart = pomodoroStatsRef.value?.pomodoroTrendChart
      const timeDistributionChart = pomodoroStatsRef.value?.timeDistributionChart
      console.log('[StatsView] 番茄趋势图:', pomodoroTrendChart)
      console.log('[StatsView] 时间分布图:', timeDistributionChart)

        const charts = []
        if (pomodoroTrendChart) {
          charts.push({
            chartRef: pomodoroTrendChart,
            title: '番茄专注趋势',
            // 不指定 height，使用自动计算的合理高度
          })
        }
        if (timeDistributionChart) {
          charts.push({
            chartRef: timeDistributionChart,
            title: '一天中专注分布',
            // 不指定 height，使用自动计算的合理高度
          })
        }

        console.log('[StatsView] 准备导出的图表数量:', charts.length)
        if (charts.length === 0) {
          throw new Error('图表未加载完成，请稍后再试')
        }

        await ChartExporter.exportMultipleCharts({
          charts,
          filename: `番茄统计_${timestamp}.png`,
          mainTitle: '番茄统计',
        })
    }
    else if (activeTab.value === 'event') {
      // 导出任务统计
      console.log('[StatsView] 导出任务统计')
      const completionRateChart = eventStatsRef.value?.completionRateChart
      const workloadTrendChartRef = eventStatsRef.value?.workloadTrendChart
      console.log('[StatsView] 完成率图表:', completionRateChart)
      console.log('[StatsView] 工作量趋势图 ref:', workloadTrendChartRef)
      
      // 尝试获取 BaseChart 组件的 chartContainer
      const workloadTrendChart = workloadTrendChartRef?.chartContainer || workloadTrendChartRef
      console.log('[StatsView] 工作量趋势图容器:', workloadTrendChart)

        const charts = []
        if (completionRateChart) {
          charts.push({
            chartRef: completionRateChart as HTMLElement,
            title: '任务完成率',
            // 不指定 height，使用自动计算的合理高度
          })
        }
        if (workloadTrendChart) {
          charts.push({
            chartRef: workloadTrendChart as HTMLElement,
            title: '工作量趋势',
            // 不指定 height，使用自动计算的合理高度
          })
        }

        console.log('[StatsView] 准备导出的图表数量:', charts.length)
        if (charts.length === 0) {
          throw new Error('图表未加载完成，请稍后再试')
        }

        await ChartExporter.exportMultipleCharts({
          charts,
          filename: `任务统计_${timestamp}.png`,
          mainTitle: '任务统计',
        })
    }

    loadingMsg.destroy()
    console.log('[StatsView] 导出成功')
    message.success('导出成功！')
  }
  catch (error) {
    loadingMsg.destroy()
    console.error('[StatsView] 导出图表失败:', error)
    message.error(error instanceof Error ? error.message : '导出失败，请稍后重试')
  }
}

// 导出所有图表
async function exportAllCharts() {
  const loadingMsg = message.loading('正在生成完整报告...', { duration: 0 })

  try {
    const timestamp = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')

    // 收集所有图表
    const charts = []

    // 每日小结 - 周趋势图
    const weekTrendChart = dailySummaryRef.value?.weekTrendChartRef?.chartContainer
    if (weekTrendChart) {
      charts.push({
        chartRef: weekTrendChart,
        title: '本周趋势',
        // 不指定 height，使用自动计算的合理高度
      })
    }

    // 番茄统计 - 趋势图和分布图
    const pomodoroTrendChart = pomodoroStatsRef.value?.pomodoroTrendChart
    const timeDistributionChart = pomodoroStatsRef.value?.timeDistributionChart
    if (pomodoroTrendChart) {
      charts.push({
        chartRef: pomodoroTrendChart,
        title: '番茄专注趋势',
        // 不指定 height，使用自动计算的合理高度
      })
    }
    if (timeDistributionChart) {
      charts.push({
        chartRef: timeDistributionChart,
        title: '一天中专注分布',
        // 不指定 height，使用自动计算的合理高度
      })
    }

    // 任务统计 - 完成率和趋势图
    const completionRateChart = eventStatsRef.value?.completionRateChart
    const workloadTrendChart = eventStatsRef.value?.workloadTrendChart?.chartContainer || eventStatsRef.value?.workloadTrendChart
    if (completionRateChart) {
      charts.push({
        chartRef: completionRateChart as HTMLElement,
        title: '任务完成率',
        // 不指定 height，使用自动计算的合理高度
      })
    }
    if (workloadTrendChart) {
      charts.push({
        chartRef: workloadTrendChart as HTMLElement,
        title: '工作量趋势',
        // 不指定 height，使用自动计算的合理高度
      })
    }

    if (charts.length === 0) {
      throw new Error('没有可导出的图表，请等待数据加载完成')
    }

    await ChartExporter.exportMultipleCharts({
      charts,
      filename: `专注统计完整报告_${timestamp}.png`,
      mainTitle: '专注统计完整报告',
      // 使用默认的优化尺寸
    })

    loadingMsg.destroy()
    message.success(`成功导出 ${charts.length} 个图表！`)
  }
  catch (error) {
    loadingMsg.destroy()
    console.error('导出完整报告失败:', error)
    message.error(error instanceof Error ? error.message : '导出失败，请稍后重试')
  }
}

// 判断当前标签页是否有可导出的图表
const canExport = computed(() => {
  // 基础检查：引用是否存在
  if (activeTab.value === 'daily') {
    const dailyRef = dailySummaryRef.value
    if (!dailyRef) return false
    // 检查周趋势图是否存在
    return !!(dailyRef.weekTrendChartRef?.chartContainer || dailyRef.weekTrendChartRef)
  }
  else if (activeTab.value === 'pomodoro') {
    const pomodoroRef = pomodoroStatsRef.value
    if (!pomodoroRef) return false
    return !!(pomodoroRef.pomodoroTrendChart || pomodoroRef.timeDistributionChart)
  }
  else if (activeTab.value === 'event') {
    const eventRef = eventStatsRef.value
    if (!eventRef) return false
    return !!(eventRef.completionRateChart || eventRef.workloadTrendChart)
  }

  return false
})

// 组件卸载前清理
onBeforeUnmount(() => {
  // 取消事件订阅
  eventBus.off(EventNames.REQUEST_DATA_REFRESH, handleRefreshRequest)
  eventBus.off(EventNames.FOCUS_SESSION_COMPLETED, handleRefreshRequest)
  eventBus.off(EventNames.POMODORO_COMPLETED, handleRefreshRequest)
  eventBus.off(EventNames.TODO_COMPLETED, handleRefreshRequest)
})
</script>

<template>
  <div class="stats-view">
    <NCard class="stats-card" title="数据统计">
      <NTabs v-model:value="activeTab" type="line" animated>
        <!-- 将导出按钮移至标签页右侧 -->
        <template #suffix>
          <div class="export-buttons" style="margin-left: 20px;">
            <NButton
              secondary
              size="small"
              :disabled="!canExport || isLoading"
              @click="exportCurrentTab"
            >
              <template #icon>
                <NIcon>
                  <DownloadOutline />
                </NIcon>
              </template>
              {{ currentTabName }}
            </NButton>
            <NButton
              type="primary"
              size="small"
              :disabled="isLoading"
              @click="exportAllCharts"
            >
              <template #icon>
                <NIcon>
                  <DownloadOutline />
                </NIcon>
              </template>
              完整报告
            </NButton>
          </div>
        </template>

        <NTabPane name="daily" tab="每日小结">
          <DailySummary ref="dailySummaryRef" />
        </NTabPane>
        <NTabPane name="pomodoro" tab="番茄统计">
          <PomodoroStats ref="pomodoroStatsRef" />
        </NTabPane>
        <NTabPane name="event" tab="任务统计">
          <EventStats ref="eventStatsRef" />
        </NTabPane>
      </NTabs>
    </NCard>
  </div>
</template>

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

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

:deep(.n-tabs-nav) {
  padding: 0 10px;
}

:deep(.n-tab-pane) {
  padding: 10px 0;
}

.export-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

@media (max-width: 768px) {
  .stats-view {
    padding: 10px;
  }

  .export-buttons {
    flex-direction: column;
    gap: 4px;
  }

  .export-buttons .n-button {
    width: 100%;
  }
}

:root[data-theme='dark'] .stats-view {
  background-color: transparent;
}

:root[data-theme='dark'] .card-title {
  color: #e5eaf3;
}
</style>
