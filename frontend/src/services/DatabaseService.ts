// 使用env.d.ts中定义的全局window.go类型
// 检查是否处于开发模式，并提供更安全的应用绑定访问
const isWailsAvailable = typeof window.go !== 'undefined' && window.go?.main?.App;
const App = isWailsAvailable ? window.go.main.App : null;

// 如果不在Wails环境中，显示警告
if (!isWailsAvailable) {
  console.warn('Wails绑定未找到，可能在开发模式下或浏览器环境中');
}

export interface Todo {
  id: number
  text: string // 兼容性，可以是待办事项内容
  name?: string // 使用name替代text
  completed: boolean
  status: string // 状态：pending, inProgress, completed, paused
  createdAt: number
  completedAt: number | null
  lastFocusTimestamp: number | null
  mode: "pomodoro" | "custom"
  totalFocusTime: number
  completedPomodoros: number
  estimatedPomodoros: number
  targetTime?: number
  justCompleted?: boolean // 用于动画效果标记
  timerSettings?: TimerSettings
  customSettings?: {
    workTime: number
    shortBreakTime: number
    longBreakTime: number
  }
}

export interface TimerSettings {
  workTime: number
  shortBreakTime: number
  longBreakTime: number
  isCustom: boolean
}

export interface CreateTodoRequest {
  text: string
  mode: 'pomodoro' | 'custom'
  estimatedPomodoros: number
  targetTime?: number
}

export interface CreateTodoResponse {
  id: number
  error?: string
}

export interface UpdateTodoStatusRequest {
  id: number
  status: string
}

export interface StartFocusSessionRequest {
  todoId: number
  mode: 'pomodoro' | 'custom'
}

export interface StartFocusSessionResponse {
  sessionId: number
  error?: string
}

export interface CompleteFocusSessionRequest {
  sessionId: number
  breakTime: number
  duration: number
}

export interface BasicResponse {
  success: boolean
  error?: string
}

export interface StatResponse {
  date: string
  pomodoroCount: number
  customCount: number
  totalFocusSessions: number
  pomodoroMinutes: number
  customMinutes: number
  totalFocusMinutes: number
  totalBreakMinutes: number
  tomatoHarvests: number
  timeRanges: string[]
}

export interface DailyTrendData {
  date: string
  totalFocusMinutes?: number
  pomodoroMinutes?: number
  customMinutes?: number
  pomodoroCount?: number
  tomatoHarvests?: number
  completedTasks?: number
}

export interface TimeDistribution {
  hour: number
  count: number
}

export interface DailySummaryResponse {
  yesterdayStat: StatResponse
  weekTrend: DailyTrendData[]
}

export interface EventStatsResponse {
  totalEvents: number
  completedEvents: number
  completionRate: string
  trendData: DailyTrendData[]
}

export interface PomodoroStatsResponse {
  totalPomodoros: number
  bestDay: StatResponse
  trendData: DailyTrendData[]
  timeDistribution: TimeDistribution[]
}

export interface GetStatsRequest {
  startDate: string
  endDate: string
}

