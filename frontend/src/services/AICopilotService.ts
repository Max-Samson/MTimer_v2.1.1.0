// 使用 env.d.ts 中定义的全局 window.go 类型
const isWailsAvailable = typeof window.go !== 'undefined' && window.go?.main?.App
const App = isWailsAvailable ? window.go.main.App : null

// 行为特征响应类型
export interface BehaviorFeature {
  date: string
  total_focus_minutes: number
  pomodoro_ratio: number
  session_count: number
  avg_session_length: number
  first_focus_time: string
  last_focus_time: string
  peak_hours: string[]
  task_diversity: number
  completed_tasks: number
  break_ratio: number
  compared_to_avg: string
  compared_to_avg_ratio: number
  streak_days: number
  best_hour: string
}

// AI Copilot 服务类
// 提供 AI 需要的数据导出能力
class AICopilotService {
  /**
   * 获取行为特征（JSON 格式）
   * 返回结构化的行为特征数据，可直接用于 AI 分析
   */
  async getBehaviorFeatures(date: string = ''): Promise<BehaviorFeature | null> {
    try {
      if (!App) {
        console.warn('[AICopilotService] App未绑定，返回模拟数据')
        return this.getMockBehaviorFeature()
      }

      console.log('[AICopilotService] 获取行为特征, 日期:', date || '今天')
      const feature = await (App as any).GetBehaviorFeatures(date || '')
      console.log('[AICopilotService] 行为特征获取成功:', feature)

      return feature
    }
    catch (error) {
      console.error('[AICopilotService] 获取行为特征失败:', error)
      return this.getMockBehaviorFeature()
    }
  }

  /**
   * 导出 AI 友好的文本格式
   * 返回易于 AI 理解的文本报告，可直接作为 AI Prompt 的一部分
   */
  async exportForAI(date: string = ''): Promise<string | null> {
    try {
      if (!App) {
        console.warn('[AICopilotService] App未绑定，返回模拟文本')
        return this.getMockExportText()
      }

      console.log('[AICopilotService] 导出 AI 格式数据, 日期:', date || '今天')
      const text = await (App as any).ExportForAI(date || '')
      console.log('[AICopilotService] 导出成功, 文本长度:', text?.length)

      return text
    }
    catch (error) {
      console.error('[AICopilotService] 导出失败:', error)
      return this.getMockExportText()
    }
  }

  /**
   * 获取模拟行为特征（开发模式）
   */
  private getMockBehaviorFeature(): BehaviorFeature {
    return {
      date: new Date().toISOString().split('T')[0],
      total_focus_minutes: 195,
      pomodoro_ratio: 0.75,
      session_count: 8,
      avg_session_length: 24.4,
      first_focus_time: '09:00',
      last_focus_time: '17:30',
      peak_hours: ['09:00-10:00', '14:00-15:00'],
      task_diversity: 3,
      completed_tasks: 2,
      break_ratio: 0.15,
      compared_to_avg: 'better',
      compared_to_avg_ratio: 1.15,
      streak_days: 5,
      best_hour: '09:00-10:00',
    }
  }

  /**
   * 获取模拟导出文本（开发模式）
   */
  private getMockExportText(): string {
    return `# 用户行为数据报告 - ${new Date().toISOString().split('T')[0]}

## 基础统计
- 总专注时长: 195 分钟
- 专注会话数: 8 次
- 平均单次时长: 24 分钟
- 番茄钟比例: 75.0%

## 时间分布
- 首次专注: 09:00
- 最后专注: 17:30
- 最佳时段: 09:00-10:00
- 高峰时段: [09:00-10:00 14:00-15:00]

## 任务情况
- 任务多样性: 3 个不同任务
- 完成任务数: 2 个
- 休息比例: 15.0%

## 对比分析
- 与7天平均相比: better (15.0%)

## 连续性
- 连续专注天数: 5 天

## 会话详情
1. 09:00 - 09:25 | pomodoro模式 | 25分钟 | 任务: 完成开发文档
2. 09:30 - 09:55 | pomodoro模式 | 25分钟 | 任务: 完成开发文档
3. 10:00 - 10:25 | pomodoro模式 | 25分钟 | 任务: 学习Vue.js基础
4. 14:00 - 14:25 | pomodoro模式 | 25分钟 | 任务: 学习Vue.js基础
5. 14:30 - 14:55 | custom模式 | 30分钟 | 任务: 阅读技术文档
6. 15:00 - 15:25 | custom模式 | 30分钟 | 任务: 阅读技术文档
7. 17:00 - 17:25 | pomodoro模式 | 25分钟 | 任务: 准备演讲材料
8. 17:30 - 17:55 | pomodoro模式 | 25分钟 | 任务: 准备演讲材料
`
  }
}

// 创建单例实例
const aiCopilotService = new AICopilotService()
export default aiCopilotService
