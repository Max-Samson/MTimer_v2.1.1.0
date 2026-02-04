# 统计可视化组件架构文档

## 目录

1. [概述](#概述)
2. [整体架构](#整体架构)
3. [组件层次结构](#组件层次结构)
4. [数据流与状态管理](#数据流与状态管理)
5. [图表技术栈](#图表技术栈)
6. [API 服务层](#api-服务层)
7. [工具函数与辅助模块](#工具函数与辅助模块)
8. [设计模式与最佳实践](#设计模式与最佳实践)
9. [性能优化](#性能优化)
10. [扩展指南](#扩展指南)

---

## 概述

MTimer 统计可视化系统是一个基于 Vue 3 + TypeScript 构建的模块化数据可视化平台,用于展示用户的专注时间、番茄钟记录和任务完成情况等统计数据。

### 核心特性

- **模块化设计**: 清晰的组件分离,便于维护和扩展
- **响应式布局**: 支持多端适配
- **主题切换**: 内置深色/浅色主题支持
- **图表导出**: 支持将统计图表导出为 PNG 图片
- **自动刷新**: 数据自动同步更新
- **事件驱动**: 基于事件总线的松耦合架构

---

## 整体架构

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         StatsView                           │
│  (主容器 - 标签页管理、全局加载状态、图表导出)                │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ DailySummary  │   │ PomodoroStats │   │  EventStats   │
│  (每日汇总)   │   │  (番茄钟统计) │   │  (事件统计)   │
└───────────────┘   └───────────────┘   └───────────────┘
        │                     │                     │
        ▼                     │                     │
┌───────────────┐             │                     │
│WeekTrendChart │             │                     │
│ (周趋势图表)  │             │                     │
└───────────────┘             │                     │
                              │                     │
                        ┌─────┴─────────────────────┴─────┐
                        │      BaseChart (共享组件)        │
                        └─────────────────────────────────┘
                                        │
                        ┌───────────────┴───────────────┐
                        │                               │
                ┌───────▼───────┐               ┌───────▼───────┐
                │  ChartUtils   │               │ Event Bus     │
                │  (图表工具)   │               │  (事件总线)   │
                └───────────────┘               └───────────────┘
                        │                               │
                ┌───────┴───────────────────────────────┴───────┐
                │          DatabaseService (数据服务层)          │
                └───────────────────────────────────────────────┘
```

---

## 组件层次结构

### 1. StatsView.vue (根容器)

**位置**: `frontend/src/components/stats/StatsView.vue`
**行数**: 404 行

**职责**:
- 管理所有统计标签页的切换和展示
- 提供全局加载状态管理 (provide/inject)
- 处理图表导出功能
- 监听并响应数据更新事件

**关键特性**:
```typescript
// 全局状态管理
provide('isLoading', isLoading)
provide('setGlobalLoading', setGlobalLoading)

// 标签页配置
const tabOptions = [
  { name: '每日汇总', value: 'daily' },
  { name: '番茄钟统计', value: 'pomodoro' },
  { name: '事件统计', value: 'event' },
]
```

---

### 2. DailySummary.vue (每日汇总)

**位置**: `frontend/src/components/stats/DailySummary.vue`
**行数**: 461 行

**职责**:
- 展示昨日专注概览（完成番茄钟、完成任务、专注时长）
- 显示周趋势数据
- 提供数据刷新功能

**数据结构**:
```typescript
interface DailySummaryData {
  date: string
  pomodoroCount: number
  completedTasks: number
  focusTime: number // 分钟
}
```

**关键功能**:
- 三张统计卡片展示核心指标
- 30秒自动刷新机制
- 手动刷新按钮

---

### 3. PomodoroStats.vue (番茄钟统计)

**位置**: `frontend/src/components/stats/PomodoroStats.vue`
**行数**: 1337 行

**职责**:
- 展示番茄钟会话的详细统计
- 提供多维度图表分析
- 支持时间范围筛选

**图表类型**:
1. **番茄钟趋势图**: 柱状图 + 折线图组合
2. **时段分布图**: 颜色编码的时段分析

**时间范围选项**:
- 最近 7 天
- 最近 30 天
- 本月
- 自定义范围

---

### 4. EventStats.vue (事件统计)

**位置**: `frontend/src/components/stats/EventStats.vue`
**行数**: 1192 行

**职责**:
- 展示任务完成情况
- 分析工作负载趋势
- 计算完成率指标

**核心图表**:
1. **完成率饼图**: 可视化任务完成比例
2. **工作负载趋势图**: 时间维度的任务分布

**统计指标**:
- 总事件数
- 已完成事件数
- 完成率百分比

---

### 5. WeekTrendChart.vue (周趋势图)

**位置**: `frontend/src/components/stats/WeekTrendChart.vue`
**行数**: 445 行

**职责**:
- 专门用于周趋势数据可视化
- 支持多系列数据展示
- 双 Y 轴设计

**图表特性**:
```typescript
interface WeekTrendData {
  date: string
  focusTime: number
  pomodoroCount: number
  taskCount: number
}
```

---

## 数据流与状态管理

### 数据流模式

```
用户操作/定时触发
       │
       ▼
事件总线 (eventBus)
       │
       ▼
组件触发数据加载
       │
       ▼
DatabaseService API 调用
       │
       ▼
后端数据处理与返回
       │
       ▼
组件状态更新
       │
       ▼
ECharts 图表重绘
```

### 状态管理模式

#### 1. 局部状态管理

```typescript
// 组件级别的响应式状态
const loading = ref(false)
const data = reactive<StatsResponse>({})
const hasData = computed(() => data.length > 0)
```

#### 2. 全局状态 (provide/inject)

```typescript
// 父组件提供
provide('isLoading', isLoading)
provide('setGlobalLoading', setGlobalLoading)

// 子组件注入
const setGlobalLoading = inject('setGlobalLoading') as ((loading: boolean) => void)
```

#### 3. 事件驱动更新

```typescript
// 监听事件
eventBus.on('STATS_UPDATED', () => {
  loadData()
})

// 触发事件
eventBus.emit('STATS_UPDATED')
```

---

## 图表技术栈

### ECharts 配置

**版本**: v5.6.0+
**按需加载注册**:

```typescript
import * as echarts from 'echarts/core'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
} from 'echarts/components'
import {
  BarChart,
  LineChart,
  PieChart,
} from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  BarChart,
  LineChart,
  PieChart,
  CanvasRenderer,
])
```

### 图表类型

| 图表类型 | 使用场景 | 组件位置 |
|---------|---------|----------|
| 折线图 | 专注时间趋势 | DailySummary, WeekTrendChart |
| 柱状图 | 番茄钟/任务数量 | PomodoroStats |
| 饼图 | 完成率占比 | EventStats |
| 组合图 | 多维度数据分析 | PomodoroStats |

### 主题系统

**useChartsTheme Hook** (useChartsTheme.ts - 312 行):

```typescript
const { isDark, chartTheme } = useChartsTheme()

// 主题切换自动更新图表颜色
watch(isDark, () => {
  chartInstance?.setOption({
    backgroundColor: chartTheme.value.backgroundColor,
    // ... 其他主题配置
  })
})
```

---

## API 服务层

### DatabaseService

**位置**: `frontend/src/services/DatabaseService.ts`
**行数**: 787 行

**设计模式**: 单例模式

**核心方法**:

```typescript
class DatabaseService {
  // 获取每日汇总数据
  async getDailySummary(forceRefresh?: boolean): Promise<DailySummaryResponse>

  // 获取番茄钟统计数据
  async getPomodoroStats(
    days: number,
    forceRefresh?: boolean
  ): Promise<PomodoroStatsResponse>

  // 获取事件统计数据
  async getEventStats(
    startDate: string,
    endDate: string,
    forceRefresh?: boolean
  ): Promise<EventStatsResponse>

  // 获取统计摘要
  async getStatsSummary(forceRefresh?: boolean): Promise<StatsSummaryResponse>
}
```

### 数据获取模式

```typescript
async function loadData(force: boolean = false) {
  loading.value = true
  try {
    const data = await dbService.getStatsSummary(force)
    // 处理数据并更新响应式状态
  } catch (error) {
    // 错误处理与兜底数据
  } finally {
    loading.value = false
  }
}
```

### 强制更新机制

- 后端统计重新计算 (通过 `UpdateStats()` API)
- 防抖更新 (最小间隔 2 秒)
- 用户操作后的自动数据刷新

---

## 工具函数与辅助模块

### 1. ChartExporter (chartExporter.ts - 251 行)

**功能**: 将图表导出为 PNG 图片

**核心特性**:
- 多图表合并到单个画布
- 高 DPI 支持 (2x 像素比)
- 可自定义布局和水印
- 缺失图表的错误处理

**使用示例**:
```typescript
import { exportCharts } from '@/utils/chartExporter'

await exportCharts({
  charts: [chart1, chart2],
  filename: 'stats-report',
  layout: 'vertical',
})
```

---

### 2. useAutoRefresh Hook (useAutoRefresh.ts - 152 行)

**功能**: 自动刷新控制

**特性**:
- 可配置刷新间隔
- 基于焦点的刷新触发
- 防抖防止竞态条件

```typescript
const { startAutoRefresh, stopAutoRefresh } = useAutoRefresh({
  interval: 30000, // 30秒
  callback: () => loadData(),
})
```

---

### 3. Event Bus (eventBus.ts - 120 行)

**功能**: 跨组件事件通信

**事件类型**:
```typescript
enum EventBusEvents {
  STATS_UPDATED = 'STATS_UPDATED',
  REQUEST_DATA_REFRESH = 'REQUEST_DATA_REFRESH',
  SESSION_COMPLETED = 'SESSION_COMPLETED',
  TASK_COMPLETED = 'TASK_COMPLETED',
}
```

**使用模式**:
```typescript
// 发送事件
eventBus.emit(EventBusEvents.STATS_UPDATED, payload)

// 监听事件
eventBus.on(EventBusEvents.STATS_UPDATED, (payload) => {
  // 处理事件
})

// 清理监听
onBeforeUnmount(() => {
  eventBus.off(EventBusEvents.STATS_UPDATED)
})
```

---

## 设计模式与最佳实践

### 1. 组件设计模式

#### 容器/展示分离
```typescript
// StatsView (容器) - 处理逻辑和数据
// DailySummary/PomodoroStats/EventStats (展示) - 渲染 UI
```

#### 单一职责原则
- 每个组件只负责一个统计维度
- 子组件专注于特定的可视化需求

#### 组合优于继承
```typescript
// BaseChart 作为可组合的基础组件
const baseChart = useBaseChart(config)
```

---

### 2. TypeScript 类型安全

**接口定义**:
```typescript
interface DailyTrendData {
  date: string
  focusTime: number
  pomodoroCount: number
  taskCount: number
}

interface PomodoroStatsResponse {
  totalPomodoros: number
  bestDay: { date: string; count: number }
  trendData: TrendData[]
}
```

---

### 3. 错误处理

**优雅降级**:
```typescript
try {
  const data = await fetchData()
} catch (error) {
  // 使用兜底数据
  data = getFallbackData()
  // 显示友好提示
  message.error('数据加载失败，显示缓存数据')
}
```

---

### 4. 响应式设计

**CSS Grid 布局**:
```css
.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}
```

**移动端优化**:
```typescript
const chartWidth = computed(() => {
  return isMobile.value ? '100%' : '600px'
})
```

---

## 性能优化

### 1. Tree-shaking 优化

**ECharts 按需加载**:
```typescript
// 只导入使用的组件
echarts.use([
  BarChart,
  LineChart,
  // 不用的不导入
])
```

### 2. 防抖与节流

```typescript
import { debounce } from 'lodash-es'

const debouncedRefresh = debounce(() => {
  loadData()
}, 2000)
```

### 3. 计算属性缓存

```typescript
const hasData = computed(() => {
  return data.value && data.value.length > 0
})
```

### 4. 懒加载

```typescript
// 组件懒加载
const WeekTrendChart = defineAsyncComponent(
  () => import('./WeekTrendChart.vue')
)
```

---

## 扩展指南

### 添加新的统计类型

#### 步骤 1: 创建数据接口

```typescript
// interfaces/CustomStats.ts
export interface CustomStatsData {
  id: string
  value: number
  timestamp: number
}
```

#### 步骤 2: 扩展 DatabaseService

```typescript
// services/DatabaseService.ts
class DatabaseService {
  async getCustomStats(
    startDate: string,
    endDate: string
  ): Promise<CustomStatsData[]> {
    // 实现数据获取逻辑
  }
}
```

#### 步骤 3: 创建统计组件

```vue
<!-- components/stats/CustomStats.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { dbService } from '@/services/DatabaseService'

const data = ref<CustomStatsData[]>([])

onMounted(async () => {
  data.value = await dbService.getCustomStats()
})
</script>

<template>
  <div class="custom-stats">
    <!-- 统计内容 -->
  </div>
</template>
```

#### 步骤 4: 注册到 StatsView

```vue
<!-- components/stats/StatsView.vue -->
<script setup lang="ts">
import CustomStats from './CustomStats.vue'

const tabOptions = [
  // ... 其他标签
  { name: '自定义统计', value: 'custom' },
]
</script>

<template>
  <NTabs>
    <!-- ... 其他标签页 -->
    <NTabPane name="custom">
      <CustomStats />
    </NTabPane>
  </NTabs>
</template>
```

### 添加新的图表类型

参考 ECharts 官方文档，按需导入新图表类型：

```typescript
import { RadarChart } from 'echarts/charts'

echarts.use([
  // ... 现有图表
  RadarChart,
])
```

---

## 文件索引

| 文件路径 | 行数 | 职责 |
|---------|------|------|
| `StatsView.vue` | 404 | 主容器，标签页管理 |
| `DailySummary.vue` | 461 | 每日汇总统计 |
| `PomodoroStats.vue` | 1337 | 番茄钟详细统计 |
| `EventStats.vue` | 1192 | 事件完成统计 |
| `WeekTrendChart.vue` | 445 | 周趋势图表组件 |
| `DatabaseService.ts` | 787 | 数据库服务层 |
| `chartExporter.ts` | 251 | 图表导出工具 |
| `useAutoRefresh.ts` | 152 | 自动刷新 Hook |
| `useChartsTheme.ts` | 312 | 图表主题 Hook |
| `eventBus.ts` | 120 | 事件总线 |

---

## 总结

MTimer 统计可视化系统采用了现代化的前端架构设计，具有以下特点：

✅ **模块化**: 清晰的组件分离，职责单一
✅ **类型安全**: 全面的 TypeScript 支持
✅ **可维护性**: 统一的代码风格和架构模式
✅ **可扩展性**: 易于添加新的统计类型和图表
✅ **性能优化**: Tree-shaking、懒加载、防抖节流
✅ **用户体验**: 自动刷新、主题切换、图表导出

通过本文档，开发者可以快速理解系统架构，并进行高效的开发和维护。
