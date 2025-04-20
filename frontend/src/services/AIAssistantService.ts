// AI助手服务，用于与DeepSeek API通信
import { ref } from 'vue';

// 检查是否处于开发模式，并提供更安全的应用绑定访问
const isWailsAvailable = typeof window.go !== 'undefined' && window.go?.main?.App;
const App = isWailsAvailable ? window.go.main.App : null;

// 任务计划类型
export interface TaskPlan {
  name: string;
  mode: 'pomodoro' | 'custom';
  estimatedPomodoros?: number;
  targetTime?: number;
}

// 聊天消息类型
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  taskPlan?: TaskPlan[];
}

// DeepSeek消息类型
interface DeepSeekMessage {
  role: string;
  content: string;
}

// DeepSeek API响应类型
interface DeepSeekAPIResponse {
  role: string;
  content: string;
}

// AI助手服务类
class AIAssistantService {
  private chatHistory = ref<ChatMessage[]>([]);
  private isLoading = ref(false);
  private mockMode = !isWailsAvailable; // 开发模式下使用模拟数据

  constructor() {
    // 初始化聊天历史
    this.chatHistory.value = [
      {
        role: 'assistant',
        content: '你好！我是你的AI时间专注助手。请告诉我你今天需要完成哪些任务，我可以帮你安排一个基于番茄工作法的时间计划。'
      }
    ];
  }

  // 获取聊天历史
  getChatHistory() {
    return this.chatHistory;
  }

  // 获取加载状态
  getLoadingState() {
    return this.isLoading;
  }

  // 发送消息到AI并获取响应
  async sendMessage(message: string): Promise<ChatMessage> {
    // 设置加载状态
    this.isLoading.value = true;

    try {
      let response: ChatMessage;

      if (this.mockMode) {
        // 模拟模式下使用本地模拟数据
        response = await this.getMockResponse(message);
      } else {
        // 真实环境调用后端API
        response = await this.callDeepSeekAPI(message);
      }

      // 添加到聊天历史
      this.chatHistory.value.push({
        role: 'user',
        content: message
      });
      this.chatHistory.value.push(response);

      return response;
    } catch (error) {
      console.error('AI助手请求失败:', error);
      return {
        role: 'assistant',
        content: '抱歉，我遇到了一些问题，无法处理您的请求。请稍后再试。'
      };
    } finally {
      this.isLoading.value = false;
    }
  }

  // 调用DeepSeek API (通过后端中转)
  private async callDeepSeekAPI(message: string): Promise<ChatMessage> {
    if (!App) {
      throw new Error('App未绑定，无法调用DeepSeek API');
    }

    try {
      // 构建聊天历史上下文
      const context = this.chatHistory.value.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // 调用后端API
      // 由于TypeScript类型问题，使用类型断言
      const appAny = App as any;
      const response = await appAny.CallDeepSeekAPI({
        messages: [...context, { role: 'user', content: message }],
        model: 'deepseek-mcp'
      }) as DeepSeekAPIResponse;

      // 解析任务计划
      const taskPlan = this.extractTaskPlan(response.content);

      return {
        role: 'assistant',
        content: response.content,
        taskPlan: taskPlan.length > 0 ? taskPlan : undefined
      };
    } catch (error) {
      console.error('调用DeepSeek API失败:', error);
      throw error;
    }
  }

  // 解析AI响应中的任务计划
  private extractTaskPlan(content: string): TaskPlan[] {
    // 这里简化了任务解析逻辑，实际项目中应该使用更复杂的解析方法
    // 例如正则表达式或结构化响应格式
    const tasks: TaskPlan[] = [];

    try {
      // 检查是否包含任务计划JSON
      const match = content.match(/```json\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```/);
      if (match && match[1]) {
        const jsonData = JSON.parse(match[1]);

        if (Array.isArray(jsonData)) {
          // 直接返回数组中的任务
          return jsonData.map((task: any) => ({
            name: task.name || task.text || '',
            mode: task.mode || 'pomodoro',
            estimatedPomodoros: task.estimatedPomodoros || task.pomodoros || (task.mode === 'pomodoro' ? 1 : undefined),
            targetTime: task.targetTime || (task.mode === 'custom' ? 25 : undefined)
          }));
        } else if (jsonData.tasks && Array.isArray(jsonData.tasks)) {
          // 返回tasks字段中的任务
          return jsonData.tasks.map((task: any) => ({
            name: task.name || task.text || '',
            mode: task.mode || 'pomodoro',
            estimatedPomodoros: task.estimatedPomodoros || task.pomodoros || (task.mode === 'pomodoro' ? 1 : undefined),
            targetTime: task.targetTime || (task.mode === 'custom' ? 25 : undefined)
          }));
        }
      }
    } catch (e) {
      console.error('解析任务计划失败:', e);
    }

    return tasks;
  }

  // 模拟AI响应 (开发测试用)
  private async getMockResponse(message: string): Promise<ChatMessage> {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (message.includes('任务') || message.includes('安排') || message.includes('计划')) {
      return {
        role: 'assistant',
        content: '根据你的需求，我为你安排了以下番茄工作法计划：\n\n```json\n[\n  {\n    "name": "写论文",\n    "mode": "pomodoro",\n    "estimatedPomodoros": 3\n  },\n  {\n    "name": "回复邮件",\n    "mode": "pomodoro",\n    "estimatedPomodoros": 1\n  },\n  {\n    "name": "学习Vue",\n    "mode": "custom",\n    "targetTime": 45\n  }\n]\n```\n\n你可以点击上方的"应用此计划"按钮，我会帮你创建这些任务。如果需要调整，请告诉我具体的修改建议。',
        taskPlan: [
          {
            name: '写论文',
            mode: 'pomodoro',
            estimatedPomodoros: 3
          },
          {
            name: '回复邮件',
            mode: 'pomodoro',
            estimatedPomodoros: 1
          },
          {
            name: '学习Vue',
            mode: 'custom',
            targetTime: 45
          }
        ]
      };
    } else if (message.toLowerCase().includes('hello') || message.includes('你好')) {
      return {
        role: 'assistant',
        content: '你好！我是你的AI时间专注助手。我可以帮你规划基于番茄工作法的时间计划。请告诉我你今天需要完成哪些任务，我会为你创建合理的专注时间安排。'
      };
    } else {
      return {
        role: 'assistant',
        content: '我可以帮你规划基于番茄工作法的时间计划。请告诉我你需要完成哪些任务，我会为你创建合理的专注时间安排。例如："我今天需要写论文、回复邮件和学习Vue"'
      };
    }
  }

  // 应用任务计划到待办事项列表
  async applyTaskPlan(taskPlan: TaskPlan[]): Promise<boolean> {
    try {
      if (!App) {
        console.warn('App未绑定，无法应用任务计划');
        return false;
      }

      // 遍历任务，创建待办事项
      for (const task of taskPlan) {
        const todoRequest = {
          name: task.name,
          mode: task.mode,
          estimatedPomodoros: task.estimatedPomodoros || 1,
          targetTime: task.targetTime
        };

        // 使用类型断言解决TypeScript类型问题
        const appAny = App as any;
        await appAny.CreateTodo(todoRequest);
      }

      return true;
    } catch (error) {
      console.error('应用任务计划失败:', error);
      return false;
    }
  }

  // 清空聊天历史
  clearChatHistory() {
    this.chatHistory.value = [
      {
        role: 'assistant',
        content: '你好！我是你的AI时间专注助手。请告诉我你今天需要完成哪些任务，我可以帮你安排一个基于番茄工作法的时间计划。'
      }
    ];
  }
}

// 导出单例服务
export default new AIAssistantService();
