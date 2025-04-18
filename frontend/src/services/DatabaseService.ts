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
  totalFocusMinutes: number
  totalBreakMinutes: number
  tomatoHarvests: number
  timeRanges: string
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
            totalFocusMinutes: 155,
            totalBreakMinutes: 30,
            tomatoHarvests: 5,
            timeRanges: JSON.stringify(['9:00-10:30', '14:00-16:00'])
          },
          {
            date: yesterday.toISOString().split('T')[0],
            pomodoroCount: 3,
            customCount: 1,
            totalFocusSessions: 4,
            totalFocusMinutes: 100,
            totalBreakMinutes: 20,
            tomatoHarvests: 3,
            timeRanges: JSON.stringify(['10:00-11:30', '15:00-16:00'])
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
}

// 创建单例实例
const dbService = new DatabaseService()
export default dbService
