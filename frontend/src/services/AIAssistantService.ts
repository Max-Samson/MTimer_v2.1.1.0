import { ref, Ref } from 'vue';
import DatabaseService from './DatabaseService';
// 使用Wails go绑定的CallDeepSeekAPI函数
import { CallDeepSeekAPI as GoCallDeepSeekAPI } from '../../wailsjs/go/main/App';
import { types } from '../../wailsjs/go/models';
import { useSettingsStore } from '../stores';

// 定义聊天消息类型
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  taskData?: TaskPlan[] | null;
  image?: string | null; // 添加图片支持
}

// 定义任务计划类型
export interface TaskPlan {
  name: string;
  mode: 'pomodoro' | 'deep_work' | 'short_break' | 'long_break';
  focusDuration: number; // 专注时长（分钟）
  breakDuration: number; // 休息时长（分钟）
}

// 聊天模式类型
export type ChatMode = 'task' | 'chat' | 'study';

// API接口类型
interface DeepSeekResponse {
  content: string;
  taskData?: TaskPlan[] | null;
}

class AIAssistantServiceClass {
  private chatHistory: Ref<ChatMessage[]> = ref([]);
  private isLoading: Ref<boolean> = ref(false);
  private currentChatMode: Ref<ChatMode> = ref('task');
  private settingsStore: ReturnType<typeof useSettingsStore> | null = null;

  constructor() {
    console.log('初始化AI助手服务...');

    // 确保初始状态是有效的
    this.isLoading.value = false;
    this.currentChatMode.value = 'task';

    // 从本地存储加载聊天历史
    try {
      this.loadChatHistoryFromStorage();
    } catch (error) {
      console.error('加载聊天历史失败:', error);
      // 不设置默认欢迎消息，让用户直接与DeepSeek交互
      this.chatHistory.value = [];
    }

    console.log('AI助手服务初始化完成，聊天历史记录条数:', this.chatHistory.value.length);
  }

  private getSettingsStore() {
    if (!this.settingsStore) {
      try {
        this.settingsStore = useSettingsStore();
      } catch (error) {
        console.warn('无法获取settingsStore:', error);
      }
    }
    return this.settingsStore;
  }

  // 获取API密钥
  getApiKey(): string {
    const settings = localStorage.getItem('aiSettings');
    if (settings) {
      try {
        const parsed = JSON.parse(settings);
        if (parsed && parsed.apiKey) return parsed.apiKey;
      } catch (e) {}
    }
    return this.getSettingsStore()?.aiSettings.apiKey || '';
  }

  // 设置API密钥（通过settingsStore和localStorage）
  setApiKey(apiKey: string): void {
    console.log('设置API密钥:', apiKey ? apiKey.substring(0, 5) + '...' : '空');

    // 直接保存到localStorage
    try {
      const settings = localStorage.getItem('aiSettings');
      let aiSettings = settings ? JSON.parse(settings) : { enabled: true, model: 'deepseek' };
      aiSettings.apiKey = apiKey;
      localStorage.setItem('aiSettings', JSON.stringify(aiSettings));
      console.log('API密钥已保存到localStorage');
    } catch (e) {
      console.error('保存API密钥到localStorage失败:', e);
    }

    // 同时保存到settingsStore
    const store = this.getSettingsStore();
    if (store) {
      store.updateAISettings({
        apiKey: apiKey
      });
      console.log('API密钥已保存到settingsStore');
    } else {
      console.warn('settingsStore不可用，无法保存API密钥');
    }
  }

  // 获取AI模型
  getAiModel(): string {
    const settings = localStorage.getItem('aiSettings');
    if (settings) {
      try {
        const parsed = JSON.parse(settings);
        if (parsed && parsed.model) return parsed.model;
      } catch (e) {}
    }
    return this.getSettingsStore()?.aiSettings.model || 'deepseek-chat';
  }

  // 获取AI Base URL
  getAiBaseUrl(): string {
    const settings = localStorage.getItem('aiSettings');
    if (settings) {
      try {
        const parsed = JSON.parse(settings);
        if (parsed && parsed.baseUrl) return parsed.baseUrl;
      } catch (e) {}
    }
    return this.getSettingsStore()?.aiSettings.baseUrl || 'https://api.deepseek.com/v1';
  }

  // 获取聊天历史
  getChatHistory(): Ref<ChatMessage[]> {
    return this.chatHistory;
  }

  // 获取加载状态
  getLoadingState(): Ref<boolean> {
    return this.isLoading;
  }

  // 获取当前聊天模式
  getCurrentChatMode(): Ref<ChatMode> {
    return this.currentChatMode;
  }