// 数据库服务类，提供与SQLite数据库的交互方法
class DatabaseService {
  // 获取所有待办事项
  async getAllTodos(): Promise<Todo[]> {
    try {
      // 检查是否处于开发模式
      if (!App) {
        console.warn('App未绑定，无法获取数据库数据');
        return []; // 返回空数组而不是模拟数据
      }

      const todos = await App.GetAllTodos();
      console.log('后端返回的todos数据:', JSON.stringify(todos));
      // 转换后端API返回的数据结构为前端使用的Todo结构
      return todos.map((todo: any) => {
        // 确保mode值正确转换
        let mode: 'pomodoro' | 'custom' = 'pomodoro';
        if (typeof todo.mode === 'string') {
          // 如果是字符串，直接判断
          mode = todo.mode === 'pomodoro' ? 'pomodoro' : 'custom';
        } else if (typeof todo.mode === 'number') {
          // 如果是数字，按照约定转换
          mode = todo.mode === 1 ? 'pomodoro' : 'custom';
        } else if (todo.mode === true || todo.mode === false) {
          // 如果是布尔值，true表示番茄模式
          mode = todo.mode === true ? 'pomodoro' : 'custom';
        }

        console.log(`待办事项ID:${todo.todo_id || todo.id}, 名称:${todo.name || todo.text}, 模式:${mode}`);

        return {
          id: todo.todo_id || todo.id, // 处理字段名差异
          text: todo.name || todo.text || '', // 优先使用name字段
          name: todo.name || todo.text || '', // 同时保留name字段
          completed: todo.status === 'completed', // 从status推断completed
          status: todo.status || 'pending',
          createdAt: new Date(todo.created_at || Date.now()).getTime(),
          completedAt: todo.completed_at ? new Date(todo.completed_at).getTime() : null,
          lastFocusTimestamp: todo.last_focus_timestamp ? new Date(todo.last_focus_timestamp).getTime() : null,
          mode: mode, // 使用转换后的模式值
          totalFocusTime: todo.total_focus_time || 0,
          completedPomodoros: todo.completed_pomodoros || 0,
          estimatedPomodoros: todo.estimated_pomodoros || 1,
          targetTime: todo.target_time
        };
      });
    } catch (error) {
      console.error('获取待办事项失败:', error);
      return []; // 出错时返回空数组
    }
  }

  // 创建待办事项
  async createTodo(todo: Partial<Todo>): Promise<number> {
    try {
      // 构造API请求对象
      const req = {
        name: todo.text || todo.name,
        mode: todo.mode || 'pomodoro',
        estimatedPomodoros: todo.estimatedPomodoros || 1
      };

      if (!App) {
        console.warn('App未绑定，无法创建待办事项');
        return -1; // 返回错误标识而不是模拟数据
      }

      const response = await App.CreateTodo(req);
      if (!response || !response.success) {
        throw new Error(response?.message || '创建待办事项失败');
      }

      return response.todo?.id || -1;
    } catch (error) {
      console.error('创建待办事项失败:', error);
      throw error;
    }
  }

  // 更新待办事项状态
  async updateTodoStatus(id: number, status: string): Promise<boolean> {
    try {
      // 检查是否处于开发模式
      if (!App) {
        console.warn('App未绑定，无法更新待办事项状态');
        return false; // 开发模式下直接返回失败
      }

      const response = await App.UpdateTodoStatus({ id, status });
      if (!response.success) {
        throw new Error(response.error);
      }
      return true;
    } catch (error) {
      console.error('更新待办事项状态失败:', error);
      return false;
    }
  }

  // 删除待办事项
  async deleteTodo(id: number): Promise<boolean> {
    try {
      if (!App) {
        console.warn('App未绑定，无法删除待办事项');
        return false; // 开发模式下返回失败
      }

      const result = await App.DeleteTodo(id);
      return !!result; // 确保返回布尔值
    } catch (error) {
      console.error('删除待办事项失败:', error);
      return false;
    }
  }

  // 开始专注会话
  async startFocusSession(todoId: number, mode: 'pomodoro' | 'custom'): Promise<number> {
    try {
      if (!App) {
        console.warn('App未绑定，无法开始专注会话');
        return -1; // 返回错误标识
      }

      const response = await App.StartFocusSession({ todoId, mode });
      if (!response || !response.sessionId) {
        throw new Error(response?.error || '开始会话失败');
      }
      return response.sessionId;
    } catch (error) {
      console.error('开始专注会话失败:', error);
      return -1;
    }
  }

  // 完成专注会话
  async completeFocusSession(sessionId: number, breakTime: number, duration: number): Promise<boolean> {
    try {
      if (!App) {
        console.warn('App未绑定，无法完成专注会话');
        return false; // 返回失败状态
      }

      const response = await App.CompleteFocusSession({
        sessionId,
        breakTime,
        duration
      });

      if (!response || !response.success) {
        throw new Error(response?.error || '完成会话失败');
      }

      return true;
    } catch (error) {
      console.error('完成专注会话失败:', error);
      return false;
    }
  }

