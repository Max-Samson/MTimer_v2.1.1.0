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

// 提供模拟数据以便在开发环境中测试
const mockTodos: Todo[] = [
  {
    id: 1,
    text: '完成MTimer应用开发',
    name: '完成MTimer应用开发',
    mode: 'pomodoro',
    status: 'pending',
    completed: false,
    createdAt: Date.now() - 86400000,
    completedAt: null,
    lastFocusTimestamp: null,
    totalFocusTime: 0,
    completedPomodoros: 0,
    estimatedPomodoros: 5
  },
  {
    id: 2,
    text: '学习Vue 3和TypeScript',
    name: '学习Vue 3和TypeScript',
    mode: 'custom',
    status: 'pending',
    completed: false,
    createdAt: Date.now() - 172800000,
    completedAt: null,
    lastFocusTimestamp: null,
    totalFocusTime: 1800,
    completedPomodoros: 2,
    estimatedPomodoros: 4
  }
];

// 数据库服务类，提供与SQLite数据库的交互方法
class DatabaseService {
  // 获取所有待办事项
  async getAllTodos(): Promise<Todo[]> {
    try {
      // 检查是否处于开发模式
      if (!App) {
        console.warn('使用模拟数据替代后端API');
        return [...mockTodos]; // 返回模拟数据的拷贝
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
      return [...mockTodos]; // 出错时返回模拟数据
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
        console.warn('开发模式：模拟创建待办事项');
        const newTodo = {
          id: mockTodos.length + 1,
          text: req.name || '',
          name: req.name || '',
          mode: req.mode as 'pomodoro' | 'custom',
          status: 'pending',
          completed: false,
          createdAt: Date.now(),
          completedAt: null,
          lastFocusTimestamp: null,
          totalFocusTime: 0,
          completedPomodoros: 0,
          estimatedPomodoros: req.estimatedPomodoros
        };
        mockTodos.push(newTodo);
        return newTodo.id;
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
        console.warn('开发模式：模拟更新待办事项状态');
        // 在模拟数据中查找并更新
        const todo = mockTodos.find(t => t.id === id);
        if (todo) {
          todo.status = status;
          if (status === 'completed') {
            todo.completed = true;
            todo.completedAt = Date.now();
          } else if (status === 'inProgress') {
            todo.lastFocusTimestamp = Date.now();
          }
        }
        return true;
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
      // 检查是否处于开发模式
      if (!App) {
        console.warn('开发模式：模拟删除待办事项');
        // 从模拟数据中移除
        const index = mockTodos.findIndex(t => t.id === id);
        if (index !== -1) {
          mockTodos.splice(index, 1);
        }
        return true;
      }

      const response = await App.DeleteTodo(id);
      if (!response.success) {
        throw new Error(response.error);
      }
      return true;
    } catch (error) {
      console.error('删除待办事项失败:', error);
      return false;
    }
  }

  // 开始专注会话
  async startFocusSession(todoId: number, mode: 'pomodoro' | 'custom'): Promise<number> {
    try {
      // 检查是否处于开发模式
      if (!App) {
        console.warn('开发模式：模拟开始专注会话');
        // 模拟会话ID
        const sessionId = Date.now();

        // 更新模拟数据中的状态
        const todo = mockTodos.find(t => t.id === todoId);
        if (todo) {
          todo.status = 'inProgress';
          todo.lastFocusTimestamp = Date.now();
        }

        return sessionId;
      }

      const response = await App.StartFocusSession({ todoId, mode });
      if (response.error) {
        throw new Error(response.error);
      }
      return response.sessionId;
    } catch (error) {
      console.error('开始专注会话失败:', error);
      throw error;
    }
  }

  // 完成专注会话
  async completeFocusSession(sessionId: number, breakTime: number, duration: number): Promise<boolean> {
    try {
      // 检查是否处于开发模式
      if (!App) {
        console.warn('开发模式：模拟完成专注会话');

        // 在开发模式下，我们可以假设最近的进行中待办事项是与此会话相关的
        const todo = mockTodos.find(t => t.status === 'inProgress');
        if (todo) {
          todo.status = 'pending';
          todo.totalFocusTime += duration;
          todo.completedPomodoros += 1;

          // 如果完成番茄数达到预期，标记为完成
          if (todo.completedPomodoros >= todo.estimatedPomodoros) {
            todo.status = 'completed';
            todo.completed = true;
            todo.completedAt = Date.now();
          }
        }

        return true;
      }

      const response = await App.CompleteFocusSession({ sessionId, breakTime, duration });
      if (!response.success) {
        throw new Error(response.error);
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
      if (!App) {
        console.warn('Wails绑定未找到，无法获取真实数据');
        // 返回空数据结构
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

      // 获取过去7天的统计数据
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const today = new Date();

      // 使用现有的GetStats API获取数据
      const allStats = await App.GetStats({
        start_date: oneWeekAgo.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0]
      });

      console.log('获取到统计数据:', allStats);

      // 把后端数据格式转换为前端格式
      const stats = allStats.map(stat => ({
        date: stat.date,
        pomodoroCount: stat.pomodoro_count,
        customCount: stat.custom_count,
        totalFocusSessions: stat.total_focus_sessions,
        pomodoroMinutes: stat.pomodoro_minutes || 0,
        customMinutes: stat.custom_minutes || 0,
        totalFocusMinutes: stat.total_focus_minutes,
        totalBreakMinutes: stat.total_break_minutes,
        tomatoHarvests: stat.tomato_harvests,
        timeRanges: stat.time_ranges || []
      }));

      // 找出昨天的数据
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toISOString().split('T')[0];

      let yesterdayStat = stats.find(s => s.date === yesterdayString);

      // 如果没有找到昨天的数据，使用空数据
      if (!yesterdayStat) {
        yesterdayStat = {
          date: yesterdayString,
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
      }

      // 创建趋势数据
      const weekTrend = stats.map(stat => ({
        date: stat.date,
        totalFocusMinutes: stat.totalFocusMinutes,
        pomodoroMinutes: stat.pomodoroMinutes,
        customMinutes: stat.customMinutes,
        pomodoroCount: stat.pomodoroCount,
        tomatoHarvests: stat.tomatoHarvests
      }));

      // 按日期排序
      weekTrend.sort((a, b) => a.date.localeCompare(b.date));

      return {
        yesterdayStat,
        weekTrend
      };
    } catch (error) {
      console.error('获取每日统计数据失败:', error);
      // 返回空数据
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
    console.log(`开始获取事件统计数据，时间范围：${startDate} - ${endDate}`);

    // 更新最后刷新时间
    this.lastRefreshTime = Date.now();

    try {
      // 检查App绑定是否存在
      if (!App) {
        console.warn("App绑定不存在，使用模拟数据");
        console.log("生成模拟事件统计数据");
        return this.generateFixedMockEventStats(startDate, endDate);
      }

      // 获取真实数据
      console.log("尝试从后端API获取事件统计数据...");
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

  // 生成固定的模拟事件统计数据
  private generateFixedMockEventStats(startDate: string, endDate: string): EventStatsResponse {
    console.log('生成固定的模拟事件统计数据');
    // 计算日期范围内的天数
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // 生成趋势数据，使用日期作为种子确保每次生成的数据一致
    const trendData: DailyTrendData[] = [];

    // 固定的事件总数和完成数
    const totalEvents = 15;
    const completedEvents = 8;

    for (let i = 0; i < dayCount; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dateString = currentDate.toISOString().split('T')[0];

      // 将日期字符串转换为数字，用作种子
      const dateSeed = parseInt(dateString.replace(/-/g, ''));

      // 使用日期作为种子生成固定的随机值
      const focusMinutes = this.getSeededRandom(dateSeed, 60, 180);

      trendData.push({
        date: dateString,
        totalFocusMinutes: focusMinutes
      });
    }

    // 按日期排序
    trendData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      totalEvents,
      completedEvents,
      completionRate: '53.3%', // 固定的完成率
      trendData
    };
  }

  // 使用种子生成伪随机数
  private getSeededRandom(seed: number, min: number, max: number): number {
    // 简单的伪随机数生成器
    const x = Math.sin(seed) * 10000;
    const randomValue = (x - Math.floor(x));

    // 映射到指定范围
    return Math.floor(min + randomValue * (max - min + 1));
  }

  // 获取番茄统计数据
  async getPomodoroStats(startDate: string, endDate: string): Promise<PomodoroStatsResponse> {
    try {
      if (!App) {
        console.warn('开发模式：返回模拟番茄统计数据');
        return this.getEmptyPomodoroStats(); // 使用空数据结构替代模拟数据
      }

      const request = { startDate, endDate };
      console.log(`获取从 ${startDate} 到 ${endDate} 的番茄统计数据`);

      // 使用GetStats API获取数据
      const statsData = await App.GetStats({
        start_date: startDate,
        end_date: endDate
      });

      // 数据验证和修复
      if (!statsData || !Array.isArray(statsData)) {
        console.error('从后端获取到的统计数据为空或格式不正确');
        return this.getEmptyPomodoroStats();
      }

      // 将后端数据转换为前端需要的格式
      const stats = statsData.map((stat: any) => ({
        date: stat.date,
        pomodoroCount: stat.pomodoro_count || 0,
        customCount: stat.custom_count || 0,
        totalFocusSessions: stat.total_focus_sessions || 0,
        pomodoroMinutes: stat.pomodoro_minutes || 0,
        customMinutes: stat.custom_minutes || 0,
        totalFocusMinutes: stat.total_focus_minutes || 0,
        totalBreakMinutes: stat.total_break_minutes || 0,
        tomatoHarvests: stat.tomato_harvests || 0,
        timeRanges: stat.time_ranges || []
      }));

      // 计算总番茄数
      const totalPomodoros = stats.reduce((sum, stat) => sum + stat.pomodoroCount, 0);

      // 找出最佳一天（专注时间最长的）
      const bestDay = stats.reduce((best, current) =>
        (current.totalFocusMinutes > best.totalFocusMinutes) ? current : best,
        {
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
        }
      );

      // 创建趋势数据
      const rawTrendData: DailyTrendData[] = stats.map(stat => ({
        date: stat.date,
        pomodoroCount: stat.pomodoroCount,
        pomodoroMinutes: stat.pomodoroMinutes,
        totalFocusMinutes: stat.totalFocusMinutes,
        tomatoHarvests: stat.tomatoHarvests,
        // 添加completedTasks字段，暂时设为0
        completedTasks: 0
      }));

      // 对趋势数据进行验证和处理
      const validatedTrendData = rawTrendData.map(item => this.validateTrendData(item));

      // 创建时间分布数据
      // 解析timeRanges来构建小时分布
      const hourDistribution: { [key: number]: number } = {};

      // 初始化24小时的分布
      for (let i = 0; i < 24; i++) {
        hourDistribution[i] = 0;
      }

      // 解析每个时间段并累加到对应小时
      stats.forEach(stat => {
        if (!Array.isArray(stat.timeRanges)) return;

        stat.timeRanges.forEach((timeRange: string) => {
          // 格式例如："09:00-09:25" 或 "09:00~09:25"
          const startTime = timeRange.split(/[-~]/)[0].trim();
          if (startTime && startTime.includes(':')) {
            const hour = parseInt(startTime.split(':')[0], 10);
            if (!isNaN(hour) && hour >= 0 && hour < 24) {
              hourDistribution[hour] += 1;
            }
          }
        });
      });

      // 转换为数组格式
      const timeDistributionArray: TimeDistribution[] = [];
      for (let i = 0; i < 24; i++) {
        timeDistributionArray.push({
          hour: i,
          count: hourDistribution[i] || 0
        });
      }

      // 排序趋势数据确保按日期顺序
      validatedTrendData.sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

      return {
        totalPomodoros,
        bestDay,
        trendData: validatedTrendData,
        timeDistribution: timeDistributionArray
      };
    } catch (error) {
      console.error('获取番茄统计数据失败:', error);
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
      if (!App) {
        console.warn('Wails绑定未找到，无法获取真实数据');
        // 返回模拟数据
        return {
          todayCompletedPomodoros: 5,
          todayCompletedTasks: 3,
          todayFocusTime: 7500, // 125分钟
          weekCompletedPomodoros: 23,
          weekCompletedTasks: 15,
          weekFocusTime: 35400 // 590分钟
        };
      }

      console.log('获取统计摘要数据');

      // 调用后端API
      const summaryData = await App.GetStatsSummary();
      console.log('获取到统计摘要数据:', summaryData);

      return summaryData;
    } catch (error) {
      console.error('获取统计摘要数据失败:', error);
      // 返回默认数据
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