  // 设置聊天模式
  setChatMode(mode: ChatMode): void {
    this.currentChatMode.value = mode;
    console.log('已切换到', mode, '模式');
  }

  // 发送消息到AI服务
  async sendMessage(message: string, image?: string): Promise<void> {
    const isMessageEmpty = !message || message.trim() === '';
    if ((isMessageEmpty && !image) || this.isLoading.value) return;

    console.log('开始处理发送消息:', message ? message.substring(0, 20) + '...' : '[图片]');
    console.log('当前聊天历史记录长度:', this.chatHistory.value.length);

    // 设置加载状态
    this.isLoading.value = true;

    try {
      // 添加用户消息到聊天历史
      this.chatHistory.value.push({
        role: 'user',
        content: message,
        timestamp: Date.now(),
        image: image || null
      });

      console.log('添加用户消息后聊天历史记录长度:', this.chatHistory.value.length);

      // 更新本地存储
      this.saveChatHistoryToStorage();

      // 调用DeepSeek API获取响应
      const response = await this.callDeepSeekAPI(message, image);
      console.log('收到API响应，内容长度:', response.content.length);

      // 添加AI响应到聊天历史
      this.chatHistory.value.push({
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
        taskData: response.taskData
      });

      console.log('添加AI响应后聊天历史记录长度:', this.chatHistory.value.length);
      console.log('聊天历史最新消息:', this.chatHistory.value[this.chatHistory.value.length - 1].content.substring(0, 50) + '...');

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

      console.log('添加错误消息后聊天历史记录长度:', this.chatHistory.value.length);
    } finally {
      // 确保在任何情况下都重置加载状态
      console.log('重置加载状态为false');
      this.isLoading.value = false;
    }
  }

  // // 上传图片并发送消息
  // async sendImageMessage(image: File, message: string = ''): Promise<void> {
  //   if (this.isLoading.value) return;

  //   try {
  //     // 读取图片文件并转换为base64
  //     const reader = new FileReader();

  //     reader.onload = async (e) => {
  //       const base64Image = e.target?.result as string;

  //       // 发送消息和图片
  //       await this.sendMessage(message, base64Image);
  //     };

  //     reader.readAsDataURL(image);
  //   } catch (error) {
  //     console.error('Error processing image:', error);

  //     // 显示错误消息
  //     this.chatHistory.value.push({
  //       role: 'assistant',
  //       content: '抱歉，处理图片时出现错误。请尝试使用其他图片或直接发送文字消息。',
  //       timestamp: Date.now()
  //     });

  //     // 更新本地存储
  //     this.saveChatHistoryToStorage();
  //   }
  // }