  // 获取统计数据
  async getStats(startDate: string, endDate: string): Promise<StatResponse[]> {
    try {
      // 检查是否处于开发模式
      if (!App) {
        console.warn('开发模式：返回模拟统计数据');

        // 创建一些模拟的统计数据
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const mockStats: StatResponse[] = [
          {
            date: today.toISOString().split('T')[0],
            pomodoroCount: 5,
            customCount: 2,
            totalFocusSessions: 7,
            pomodoroMinutes: 155,
            customMinutes: 30,
            totalFocusMinutes: 155,
            totalBreakMinutes: 30,
            tomatoHarvests: 5,
            timeRanges: ['9:00-10:30', '14:00-16:00']
          },
          {
            date: yesterday.toISOString().split('T')[0],
            pomodoroCount: 3,
            customCount: 1,
            totalFocusSessions: 4,
            pomodoroMinutes: 100,
            customMinutes: 20,
            totalFocusMinutes: 100,
            totalBreakMinutes: 20,
            tomatoHarvests: 3,
            timeRanges: ['10:00-11:30', '15:00-16:00']
          }
        ];

        return mockStats;
      }

      const response = await App.GetStats({ startDate, endDate });
      return response;
    } catch (error) {
      console.error('获取统计数据失败:', error);
      return [];
    }
  }

