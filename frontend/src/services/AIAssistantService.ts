import { ref, Ref } from 'vue';
import DatabaseService from './DatabaseService';

// 定义聊天消息类型
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  taskData?: TaskPlan[] | null;
}

// 定义任务计划类型
export interface TaskPlan {
  name: string;
  mode: 'pomodoro' | 'deep_work' | 'short_break' | 'long_break';
  focusDuration: number; // 专注时长（分钟）
  breakDuration: number; // 休息时长（分钟）
}

// API接口类型
interface DeepSeekResponse {
  content: string;
  taskData?: TaskPlan[] | null;
}

class AIAssistantServiceClass {
  private chatHistory: Ref<ChatMessage[]> = ref([
    {
      role: 'assistant',
      content: '你好！我是你的番茄工作法AI时间助手。请告诉我你今天想要完成的任务，我会帮你安排合理的专注时间计划。',
      timestamp: Date.now()
    }
  ]);
  private isLoading: Ref<boolean> = ref(false);
  private apiKey: string = import.meta.env.VITE_DEEPSEEK_API_KEY || '';

  constructor() {
    // 从本地存储加载聊天历史
    this.loadChatHistoryFromStorage();
  }

  // 获取聊天历史
  getChatHistory(): Ref<ChatMessage[]> {
    return this.chatHistory;
  }

  // 获取加载状态
  getLoadingState(): Ref<boolean> {
    return this.isLoading;
  }

  // 发送消息到AI服务
  async sendMessage(message: string): Promise<void> {
    if (message.trim() === '' || this.isLoading.value) return;

    // 添加用户消息到聊天历史
    this.chatHistory.value.push({
      role: 'user',
      content: message,
      timestamp: Date.now()
    });

    // 更新本地存储
    this.saveChatHistoryToStorage();

    // 设置加载状态
    this.isLoading.value = true;

    try {
      // 调用DeepSeek API获取响应
      const response = await this.callDeepSeekAPI(message);

      // 添加AI响应到聊天历史
      this.chatHistory.value.push({
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
        taskData: response.taskData
      });

      // 更新本地存储
      this.saveChatHistoryToStorage();
    } catch (error) {
      console.error('Error calling DeepSeek API:', error);

      // 添加错误消息
      this.chatHistory.value.push({
        role: 'assistant',
        content: '抱歉，我在处理您的请求时遇到了问题。请再试一次。',
        timestamp: Date.now()
      });
    } finally {
      // 重置加载状态
      this.isLoading.value = false;
    }
  }

  // 调用DeepSeek API
  private async callDeepSeekAPI(userMessage: string): Promise<DeepSeekResponse> {
    // 预处理消息历史
    const messageHistory = this.chatHistory.value.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // 添加系统指令，引导AI生成特定格式的响应
    const apiMessages = [
      {
        role: 'system',
        content: `你是一个专业的番茄工作法时间管理助手。当用户描述他们的任务时，请按以下要求帮助规划：
1. 解析用户的任务请求
2. 生成合理的番茄工作法时间安排
3. 返回友好的文字说明和结构化的任务数据

请遵循以下响应格式：
- 首先提供自然语言解释，分析用户需求并解释你的安排
- 然后提供一个JSON代码块，包含任务数据

JSON格式示例：
\`\`\`json
{
  "tasks": [
    {
      "name": "英语学习",
      "mode": "pomodoro",
      "focusDuration": 25,
      "breakDuration": 5
    },
    {
      "name": "论文写作",
      "mode": "deep_work",
      "focusDuration": 45,
      "breakDuration": 10
    }
  ]
}
\`\`\`

请注意：
- pomodoro: 标准番茄工作法（通常25分钟专注+5分钟休息）
- deep_work: 深度工作（通常45-90分钟专注+10-15分钟休息）
- short_break: 短休息（5分钟）
- long_break: 长休息（15-30分钟）

请根据任务性质选择合适的模式，并确保JSON格式正确。`
      },
      ...messageHistory,
      {
        role: 'user',
        content: userMessage
      }
    ];

    // 在实际环境中，这里会调用DeepSeek API
    // 由于暂无API集成，这里模拟API响应
    // TODO: 替换为实际的DeepSeek API调用
    return new Promise((resolve) => {
      setTimeout(() => {
        // 模拟AI返回的任务数据
        const mockTaskData = {
          tasks: [
            {
              name: "英语学习",
              mode: "pomodoro",
              focusDuration: 25,
              breakDuration: 5
            },
            {
              name: "论文写作",
              mode: "deep_work",
              focusDuration: 45,
              breakDuration: 10
            }
          ]
        };

        const mockResponse = {
          content: `根据你的需求，我为你制定了一个专注时间计划：

1. **英语学习**：采用标准番茄工作法，25分钟专注学习，然后休息5分钟。这种方式适合语言学习这类需要持续但不过度疲劳的任务。

2. **论文写作**：使用深度工作模式，连续专注45分钟，然后休息10分钟。写论文需要深度思考，这种模式可以让你进入更好的专注状态。

这个计划平衡了专注和休息，避免过度疲劳。你可以根据需要重复这些循环。需要我调整这个计划吗？

\`\`\`json
{
  "tasks": [
    {
      "name": "英语学习",
      "mode": "pomodoro",
      "focusDuration": 25,
      "breakDuration": 5
    },
    {
      "name": "论文写作",
      "mode": "deep_work",
      "focusDuration": 45,
      "breakDuration": 10
    }
  ]
}
\`\`\``,
          taskData: [
            {
              name: "英语学习",
              mode: "pomodoro" as 'pomodoro' | 'deep_work' | 'short_break' | 'long_break',
              focusDuration: 25,
              breakDuration: 5
            },
            {
              name: "论文写作",
              mode: "deep_work" as 'pomodoro' | 'deep_work' | 'short_break' | 'long_break',
              focusDuration: 45,
              breakDuration: 10
            }
          ]
        };

        resolve(mockResponse);
      }, 1500);
    });
  }

  // 应用任务计划
  async applyTaskPlan(taskPlan: TaskPlan[]): Promise<boolean> {
    try {
      // 创建任务
      for (const task of taskPlan) {
        console.log(`创建AI推荐的任务: ${task.name}, 模式: ${task.mode}`);
        // 模拟创建操作，实际项目中这里应调用数据库服务
        // TODO: 连接到真实数据库
      }

      return true;
    } catch (error) {
      console.error('Error applying task plan:', error);
      return false;
    }
  }

  // 清空聊天历史
  clearChatHistory(): void {
    this.chatHistory.value = [
      {
        role: 'assistant',
        content: '你好！我是你的番茄工作法AI时间助手。请告诉我你今天想要完成的任务，我会帮你安排合理的专注时间计划。',
        timestamp: Date.now()
      }
    ];

    // 更新本地存储
    this.saveChatHistoryToStorage();
  }

  // 保存聊天历史到本地存储
  private saveChatHistoryToStorage(): void {
    try {
      localStorage.setItem('ai_chat_history', JSON.stringify(this.chatHistory.value));
    } catch (error) {
      console.error('Error saving chat history to storage:', error);
    }
  }

  // 从本地存储加载聊天历史
  private loadChatHistoryFromStorage(): void {
    try {
      const storedHistory = localStorage.getItem('ai_chat_history');

      if (storedHistory) {
        this.chatHistory.value = JSON.parse(storedHistory);
      }
    } catch (error) {
      console.error('Error loading chat history from storage:', error);
    }
  }
}

// 导出单例
const AIAssistantService = new AIAssistantServiceClass();
export default AIAssistantService;