  // 调用DeepSeek API
  private async callDeepSeekAPI(userMessage: string, image?: string): Promise<DeepSeekResponse> {
    // 预处理消息历史
    const messageHistory = this.chatHistory.value.map(msg => ({
      role: msg.role,
      content: msg.content,
      image: msg.image
    }));

    // 添加系统指令，根据当前聊天模式调整
    let systemPrompt = '';

    switch (this.currentChatMode.value) {
      case 'task':
        systemPrompt = `你是一个顶级的时间管理专家和高效能教练，专门擅长运用番茄工作法（Pomodoro Technique）和深度工作（Deep Work）理论。
你的目标是帮助用户将模糊的任务描述转化为结构化、可执行的专注计划。

### 核心原则：
1. **科学分配**：对于需要高度认知的任务（如编程、写作），推荐 45-90 分钟的深度工作（deep_work）；对于常规任务，推荐 25 分钟番茄钟（pomodoro）。
2. **劳逸结合**：必须包含合理的休息时间。
3. **任务分解**：如果用户描述的任务过大，请尝试在建议中将其拆分为子任务。

### 响应规范：
- **分析建议**：先以专业、鼓励的口吻分析用户的任务，解释你为何这样安排。
- **结构化数据**：必须在最后提供一个符合以下 JSON 格式的代码块，用于系统自动创建任务。

### JSON 格式：
\`\`\`json
{
  "tasks": [
    {
      "name": "任务名称",
      "mode": "pomodoro | deep_work | short_break | long_break",
      "focusDuration": 专注分钟数,
      "breakDuration": 休息分钟数
    }
  ]
}
\`\`\`

### 模式参考：
- pomodoro: 25min 专注 + 5min 休息
- deep_work: 45-90min 专注 + 10-15min 休息
- short_break: 5-10min 休息
- long_break: 15-30min 休息`;
        break;

      case 'chat':
        systemPrompt = `你是一个充满智慧、贴心且高效的 AI 生活助理。你不仅能进行日常对话，还能在交流中潜移默化地引导用户建立更好的生活习惯。
你的语言风格应该是：
- 简洁明快：不啰嗦，直击重点。
- 积极正向：在回答问题时带给人动力。
- 专家视角：如果用户提到压力、拖延或疲劳，请适时推荐时间管理技巧，并引导他们切换到“任务规划模式”。`;
        break;

      case 'study':
        systemPrompt = `你是一个专业的学术导师和学习方法论专家。你精通费曼学习法、康奈尔笔记法和主动回忆等高效学习技术。
当用户提出学习问题时，请：
1. **深度解答**：不仅给出答案，更要解释背后的逻辑。
2. **方法推介**：根据问题类型，推荐合适的学习策略（如：这个概念你可以尝试用费曼学习法向我复述一遍）。
3. **视觉分析**：如果用户上传了图片（如习题、笔记），请进行细致的 OCR 识别和逻辑分析。
4. **专注建议**：提醒用户学习过程中的专注度比时长更重要，建议配合番茄钟进行。`;
        break;
    }

    try {
      // 获取API密钥
      const apiKey = this.getApiKey();
      if (!apiKey) {
        throw new Error('API密钥未设置，请在设置中配置您的API密钥');
      }

      // 准备请求数据
      const apiMessages: types.DeepSeekMessage[] = [
        {
          role: 'system',
          content: systemPrompt
        }
      ];

      // 添加历史消息
      for (const msg of messageHistory) {
        // 过滤掉可能的图片数据，只发送文本内容
        if (msg.role === 'user' || msg.role === 'assistant') {
          apiMessages.push({
            role: msg.role,
            content: msg.content
          });
        }
      }

      // 添加当前用户消息
      apiMessages.push({
        role: 'user',
        content: userMessage
      });

      // 创建API请求
      const request: any = {
        model: this.getAiModel(),
        messages: apiMessages,
        stream: false,
        ApiKey: apiKey,
        base_url: this.getAiBaseUrl()
      };

      console.log('发送API请求:', JSON.stringify({
        model: request.model,
        messages: request.messages.length,
        stream: request.stream,
        ApiKey: "******" // 在日志中隐藏实际密钥
      }, null, 2));

      // 确认一下API密钥是否存在
      console.log('API密钥状态: ', apiKey ? '已设置 (长度: '+apiKey.length+')' : '未设置');

      // 调用后端API
      try {
        const apiResponse = await this.callGoDeepSeekAPI(request);
        console.log('API响应成功:', apiResponse ? '有数据' : '无数据');

        if (!apiResponse || !apiResponse.choices || apiResponse.choices.length === 0) {
          throw new Error('API返回了空响应');
        }

        // 提取响应内容
        const responseContent = apiResponse.choices[0].message.content;
        console.log('响应内容长度:', responseContent.length);
        console.log('响应内容前100个字符:', responseContent.substring(0, 100) + '...');

        // 尝试从响应中提取任务数据
        let taskData: TaskPlan[] | null = null;
        let cleanedResponseContent = responseContent;

        try {
          // 使用正则表达式查找JSON代码块
          const jsonMatch = responseContent.match(/```json\s*([\s\S]*?)\s*```/);
          console.log('找到JSON代码块:', !!jsonMatch);

          if (jsonMatch && jsonMatch[1]) {
            const jsonStr = jsonMatch[1].trim();
            console.log('提取的JSON字符串:', jsonStr.substring(0, 100) + '...');

            const parsedData = JSON.parse(jsonStr);
            console.log('解析的JSON数据:', parsedData);

            if (parsedData && parsedData.tasks && Array.isArray(parsedData.tasks)) {
              taskData = parsedData.tasks.map((task: any) => ({
                name: task.name,
                mode: task.mode as 'pomodoro' | 'deep_work' | 'short_break' | 'long_break',
                focusDuration: task.focusDuration,
                breakDuration: task.breakDuration
              }));
              console.log('提取的任务数据:', taskData);

              // 从响应内容中删除JSON代码块，避免在UI中显示
              cleanedResponseContent = responseContent.replace(/```json\s*([\s\S]*?)\s*```/g, '');

              // 清理可能出现的连续多个空行
              cleanedResponseContent = cleanedResponseContent.replace(/\n\s*\n\s*\n/g, '\n\n');
              cleanedResponseContent = cleanedResponseContent.trim();

              console.log('清理后的响应内容长度:', cleanedResponseContent.length);
            } else {
              console.log('未找到有效的tasks数组');
            }
          } else {
            console.log('未找到JSON代码块');
          }
        } catch (jsonError) {
          console.error('解析任务数据失败:', jsonError);
        }

        return {
          content: cleanedResponseContent,
          taskData: taskData
        };
      } catch (error) {
        console.error('调用DeepSeek API失败:', error);

        // 发生错误时使用备用模拟响应
        return this.getFallbackResponse(this.currentChatMode.value, userMessage, image);
      }
    } catch (error) {
      console.error('调用DeepSeek API失败:', error);

      // 发生错误时使用备用模拟响应
      return this.getFallbackResponse(this.currentChatMode.value, userMessage, image);
    }
  }