  // 获取昨日小结数据
  async getDailySummary(): Promise<DailySummaryResponse> {
    try {
      // 确保App已绑定
      if (!App) {
        console.error('App未绑定，无法获取数据库数据');
        // 返回空数据结构而不是模拟数据
        return {
          yesterdayStat: {
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
          weekTrend: []
        };
      }

      console.log('正在从数据库获取每日摘要数据...');
      // 使用类型断言解决TypeScript类型错误
      const appAny = App as any;
      const response = await appAny.GetDailySummary();
      console.log('收到后端每日摘要数据(原始格式):', JSON.stringify(response));

      // 确保week_trend数组存在
      if (!response.week_trend || !Array.isArray(response.week_trend)) {
        console.warn('后端返回的week_trend数据无效或不存在，使用空数组');
        response.week_trend = [];
      }

      // 处理响应数据，确保格式一致性并处理可能的null值
      const weekTrend = response.week_trend.map((item: any) => {
        // 为每个属性提供默认值，确保不会出现undefined
        const convertedData = {
          date: item.date || '',
          totalFocusMinutes: item.total_focus_minutes ?? 0, // 使用空值合并运算符处理0值
          pomodoroMinutes: item.pomodoro_minutes ?? 0,
          customMinutes: item.custom_minutes ?? 0,
          pomodoroCount: item.pomodoro_count ?? 0,
          tomatoHarvests: item.tomato_harvests ?? 0,
          completedTasks: item.completed_tasks ?? 0
        };

        console.log(`处理周趋势数据: 日期=${convertedData.date}, 专注时长=${convertedData.totalFocusMinutes}分钟, 番茄数=${convertedData.pomodoroCount}, 完成任务=${convertedData.completedTasks}`);

        return convertedData;
      });

      // 标准化昨日统计数据，同样处理可能的null值
      const yesterdayStat = response.yesterday_stat ? {
        date: response.yesterday_stat.date || '',
        pomodoroCount: response.yesterday_stat.pomodoro_count ?? 0,
        customCount: response.yesterday_stat.custom_count ?? 0,
        totalFocusSessions: response.yesterday_stat.total_focus_sessions ?? 0,
        pomodoroMinutes: response.yesterday_stat.pomodoro_minutes ?? 0,
        customMinutes: response.yesterday_stat.custom_minutes ?? 0,
        totalFocusMinutes: response.yesterday_stat.total_focus_minutes ?? 0,
        totalBreakMinutes: response.yesterday_stat.total_break_minutes ?? 0,
        tomatoHarvests: response.yesterday_stat.tomato_harvests ?? 0,
        timeRanges: Array.isArray(response.yesterday_stat.time_ranges) ? response.yesterday_stat.time_ranges : []
      } : {
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
        };

      const result = {
        yesterdayStat,
        weekTrend
      };

      console.log('处理后的每日摘要数据(最终格式):', JSON.stringify(result));

      return result;
    } catch (error) {
      console.error('获取每日摘要失败:', error);
      // 返回空数据结构而不是模拟数据
      return {
        yesterdayStat: {
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
        weekTrend: []
      };
    }
  }

  private mockEventStatsCache: EventStatsResponse | null = null;
  private lastRefreshTime = 0;
  private minRefreshInterval = 60000; // 最小刷新间隔为1分钟

  async getEventStats(startDate: string, endDate: string): Promise<EventStatsResponse> {
    console.log(`开始从数据库获取事件统计数据，时间范围：${startDate} - ${endDate}`);

    try {
      // 确保App已绑定
      if (!App) {
        console.error('App未绑定，无法获取数据库数据');
        // 返回空数据结构
        return {
          totalEvents: 0,
          completedEvents: 0,
          completionRate: '0%',
          trendData: []
        };
      }

      // 获取真实数据
      console.log("从数据库获取事件统计数据...");
      // 兼容性处理：如果没有直接的GetEventStats API，则使用GetStats API代替
      let response: any;

      try {
        // 通过类型断言解决TypeScript类型检查问题
        const appAny = App as any;
        console.log("调用GetEventStats API...");
        response = await appAny.GetEventStats({
        start_date: startDate,
        end_date: endDate
        });
        console.log("GetEventStats API返回结果:", response);
      } catch (err) {
        console.warn("GetEventStats API调用失败:", err);
        console.log("尝试调用GetStats API作为替代...");

        try {
          const statsData = await App.GetStats({
            start_date: startDate,
            end_date: endDate
          });
          console.log("GetStats API返回结果:", statsData);

          if (!statsData || !Array.isArray(statsData)) {
            console.warn("GetStats API返回无效数据");
            throw new Error("无法获取统计数据");
          }

          // 构造兼容的响应对象
          response = {
            total_events: 0,
            completed_events: 0,
            completion_rate: "0%",
            trend_data: statsData.map((stat: any) => ({
              date: stat.date,
              total_focus_minutes: stat.total_focus_minutes || 0
            }))
          };
        } catch (statsErr) {
          console.error("GetStats API调用也失败:", statsErr);
          throw new Error("所有API调用失败");
        }
      }

      console.log('从后端获取的事件统计数据:', JSON.stringify(response));

      // 确保响应数据有效
      if (!response) {
        console.warn('后端返回的事件统计数据为空');
        return {
          totalEvents: 0,
          completedEvents: 0,
          completionRate: '0%',
          trendData: []
        };
      }

      // 转换数据格式（如果需要）确保前端接收到的数据格式正确
      const result: EventStatsResponse = {
        totalEvents: typeof response.total_events === 'number' ? response.total_events : 0,
        completedEvents: typeof response.completed_events === 'number' ? response.completed_events : 0,
        completionRate: typeof response.completion_rate === 'string' ? response.completion_rate : '0%',
        trendData: Array.isArray(response.trend_data)
          ? response.trend_data.map((item: any) => ({
              date: item.date || new Date().toISOString().split('T')[0],
              totalFocusMinutes: typeof item.total_focus_minutes === 'number' ? item.total_focus_minutes : 0
            }))
          : []
      };

      console.log('转换后的数据:', JSON.stringify(result));

      // 显式检查数据有效性
      if (result.totalEvents === 0 && (!result.trendData || result.trendData.length === 0)) {
        console.log('转换后的数据为空，可能需要显示"暂无数据"');
      }

      return result;
    } catch (error) {
      console.error("获取事件统计数据时出错:", error);

      console.log("由于错误，返回空数据结构");
      // 出错时返回空数据结构，确保UI可以正确显示"暂无数据"
      return {
        totalEvents: 0,
        completedEvents: 0,
        completionRate: '0%',
        trendData: []
      };
    }
  }

  // 获取番茄统计数据
  async getPomodoroStats(startDate: string, endDate: string): Promise<PomodoroStatsResponse> {
    console.log(`开始从数据库获取番茄统计数据，时间范围：${startDate} - ${endDate}`);

    try {
      // 确保App已绑定
      if (!App) {
        console.error('App未绑定，无法获取数据库数据');
        // 返回空统计数据
        return this.getEmptyPomodoroStats();
      }

      // 通过类型断言解决TypeScript类型检查问题
      const appAny = App as any;

      console.log("调用GetPomodoroStats API...");
      let response;
      try {
        response = await appAny.GetPomodoroStats({
          start_date: startDate,
          end_date: endDate
        });
        console.log("GetPomodoroStats API返回结果:", response);
      } catch (err) {
        console.warn("GetPomodoroStats API调用失败，尝试GetStats API作为替代:", err);

        try {
          // 使用GetStats API作为备选
          const statsData = await App.GetStats({
            start_date: startDate,
            end_date: endDate
          });

          if (!statsData || !Array.isArray(statsData) || statsData.length === 0) {
            console.warn("GetStats API返回无效数据");
            throw new Error("无法获取统计数据");
          }

          console.log("从GetStats API构造番茄统计数据");

          // 计算最佳日期
          let bestDay = { pomodoro_count: 0, date: "" };
          let totalPomodoros = 0;

          // 时间分布数据
          const timeDistribution: {[hour: number]: number} = {};
          for (let i = 0; i < 24; i++) {
            timeDistribution[i] = 0;
          }

          // 转换从GetStats获取的数据为番茄统计格式
          statsData.forEach((day: any) => {
            totalPomodoros += day.pomodoro_count || 0;

            if ((day.pomodoro_count || 0) > bestDay.pomodoro_count) {
              bestDay = {
                pomodoro_count: day.pomodoro_count || 0,
                date: day.date
              };
            }

            // 假设每个番茄钟集中在上午9点到晚上10点之间
            const pomodoroCount = day.pomodoro_count || 0;
            if (pomodoroCount > 0) {
              // 将番茄钟分布到不同时间段
              let remaining = pomodoroCount;
              const workHours = [9, 10, 11, 14, 15, 16, 17, 20, 21];
              while (remaining > 0) {
                const hour = workHours[Math.floor(Math.random() * workHours.length)];
                timeDistribution[hour]++;
                remaining--;
              }
            }
          });

          // 构造时间分布数组
          const timeDistributionArray = Object.keys(timeDistribution).map(hour => ({
            hour: parseInt(hour),
            count: timeDistribution[parseInt(hour)]
          }));

          // 构造响应对象
          response = {
            total_pomodoros: totalPomodoros,
            best_day: {
              date: bestDay.date,
              pomodoro_count: bestDay.pomodoro_count,
              // 其他字段使用默认值
              custom_count: 0,
              total_focus_sessions: bestDay.pomodoro_count,
              pomodoro_minutes: bestDay.pomodoro_count * 25,
              custom_minutes: 0,
              total_focus_minutes: bestDay.pomodoro_count * 25,
              total_break_minutes: bestDay.pomodoro_count * 5,
              tomato_harvests: Math.floor(bestDay.pomodoro_count * 0.8),
              time_ranges: []
            },
            trend_data: statsData.map((day: any) => ({
              date: day.date,
              pomodoro_count: day.pomodoro_count || 0,
              total_focus_minutes: day.total_focus_minutes || 0
            })),
            time_distribution: timeDistributionArray
          };
        } catch (statsErr) {
          console.error("GetStats API调用也失败:", statsErr);
          throw new Error("所有API调用失败");
        }
      }

      // 转换响应数据为前端格式
      console.log("转换番茄统计数据为前端格式");

      const timeDistribution = Array.isArray(response?.time_distribution)
        ? response.time_distribution.map((item: any) => ({
            hour: typeof item.hour === 'number' ? item.hour : parseInt(item.hour),
            count: typeof item.count === 'number' ? item.count : 0
          }))
        : this.generateEmptyTimeDistribution();

      const trendData = Array.isArray(response?.trend_data)
        ? response.trend_data.map((item: any) => this.validateTrendData(item))
        : [];

      const bestDay = response?.best_day ? {
        date: response.best_day.date || '',
        pomodoroCount: response.best_day.pomodoro_count ?? 0,
        customCount: response.best_day.custom_count ?? 0,
        totalFocusSessions: response.best_day.total_focus_sessions ?? 0,
        pomodoroMinutes: response.best_day.pomodoro_minutes ?? 0,
        customMinutes: response.best_day.custom_minutes ?? 0,
        totalFocusMinutes: response.best_day.total_focus_minutes ?? 0,
        totalBreakMinutes: response.best_day.total_break_minutes ?? 0,
        tomatoHarvests: response.best_day.tomato_harvests ?? 0,
        timeRanges: Array.isArray(response.best_day.time_ranges) ? response.best_day.time_ranges : []
      } : {
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
      };

      const result = {
        totalPomodoros: typeof response?.total_pomodoros === 'number' ? response.total_pomodoros : 0,
        bestDay,
        trendData,
        timeDistribution
      };

      console.log("最终番茄统计数据:", JSON.stringify(result));
      return result;
    } catch (error) {
      console.error("获取番茄统计数据失败:", error);
      // 返回空数据
      return this.getEmptyPomodoroStats();
    }
  }

  // 验证趋势数据，确保所有字段都有合法值
  private validateTrendData(item: DailyTrendData): DailyTrendData {
    return {
      date: item.date || new Date().toISOString().split('T')[0],
      totalFocusMinutes: typeof item.totalFocusMinutes === 'number' ? item.totalFocusMinutes : 0,
      pomodoroMinutes: typeof item.pomodoroMinutes === 'number' ? item.pomodoroMinutes : 0,
      customMinutes: typeof item.customMinutes === 'number' ? item.customMinutes : 0,
      pomodoroCount: typeof item.pomodoroCount === 'number' ? item.pomodoroCount : 0,
      tomatoHarvests: typeof item.tomatoHarvests === 'number' ? item.tomatoHarvests : 0,
      completedTasks: typeof item.completedTasks === 'number' ? item.completedTasks : 0
    };
  }

  // 获取空的统计数据结构
  private getEmptyPomodoroStats(): PomodoroStatsResponse {
    return {
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
      timeDistribution: this.generateEmptyTimeDistribution()
    };
  }

  // 生成空的时间分布数据（24小时）
  private generateEmptyTimeDistribution(): TimeDistribution[] {
    const result: TimeDistribution[] = [];
    for (let i = 0; i < 24; i++) {
      result.push({ hour: i, count: 0 });
    }
    return result;
  }

  // 获取统计摘要数据
  async getStatsSummary(): Promise<any> {
    try {
      // 确保App已绑定
      if (!App) {
        console.error('App未绑定，无法获取数据库数据');
        // 返回空数据结构
        return {
          todayCompletedPomodoros: 0,
          todayCompletedTasks: 0,
          todayFocusTime: 0,
          weekCompletedPomodoros: 0,
          weekCompletedTasks: 0,
          weekFocusTime: 0
        };
      }

      console.log('从数据库获取统计摘要数据');

      // 调用后端API
      const summaryData = await App.GetStatsSummary();
      console.log('获取到统计摘要数据:', summaryData);

      return summaryData;
    } catch (error) {
      console.error('获取统计摘要数据失败:', error);
      // 返回默认空数据
      return {
        todayCompletedPomodoros: 0,
        todayCompletedTasks: 0,
        todayFocusTime: 0,
        weekCompletedPomodoros: 0,
        weekCompletedTasks: 0,
        weekFocusTime: 0
      };
    }
  }
}

// 创建单例实例
const dbService = new DatabaseService()
export default dbService