  // 提供备用响应，用于API调用失败时
  private getFallbackResponse(mode: ChatMode, userMessage: string, image?: string): DeepSeekResponse {
    console.warn('API调用失败，使用备用响应');

    // 简化的错误响应提示
    let fallbackResponse: DeepSeekResponse = {
      content: `很抱歉，我无法连接到DeepSeek AI服务。请检查以下内容：

1. 确认您的DeepSeek API密钥是否正确设置
2. 检查网络连接是否正常
3. 稍后再试或刷新页面

如果问题持续存在，请联系管理员。`,
      taskData: null
    };

    // 如果包含图片，添加图片处理响应
    if (image) {
      fallbackResponse.content = `我已收到您上传的图片，但由于连接问题无法处理。\n\n${fallbackResponse.content}`;
    }

    return fallbackResponse;
  }

  // 应用任务计划
  async applyTaskPlan(taskPlan: TaskPlan[]): Promise<boolean> {
    try {
      // 创建任务
      for (const task of taskPlan) {
        console.log(`创建AI推荐的任务: ${task.name}, 模式: ${task.mode}`);

        // 调用待办事项创建功能
        if (window.go && window.go.main && window.go.main.App) {
          const todoRequest = {
            name: task.name,
            mode: task.mode,
            estimatedPomodoros: 1 // 默认值，可以根据任务的focusDuration计算更准确的值
          };

          await window.go.main.App.CreateTodo(todoRequest);
        }
      }

      return true;
    } catch (error) {
      console.error('Error applying task plan:', error);
      return false;
    }
  }

  // 清空聊天历史
  clearChatHistory(): void {
    this.chatHistory.value = [];

    // 更新本地存储
    this.saveChatHistoryToStorage();
  }

  // 保存聊天历史到本地存储
  private saveChatHistoryToStorage(): void {
    try {
      localStorage.setItem('ai_chat_history', JSON.stringify(this.chatHistory.value));
      localStorage.setItem('ai_chat_mode', this.currentChatMode.value);
    } catch (error) {
      console.error('Error saving chat history to storage:', error);
    }
  }

  // 从本地存储加载聊天历史
  private loadChatHistoryFromStorage(): void {
    try {
      const storedHistory = localStorage.getItem('ai_chat_history');
      const storedMode = localStorage.getItem('ai_chat_mode');

      if (storedHistory) {
        try {
          const parsedHistory = JSON.parse(storedHistory);
          if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
            this.chatHistory.value = parsedHistory;
            console.log('成功从localStorage加载聊天历史，条数:', parsedHistory.length);
          } else {
            console.warn('从localStorage加载的聊天历史无效或为空，使用默认欢迎消息');
            this.chatHistory.value = [];
          }
        } catch (parseError) {
          console.error('解析localStorage中的聊天历史失败:', parseError);
          this.chatHistory.value = [];
        }
      } else {
        console.log('localStorage中没有聊天历史，使用默认欢迎消息');
        this.chatHistory.value = [];
      }

      if (storedMode && (storedMode === 'task' || storedMode === 'chat' || storedMode === 'study')) {
        this.currentChatMode.value = storedMode as ChatMode;
      }
    } catch (error) {
      console.error('Error loading chat history from storage:', error);
      this.chatHistory.value = [];
    }
  }

  // 修改处理DeepSeek API调用的方法
  private async callGoDeepSeekAPI(request: any): Promise<any> {
    try {
      console.log('准备调用Go后端API', {
        model: request.model,
        messagesCount: request.messages.length,
        hasApiKey: !!request.ApiKey,
        baseUrl: request.base_url
      });

      // 创建DeepSeekAPIRequest对象
      const apiRequest = new types.DeepSeekAPIRequest();
      apiRequest.model = request.model;
      apiRequest.messages = request.messages;
      apiRequest.stream = request.stream || false;

      // 将ApiKey转换为api_key (后端类型使用api_key)
      apiRequest.api_key = request.ApiKey;
      apiRequest.base_url = request.base_url;

      console.log('发送给Go的最终对象:', apiRequest);

      // 调用Go后端函数
      const result = await GoCallDeepSeekAPI(apiRequest);
      console.log('Go后端返回结果:', result);
      return result;
    } catch (error) {
      console.error('发送DeepSeek API请求时出错:', error);
      throw error;
    }
  }
}

// 导出单例
const AIAssistantService = new AIAssistantServiceClass();
export default AIAssistantService;